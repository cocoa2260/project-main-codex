import asyncio
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from sqlalchemy.orm import Session

from ai.embeddings.embedding_factory import EMBEDDING_REGISTRY
from core.config import settings
from core.logging_config import get_logger
from db.database import SessionLocal
from db.session import get_db
from models.document import Document, DocumentStatus
from tasks.embedding_tasks import process_document_embedding
from models.task_tracker import TaskStage, TaskStatus, TaskType
from models.user import User
from routers.deps import get_current_user
from schemas.document import (
    DocumentActionResponse,
    DocumentMarkdownResponse,
    DocumentSummaryResponse,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DocumentResponse,
)
from services.document_service import (
    attach_celery_task_id,
    build_status_message,
    create_document_from_upload,
    create_document_task,
    get_document_for_user,
    get_latest_document_task,
    set_chunks,
)
from tasks.ocr_tasks import process_document_ocr
from tasks.summary_tasks import process_document_summary


router = APIRouter()
logger = get_logger(__name__)

@router.get("/embedding-models")
def get_embedding_models():
    """
    사용 가능한 임베딩 모델 목록 조회 API.

    Front에서 사용자가 선택할 수 있도록 임베딩 모델 목록을 제공한다.
    .env의 EMBEDDING_MODEL이 기본값으로 포함되어야 한다.
    """
    return {
        "default_model": settings.EMBEDDING_MODEL,
        "models": [
            {
                "value": model_name,
                "label": model_name,
            }
            for model_name in EMBEDDING_REGISTRY.keys()
        ],
    }
@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.upload_at.desc())
        .all()
    )

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    embedding_model: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    PDF 업로드 API.

    multipart/form-data:
    - file: PDF 파일
    - embedding_model: 사용자가 선택한 임베딩 모델명. 없으면 .env의 EMBEDDING_MODEL 사용.

    Front 기대 응답:
    {
      "document_id": "uuid",
      "task_id": "uuid",
      "status": "PENDING"
    }
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="PDF 파일만 업로드할 수 있습니다.",
        )

    try:
        document, task = await create_document_from_upload(
            db=db,
            user_id=current_user.id,
            file=file,
            embedding_model=embedding_model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    async_result = process_document_ocr.delay(
        str(document.id),
        str(task.id),
    )

    logger.info(f"Started OCR task for document {document.id} with task ID {task.id} and Celery task ID {async_result.id}")

    attach_celery_task_id(
        db=db,
        task_id=task.id,
        celery_task_id=async_result.id,
    )

    return DocumentUploadResponse(
        document_id=document.id,
        task_id=task.id,
        status=task.status,
        ocr_markdown=document.ocr_markdown,
        embedding_model=document.selected_embedding_model,
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="문서를 찾을 수 없습니다.",
        )

    task = get_latest_document_task(db, document_id)

    # OCR 완료 후 사용자 검수 대기 상태는 task가 COMPLETED여도 document.status가 우선이다.
    response_status = (
        document.status
        if document.status == DocumentStatus.REVIEW_REQUIRED
        else task.status if task else document.status
    )

    return DocumentStatusResponse(
        document_id=document.id,
        task_id=task.id if task else None,
        status=response_status,
        stage=task.stage if task else None,
        progress=task.progress if task else 0,
        message=task.message if task and task.message else build_status_message(document, task),
    )


@router.get("/{document_id}/markdown", response_model=DocumentMarkdownResponse)
def get_document_markdown(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    OCR 결과 Markdown 조회 API.

    DocumentReviewPage에서 호출한다.
    """
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return DocumentMarkdownResponse(
        document_id=document.id,
        status=document.status,
        markdown=document.ocr_markdown,
        embedding_model=document.selected_embedding_model,
    )


@router.get("/{document_id}/summary", response_model=DocumentSummaryResponse)
def get_document_summary(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    LLM 요약 결과 조회 API.

    DocumentSummaryPage에서 DB에 저장된 documents.summary를 표시한다.
    """
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return DocumentSummaryResponse(
        document_id=document.id,
        file_name=document.file_name,
        status=document.status,
        summary=document.summary,
        keywords=document.keywords or [],
        page_count=document.page_count,
        file_size=document.file_size,
        upload_at=document.upload_at,
        process_at=document.process_at,
        embedding_model=document.selected_embedding_model,
        llm_model=settings.DEFAULT_LLM_MODEL,
    )


@router.post("/{document_id}/confirm-summary", response_model=DocumentActionResponse)
def confirm_document_summary(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자가 Markdown 검수 후 요약/임베딩 진행을 승인하는 API.
    """
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    if not document.ocr_markdown:
        raise HTTPException(status_code=400, detail="OCR Markdown 결과가 없습니다.")

    if document.status != DocumentStatus.REVIEW_REQUIRED:
        raise HTTPException(
            status_code=400,
            detail="요약 진행을 승인할 수 있는 상태가 아닙니다.",
        )
    
    set_chunks(db, document_id, document.ocr_markdown)
    
    task = create_document_task(
        db=db,
        document_id=document.id,
        task_type=TaskType.SUMMARY,
        stage=TaskStage.SUMMARY_PENDING,
        message="요약/임베딩 작업 대기 중입니다.",
    )

    embedding_result = process_document_embedding.delay(
        str(document.id),
        str(task.id),
        str(document.selected_embedding_model),
    )

    attach_celery_task_id(
        db=db,
        task_id=task.id,
        celery_task_id=embedding_result.id,
    )

    async_result = process_document_summary.delay(
        str(document.id),
        str(task.id),
    )

    attach_celery_task_id(
        db=db,
        task_id=task.id,
        celery_task_id=async_result.id,
    )

    return DocumentActionResponse(
        document_id=document.id,
        task_id=task.id,
        status=task.status,
        message="요약/임베딩 작업을 시작했습니다.",
    )


@router.post("/{document_id}/cancel-summary", response_model=DocumentActionResponse)
def cancel_document_summary(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자가 Markdown 검수 후 요약 진행을 보류하는 API.

    취소는 삭제/실패가 아니다.
    OCR 결과는 유지하고 document.status는 REVIEW_REQUIRED로 둔다.
    사용자는 나중에 confirm-summary를 다시 호출할 수 있다.
    """
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    document.status = DocumentStatus.REVIEW_REQUIRED

    task = get_latest_document_task(db, document.id)
    if task:
        task.stage = TaskStage.MARKDOWN_REVIEW
        task.message = "사용자가 요약 진행을 보류했습니다."

    db.commit()

    return DocumentActionResponse(
        document_id=document.id,
        task_id=task.id if task else None,
        status=document.status,
        message="요약 진행이 보류되었습니다. OCR Markdown 결과는 저장되어 있습니다.",
    )


@router.websocket("/{document_id}/ws")
async def document_status_websocket(
    websocket: WebSocket,
    document_id: UUID,
):
    """
    문서 상태 WebSocket.

    MVP 구현 방식:
    - Celery worker와 직접 WebSocket 연결을 공유하지 않는다.
    - WebSocket endpoint가 DB의 TaskTracker 상태를 주기적으로 읽어 Front에 전달한다.
    - 따라서 worker가 별도 컨테이너여도 정상 동작한다.
    """
    await websocket.accept()

    db = SessionLocal()  # WebSocket 핸들러에서 직접 DB 세션을 생성한다. get_db() 의존성 주입은 사용할 수 없다.ㅋ

    try:
        while True:
            db.expire_all()
            document = db.query(Document).filter(Document.id == document_id).first()

            if document is None:
                await websocket.send_json(
                    {
                        "document_id": str(document_id),
                        "stage": None,
                        "progress": 0,
                        "status": "FAILED",
                        "message": "문서를 찾을 수 없습니다.",
                    }
                )
                await websocket.close()
                return

            task = get_latest_document_task(db, document_id)
            response_status = (
                document.status
                if document.status == DocumentStatus.REVIEW_REQUIRED
                else task.status if task else document.status
            )

            payload = {
                "document_id": str(document.id),
                "task_id": str(task.id) if task else None,
                "stage": task.stage if task else None,
                "progress": task.progress if task else 0,
                "status": response_status.value if hasattr(response_status, "value") else str(response_status),
                "message": task.message if task and task.message else build_status_message(document, task),
            }

            await websocket.send_json(payload)

            if (
                document.status == DocumentStatus.REVIEW_REQUIRED
                or (task and task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED])
            ):
                await websocket.close()
                return

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        return

    except Exception as exc:
        try:
            await websocket.close()
        except Exception:
            pass
        print(f"[document_status_websocket] error document_id={document_id}, error={exc}")
        return

    finally:
        db.close()
