import asyncio
from datetime import date
from uuid import UUID
from unicodedata import normalize

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from fastapi import UploadFile
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi.responses import FileResponse

from sqlalchemy import String
from sqlalchemy import cast
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from ai.embeddings.embedding_factory import EMBEDDING_REGISTRY
from ai.embeddings.embedding_factory import resolve_embedding_model
from core.config import settings
from core.logging_config import get_logger
from db.database import SessionLocal
from db.session import get_db
from models.category import Category
from models.document import Document, DocumentStatus
from models.document_category import DocumentCategory
from models.task_tracker import TaskStage, TaskStatus, TaskType
from models.user import User
from routers.deps import get_current_user
from schemas.document import (
    DocumentActionResponse,
    DocumentChatCitation,
    DocumentChatRequest,
    DocumentChatResponse,
    DocumentChatSessionCreateRequest,
    DocumentChatSessionDetailResponse,
    DocumentChatSessionListItem,
    DocumentDeleteResponse,
    DocumentMarkdownResponse,
    DocumentMarkdownUpdateRequest,
    DocumentChatMessageResponse,
    DocumentSummaryResponse,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DocumentResponse,
)
from services.chat_service import (
    DocumentChatContextError,
    DocumentChatEmptyMessageError,
    DocumentChatGenerationError,
    DocumentChatInvalidStateError,
    DocumentChatNotFoundError,
    answer_document_question,
    create_chat_session,
    delete_chat_session,
    get_chat_session,
    list_chat_messages,
    list_chat_sessions,
    serialize_chat_message,
)
from services.category_service import get_document_category_payload
from services.document_service import (
    attach_celery_task_id,
    build_status_message,
    cancel_user_document_processing,
    create_document_from_upload,
    create_document_task,
    delete_user_document,
    get_document_for_user,
    get_latest_document_task,
    get_latest_document_tasks,
    prepare_user_document_original_download,
    request_user_document_reprocess,
    set_chunks,
    DOCUMENT_CANCELLED_MESSAGE,
    DOCUMENT_REPROCESS_REGISTERED_MESSAGE,
    UserDocumentDownloadError,
    UserDocumentActionError,
)
from tasks.ocr_tasks import process_document_ocr
from tasks.summary_tasks import process_document_summary


router = APIRouter()
logger = get_logger(__name__)


def _handle_chat_error(error: DocumentChatContextError | DocumentChatEmptyMessageError | DocumentChatGenerationError | DocumentChatInvalidStateError | DocumentChatNotFoundError):
    if isinstance(error, DocumentChatEmptyMessageError):
        raise HTTPException(status_code=400, detail=str(error))
    if isinstance(error, DocumentChatNotFoundError):
        raise HTTPException(status_code=404, detail=str(error))
    if isinstance(error, DocumentChatInvalidStateError):
        raise HTTPException(status_code=409, detail=str(error))
    if isinstance(error, DocumentChatContextError):
        raise HTTPException(status_code=400, detail=str(error))
    if isinstance(error, DocumentChatGenerationError):
        raise HTTPException(status_code=502, detail=str(error))

    raise HTTPException(status_code=500, detail="채팅 요청을 처리하지 못했습니다.")


def _chat_response_from_result(result) -> DocumentChatResponse:
    return DocumentChatResponse(
        answer=result.answer,
        citations=[
            DocumentChatCitation(
                source=citation.source,
                label=citation.label,
                chunk_id=citation.chunk_id,
                page_no=citation.page_no,
            )
            for citation in result.citations
        ],
        session_id=result.session_id,
        message_id=result.message_id,
    )


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip() or None

    return request.client.host if request.client else None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")

@router.get("/embedding-models")
def get_embedding_models():
    """
    사용 가능한 임베딩 모델 목록 조회 API.

    Front에서 사용자가 선택할 수 있도록 임베딩 모델 목록을 제공한다.
    .env의 EMBEDDING_MODEL이 기본값으로 포함되어야 한다.
    """
    return {
        "default_model": resolve_embedding_model(settings.EMBEDDING_MODEL),
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
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    category: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    embedding_model: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if status and status not in {
        DocumentStatus.PENDING,
        DocumentStatus.PROCESSING,
        DocumentStatus.REVIEW_REQUIRED,
        DocumentStatus.COMPLETED,
        DocumentStatus.FAILED,
    }:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 상태입니다.")
    
    query = (
        db.query(Document)
        .outerjoin(DocumentCategory, DocumentCategory.document_id == Document.id)
        .outerjoin(Category, Category.id == DocumentCategory.category_id)
        .options(joinedload(Document.document_categories).joinedload(DocumentCategory.category))
        .filter(Document.user_id == current_user.id)
    )

    if status:
        query = query.filter(Document.status == status)

    if category_id:
        query = query.filter(DocumentCategory.category_id == category_id)

    if category:
        category_name = category.strip()
        if category_name:
            query = query.filter(
                or_(
                    Category.name == category_name,
                    Document.category == category_name,
                )
            )

    if date_from:
        query = query.filter(func.date(Document.upload_at) >= date_from)

    if date_to:
        query = query.filter(func.date(Document.upload_at) <= date_to)

    if embedding_model:
        embedding_model_text = embedding_model.strip()
        if embedding_model_text:
            query = query.filter(Document.selected_embedding_model == embedding_model_text)

    if search:
        search_text = normalize("NFC", search.strip())
        if search_text:
            keyword = f"%{search_text}%"
            logger.info(f"keyword : {keyword}")
            query = query.filter(
                or_(
                    Document.file_name.ilike(keyword),
                    func.array_to_string(Document.keywords, " ").ilike(keyword),
                    Document.summary.ilike(keyword),
                )
            )
    # 실행 쿼리 확인을 위한 소스
    compiled = query.statement.compile(
    dialect=db.bind.dialect,
    compile_kwargs={"literal_binds": True},
    )
    logger.info(f"compiled : {compiled}")

    documents = query.order_by(Document.upload_at.desc()).all()
    latest_tasks = get_latest_document_tasks(
        db=db,
        document_ids=[document.id for document in documents],
    )

    return [
        DocumentResponse.model_validate(document).model_copy(
            update={
                "stage": latest_tasks[document.id].stage if document.id in latest_tasks else None,
                "progress": latest_tasks[document.id].progress if document.id in latest_tasks else None,
                "task_message": latest_tasks[document.id].message if document.id in latest_tasks else None,
            }
        )
        for document in documents
    ]


@router.get(
    "/{document_id}/download",
    response_class=FileResponse,
)
def download_document_original(
    document_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        download_file = prepare_user_document_original_download(
            db=db,
            document_id=document_id,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except UserDocumentDownloadError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)

    return FileResponse(
        path=download_file.path,
        media_type=download_file.content_type,
        filename=download_file.file_name,
    )


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
)
def delete_document(
    document_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = delete_user_document(
            db=db,
            document_id=document_id,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))

    if result is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return result


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentActionResponse,
)
def reprocess_document(
    document_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        task = request_user_document_reprocess(
            db=db,
            document_id=document_id,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except UserDocumentActionError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)

    async_result = process_document_ocr.delay(
        str(document_id),
        str(task.id),
    )
    attach_celery_task_id(
        db=db,
        task_id=task.id,
        celery_task_id=async_result.id,
    )

    return DocumentActionResponse(
        document_id=document_id,
        task_id=task.id,
        status=DocumentStatus.PROCESSING,
        message=DOCUMENT_REPROCESS_REGISTERED_MESSAGE,
    )


@router.post(
    "/{document_id}/cancel",
    response_model=DocumentActionResponse,
)
def cancel_document_processing(
    document_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        task = cancel_user_document_processing(
            db=db,
            document_id=document_id,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except UserDocumentActionError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)

    return DocumentActionResponse(
        document_id=document_id,
        task_id=task.id if task else None,
        status=DocumentStatus.FAILED,
        message=DOCUMENT_CANCELLED_MESSAGE,
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
    if document is not None:
        document = (
            db.query(Document)
            .options(joinedload(Document.document_categories))
            .filter(Document.id == document.id)
            .first()
        )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return DocumentMarkdownResponse(
        document_id=document.id,
        status=document.status,
        markdown=document.ocr_markdown,
        embedding_model=document.selected_embedding_model,
    )


@router.patch("/{document_id}/markdown", response_model=DocumentMarkdownResponse)
def update_document_markdown(
    document_id: UUID,
    payload: DocumentMarkdownUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    OCR 결과 Markdown 수정 API.

    Review 화면에서 사용자가 요약 진행 전에 OCR Markdown을 보정할 때 호출한다.
    """
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=current_user.id,
    )

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    if document.status != DocumentStatus.REVIEW_REQUIRED:
        raise HTTPException(
            status_code=400,
            detail="검토 대기 상태에서만 OCR Markdown을 수정할 수 있습니다.",
        )

    if not payload.markdown.strip():
        raise HTTPException(status_code=400, detail="Markdown은 빈 문자열일 수 없습니다.")

    document.ocr_markdown = payload.markdown
    db.commit()
    db.refresh(document)

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
        category=get_document_category_payload(document),
    )


@router.get(
    "/{document_id}/chat/sessions",
    response_model=list[DocumentChatSessionListItem],
)
def get_document_chat_sessions(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        sessions = list_chat_sessions(
            db=db,
            document_id=document_id,
            user_id=current_user.id,
        )
    except (
        DocumentChatNotFoundError,
        DocumentChatInvalidStateError,
    ) as exc:
        _handle_chat_error(exc)

    return [
        DocumentChatSessionListItem(
            id=session.id,
            title=session.title or "새 채팅",
            message_count=message_count,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
        for session, message_count in sessions
    ]


@router.post(
    "/{document_id}/chat/sessions",
    response_model=DocumentChatSessionDetailResponse,
)
def create_document_chat_session(
    document_id: UUID,
    payload: DocumentChatSessionCreateRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = create_chat_session(
            db=db,
            document_id=document_id,
            user_id=current_user.id,
            title=payload.title if payload else None,
        )
    except (
        DocumentChatNotFoundError,
        DocumentChatInvalidStateError,
    ) as exc:
        _handle_chat_error(exc)

    return DocumentChatSessionDetailResponse(
        id=session.id,
        title=session.title or "새 채팅",
        message_count=0,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[],
    )


@router.get(
    "/{document_id}/chat/sessions/{session_id}",
    response_model=DocumentChatSessionDetailResponse,
)
def get_document_chat_session(
    document_id: UUID,
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = get_chat_session(
            db=db,
            document_id=document_id,
            session_id=session_id,
            user_id=current_user.id,
        )
        messages = list_chat_messages(db, session.id)
    except (
        DocumentChatNotFoundError,
        DocumentChatInvalidStateError,
    ) as exc:
        _handle_chat_error(exc)

    return DocumentChatSessionDetailResponse(
        id=session.id,
        title=session.title or "새 채팅",
        message_count=len(messages),
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[
            DocumentChatMessageResponse(**serialize_chat_message(message))
            for message in messages
        ],
    )


@router.delete("/{document_id}/chat/sessions/{session_id}", status_code=204)
def delete_document_chat_session(
    document_id: UUID,
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delete_chat_session(
            db=db,
            document_id=document_id,
            session_id=session_id,
            user_id=current_user.id,
        )
    except (
        DocumentChatNotFoundError,
        DocumentChatInvalidStateError,
    ) as exc:
        _handle_chat_error(exc)

    return None


@router.post(
    "/{document_id}/chat/sessions/{session_id}/messages",
    response_model=DocumentChatResponse,
)
def send_document_chat_session_message(
    document_id: UUID,
    session_id: UUID,
    payload: DocumentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = answer_document_question(
            db=db,
            document_id=document_id,
            user_id=current_user.id,
            message=payload.message,
            session_id=session_id,
        )
    except (
        DocumentChatEmptyMessageError,
        DocumentChatNotFoundError,
        DocumentChatInvalidStateError,
        DocumentChatContextError,
        DocumentChatGenerationError,
    ) as exc:
        _handle_chat_error(exc)

    return _chat_response_from_result(result)


@router.post("/{document_id}/chat", response_model=DocumentChatResponse)
def chat_with_document(
    document_id: UUID,
    payload: DocumentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = answer_document_question(
            db=db,
            document_id=document_id,
            user_id=current_user.id,
            message=payload.message,
        )
    except DocumentChatEmptyMessageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except DocumentChatNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except DocumentChatInvalidStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except DocumentChatContextError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except DocumentChatGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return _chat_response_from_result(result)


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
    
    document.status = DocumentStatus.PROCESSING
    set_chunks(db, document_id, document.ocr_markdown)
    
    task = create_document_task(
        db=db,
        document_id=document.id,
        task_type=TaskType.SUMMARY,
        stage=TaskStage.SUMMARY_PENDING,
        message="요약 작업 대기 중입니다.",
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
        message="요약 작업을 시작했습니다.",
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
