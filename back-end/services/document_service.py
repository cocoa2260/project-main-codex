import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import UploadFile
from sqlalchemy.orm import Session

from ai.embeddings.embedding_factory import resolve_embedding_model
from core.config import settings
from models.document import Document, DocumentStatus
from models.audit_log import AuditAction, AuditTargetType
from models.document_page import DocumentPage
from models.task_tracker import TaskStage, TaskTracker, TaskStatus, TaskType
from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding
from models.user import User
from schemas.document import DocumentDeleteResponse
from services.audit_service import record_admin_action
from services.audit_service import record_document_reprocess_requested

from utils.text_chunk import split_text

STORAGE_DIR = "/storage/uploads"
MAX_UPLOAD_SIZE = 30 * 1024 * 1024
DOCUMENT_DOWNLOAD_CONTENT_TYPE_PDF = "application/pdf"
DOCUMENT_DELETE_MESSAGE = "문서가 삭제되었습니다."
DOCUMENT_DELETE_BLOCKED_STATUSES = {
    DocumentStatus.PENDING,
    DocumentStatus.PROCESSING,
}
DOCUMENT_REPROCESS_ALLOWED_STATUSES = {
    DocumentStatus.FAILED,
    DocumentStatus.COMPLETED,
    DocumentStatus.REVIEW_REQUIRED,
}
DOCUMENT_REPROCESS_RETRY_STAGE = "OCR"
DOCUMENT_CANCELLED_ERROR_MESSAGE = "사용자 요청으로 취소됨"
DOCUMENT_REPROCESS_REGISTERED_MESSAGE = "문서 재처리 작업을 등록했습니다."
DOCUMENT_CANCELLED_MESSAGE = "문서 처리를 취소했습니다."


async def save_upload_file(file: UploadFile) -> tuple[str, int]:
    """
    업로드된 PDF 파일을 Docker volume(/storage/uploads)에 저장한다.

    반환:
    - storage_path: 컨테이너 내부 저장 경로
    - file_size: 저장된 파일 크기(byte)
    """
    os.makedirs(STORAGE_DIR, exist_ok=True)

    original_name = file.filename or "uploaded.pdf"
    safe_file_name = original_name.replace("/", "_").replace("\\", "_")
    saved_file_name = f"{uuid.uuid4()}_{safe_file_name}"
    storage_path = str(Path(STORAGE_DIR) / saved_file_name)

    file_size = 0

    async with aiofiles.open(storage_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)

            if file_size > MAX_UPLOAD_SIZE:
                await out_file.close()
                os.remove(storage_path)
                raise ValueError("업로드 가능한 최대 파일 크기는 30MB입니다.")

            await out_file.write(chunk)

    return storage_path, file_size


async def create_document_from_upload(
    db: Session,
    user_id,
    file: UploadFile,
    embedding_model: str | None = None,
) -> tuple[Document, TaskTracker]:
    """
    PDF 업로드 후 Document row와 OCR TaskTracker row를 생성한다.

    변경된 파이프라인:
    - 업로드 시 사용자가 선택한 embedding_model을 documents.selected_embedding_model에 저장한다.
    - 실제 OCR은 Celery task에서 수행한다.
    - OCR 완료 후에는 곧바로 Summary/Embedding으로 가지 않고 REVIEW_REQUIRED 상태가 된다.
    """
    storage_path, file_size = await save_upload_file(file)
    selected_embedding_model = resolve_embedding_model(
        embedding_model or settings.EMBEDDING_MODEL
    )

    document = Document(
        user_id=user_id,
        file_name=file.filename,
        storage_path=storage_path,
        file_size=file_size,
        selected_embedding_model=selected_embedding_model,
        status=DocumentStatus.PENDING,
    )

    db.add(document)
    db.flush()

    task = TaskTracker(
        document_id=document.id,
        task_type=TaskType.OCR,
        status=TaskStatus.PENDING,
        progress=0,
        stage=TaskStage.OCR_PENDING,
        message="OCR 작업 대기 중입니다.",
    )

    db.add(task)
    db.commit()
    db.refresh(document)
    db.refresh(task)

    return document, task


def attach_celery_task_id(
    db: Session,
    task_id,
    celery_task_id: str,
) -> TaskTracker | None:
    task = db.query(TaskTracker).filter(TaskTracker.id == task_id).first()
    if task is None:
        return None

    task.celery_task_id = celery_task_id
    db.commit()
    db.refresh(task)

    return task


def get_document_for_user(
    db: Session,
    document_id,
    user_id,
) -> Document | None:
    return (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == user_id,
        )
        .first()
    )


class UserDocumentDownloadError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class UserDocumentActionError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class UserDocumentOriginalDownload:
    def __init__(
        self,
        path: Path,
        file_name: str,
        content_type: str,
    ):
        self.path = path
        self.file_name = file_name
        self.content_type = content_type


def _document_cleanup_paths(storage_path: str | None) -> list[Path]:
    if not storage_path:
        return []

    original_path = Path(storage_path)
    paths = [
        original_path,
        original_path.with_suffix(f"{original_path.suffix}.ocr.json"),
        original_path.with_suffix(".ocr.json"),
        original_path.with_suffix(".ocr.md"),
        original_path.with_suffix(".md"),
        original_path.with_name(f"{original_path.name}.ocr"),
        original_path.with_name(f"{original_path.stem}.ocr"),
    ]

    unique_paths: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        path_key = str(path)
        if path_key not in seen:
            seen.add(path_key)
            unique_paths.append(path)

    return unique_paths


def _delete_storage_path_if_exists(path: Path) -> None:
    try:
        if path.is_dir():
            shutil.rmtree(path)
            return

        path.unlink()
    except FileNotFoundError:
        return


def _document_artifact_cleanup_paths(storage_path: str | None) -> list[Path]:
    if not storage_path:
        return []

    original_path = Path(storage_path)
    candidates = [
        original_path.with_suffix(f"{original_path.suffix}.ocr.json"),
        original_path.with_suffix(".ocr.json"),
        original_path.with_suffix(".ocr.md"),
        original_path.with_suffix(".md"),
        original_path.with_name(f"{original_path.name}.ocr"),
        original_path.with_name(f"{original_path.stem}.ocr"),
    ]

    unique_paths: list[Path] = []
    seen: set[str] = set()
    for path in candidates:
        path_key = str(path)
        if path_key not in seen:
            seen.add(path_key)
            unique_paths.append(path)

    return unique_paths


def _clear_user_document_reprocess_artifacts(
    db: Session,
    document: Document,
) -> list[str]:
    cleared_artifacts = []

    document.ocr_markdown = None
    document.summary = None
    document.keywords = None
    document.process_at = None
    cleared_artifacts.extend(["ocr_markdown", "summary", "keywords"])

    db.query(DocumentEmbedding).filter(
        DocumentEmbedding.document_id == document.id,
    ).delete(synchronize_session=False)
    cleared_artifacts.append("embeddings")

    db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id,
    ).delete(synchronize_session=False)
    cleared_artifacts.append("chunks")

    db.query(DocumentPage).filter(
        DocumentPage.document_id == document.id,
    ).delete(synchronize_session=False)
    cleared_artifacts.append("pages")

    deleted_files = 0
    for path in _document_artifact_cleanup_paths(document.storage_path):
        if path.exists():
            deleted_files += 1
        _delete_storage_path_if_exists(path)

    if deleted_files:
        cleared_artifacts.append("artifact_files")

    return cleared_artifacts


def prepare_user_document_original_download(
    db: Session,
    document_id,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> UserDocumentOriginalDownload:
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=actor.id,
    )
    if document is None:
        raise UserDocumentDownloadError(
            status_code=404,
            detail="문서를 찾을 수 없습니다.",
        )

    if not document.storage_path:
        raise UserDocumentDownloadError(
            status_code=404,
            detail="원본 파일을 찾을 수 없습니다.",
        )

    storage_path = Path(document.storage_path)
    if not storage_path.exists() or not storage_path.is_file():
        raise UserDocumentDownloadError(
            status_code=404,
            detail="원본 파일을 찾을 수 없습니다.",
        )

    file_size = storage_path.stat().st_size
    record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_EXPORTED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document.id,
        old_value={
            "document_id": str(document.id),
            "file_name": document.file_name,
            "status": document.status,
            "owner_id": str(document.user_id),
        },
        new_value={
            "downloaded": True,
            "format": "original",
        },
        reason="User downloaded own document.",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "format": "original",
            "content_type": DOCUMENT_DOWNLOAD_CONTENT_TYPE_PDF,
            "file_size": file_size,
        },
    )
    db.commit()

    return UserDocumentOriginalDownload(
        path=storage_path,
        file_name=document.file_name,
        content_type=DOCUMENT_DOWNLOAD_CONTENT_TYPE_PDF,
    )


def delete_user_document(
    db: Session,
    document_id,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> DocumentDeleteResponse | None:
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=actor.id,
    )

    if document is None:
        return None

    if document.status in DOCUMENT_DELETE_BLOCKED_STATUSES:
        raise ValueError("처리 대기/진행 중인 문서는 삭제할 수 없습니다.")

    old_value = {
        "document_id": str(document.id),
        "file_name": document.file_name,
        "status": document.status,
        "owner_id": str(document.user_id),
    }
    cleanup_paths = _document_cleanup_paths(document.storage_path)
    response = DocumentDeleteResponse(
        document_id=document.id,
        file_name=document.file_name,
        deleted=True,
        message=DOCUMENT_DELETE_MESSAGE,
    )

    for path in cleanup_paths:
        _delete_storage_path_if_exists(path)

    record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_DELETED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document.id,
        old_value=old_value,
        new_value={"deleted": True},
        reason="User deleted own document.",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.delete(document)
    db.commit()

    return response


def request_user_document_reprocess(
    db: Session,
    document_id,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TaskTracker:
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=actor.id,
    )

    if document is None:
        raise UserDocumentActionError(404, "문서를 찾을 수 없습니다.")

    previous_status = document.status
    if previous_status not in DOCUMENT_REPROCESS_ALLOWED_STATUSES:
        raise UserDocumentActionError(409, "재처리할 수 없는 문서 상태입니다.")

    cleared_artifacts = _clear_user_document_reprocess_artifacts(
        db=db,
        document=document,
    )

    retry_task = TaskTracker(
        document_id=document.id,
        task_type=TaskType.OCR,
        status=TaskStatus.PENDING,
        progress=0,
        stage=TaskStage.OCR_PENDING,
        message="문서 OCR 재처리 작업 대기 중입니다.",
    )
    db.add(retry_task)
    db.flush()

    document.status = DocumentStatus.PROCESSING

    record_document_reprocess_requested(
        db=db,
        actor=actor,
        document_id=document.id,
        previous_status=previous_status,
        retry_task_id=retry_task.id,
        retry_from_stage=DOCUMENT_REPROCESS_RETRY_STAGE,
        status=document.status,
        cleared_artifacts=cleared_artifacts,
        reason="User requested document reprocess.",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "requested_by": "user",
            "retry_from": DOCUMENT_REPROCESS_RETRY_STAGE,
        },
    )
    db.commit()
    db.refresh(retry_task)

    return retry_task


def cancel_user_document_processing(
    db: Session,
    document_id,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TaskTracker | None:
    document = get_document_for_user(
        db=db,
        document_id=document_id,
        user_id=actor.id,
    )

    if document is None:
        raise UserDocumentActionError(404, "문서를 찾을 수 없습니다.")

    previous_status = document.status
    if previous_status != DocumentStatus.PROCESSING:
        raise UserDocumentActionError(409, "처리 중인 문서만 취소할 수 있습니다.")

    active_tasks = (
        db.query(TaskTracker)
        .filter(
            TaskTracker.document_id == document.id,
            TaskTracker.status.in_([TaskStatus.PENDING, TaskStatus.PROCESSING]),
        )
        .order_by(TaskTracker.created_at.desc())
        .all()
    )
    latest_task = active_tasks[0] if active_tasks else get_latest_document_task(db, document.id)

    for task in active_tasks:
        task.status = TaskStatus.FAILED
        task.stage = TaskStage.FAILED
        task.progress = task.progress or 0
        task.message = DOCUMENT_CANCELLED_ERROR_MESSAGE
        task.error_message = DOCUMENT_CANCELLED_ERROR_MESSAGE
        task.completed_at = datetime.utcnow()

    document.status = DocumentStatus.FAILED

    record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_CANCELLED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document.id,
        old_value={
            "document_id": str(document.id),
            "status": previous_status,
        },
        new_value={
            "status": document.status,
            "task_ids": [str(task.id) for task in active_tasks],
            "error_message": DOCUMENT_CANCELLED_ERROR_MESSAGE,
        },
        reason="User cancelled own document processing.",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "requested_by": "user",
            "logical_cancel": True,
        },
    )
    db.commit()
    db.refresh(document)
    if latest_task is not None:
        db.refresh(latest_task)

    return latest_task


def get_latest_document_task(
    db: Session,
    document_id,
) -> TaskTracker | None:
    return (
        db.query(TaskTracker)
        .filter(TaskTracker.document_id == document_id)
        .order_by(TaskTracker.created_at.desc())
        .first()
    )


def create_document_task(
    db: Session,
    document_id,
    task_type: str,
    stage: str,
    message: str,
) -> TaskTracker:
    task = TaskTracker(
        document_id=document_id,
        task_type=task_type,
        status=TaskStatus.PENDING,
        progress=0,
        stage=stage,
        message=message,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def trigger_embedding_pipeline(
    db: Session,
    document: Document,
) -> TaskTracker:
    from tasks.embedding_tasks import process_document_embedding

    task = create_document_task(
        db=db,
        document_id=document.id,
        task_type=TaskType.EMBEDDING,
        stage=TaskStage.EMBEDDING_PENDING,
        message="문서 임베딩 작업 대기 중입니다.",
    )

    try:
        async_result = process_document_embedding.delay(
            str(document.id),
            str(task.id),
            str(document.selected_embedding_model),
        )
    except Exception as error:
        task.status = TaskStatus.FAILED
        task.stage = TaskStage.FAILED
        task.message = "임베딩 작업 등록 중 오류가 발생했습니다."
        task.error_message = str(error)
        task.completed_at = datetime.utcnow()
        document.status = DocumentStatus.FAILED
        db.commit()
        raise

    return attach_celery_task_id(
        db=db,
        task_id=task.id,
        celery_task_id=async_result.id,
    ) or task


def build_status_message(
    document: Document,
    task: TaskTracker | None,
) -> str:
    if task and task.message:
        return task.message

    if document.status == DocumentStatus.REVIEW_REQUIRED:
        return "Markdown 변환이 완료되었습니다. 요약 진행 여부를 선택해주세요."

    if task is None:
        return "등록된 작업이 없습니다."

    if task.error_message:
        return task.error_message

    if task.status == TaskStatus.PENDING:
        return "작업 대기 중입니다."

    if task.status == TaskStatus.PROCESSING:
        return f"{task.task_type} processing... {task.progress}%"

    if task.status == TaskStatus.COMPLETED:
        return "문서 처리가 완료되었습니다."

    if task.status == TaskStatus.FAILED:
        return "문서 처리 중 오류가 발생했습니다."

    return document.status


def save_embeddings(
    db: Session,
    embeddings: list[DocumentEmbedding],
):
    db.add_all(embeddings)
    db.flush()
    db.commit()

    return embeddings

def get_chunks(
    db: Session,
    document_id,
):
    chunks = (db.query(DocumentChunk.content, DocumentChunk.id)
        .filter(DocumentChunk.document_id == document_id)
        .all())
    
    chunk_rows = []

    if not chunks:
        raise ValueError(
            f"No chunks found for document_id={document_id}"
        )
    
    for idx, (chunk_text, id)  in enumerate(chunks):
        chunk_rows.append(
            DocumentChunk(
                document_id=document_id,
                id=id,
                chunk_index=idx,
                content=chunk_text,
            )
        )

    return chunk_rows

def set_chunks(
    db: Session,
    document_id,
    text: str,

):
    chunks = split_text(
        text
    )

    chunk_rows = []

    for idx, chunk_text in enumerate(chunks):
        chunk_rows.append(
            DocumentChunk(
                document_id=document_id,
                chunk_index=idx,
                content=chunk_text,
            )
        )

    db.add_all(chunk_rows)
    db.flush()
    db.commit()
