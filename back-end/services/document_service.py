import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile
from sqlalchemy.orm import Session

from core.config import settings
from models.document import Document, DocumentStatus
from models.task_tracker import TaskTracker, TaskStatus, TaskType
from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding

from utils.calc_cos import calc_cos_score

STORAGE_DIR = "/storage/uploads"
MAX_UPLOAD_SIZE = 30 * 1024 * 1024


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
    selected_embedding_model = embedding_model or settings.EMBEDDING_MODEL

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
        stage="PENDING",
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


# def get_document_retriver_data(
#     db: Session,
#     document_id: str,
#     embedding_model: str,
#     embedding: list,
#     top_k: int = 10,
# ):
#     contents = []
#     # 문서id, 임베딩 모델과 관련된 데이터 추출
#     rows = (
#         db.query(
#             DocumentEmbedding.chunk_id,
#             DocumentEmbedding.embedding
#         )
#         .filter(
#             DocumentEmbedding.document_id == document_id,
#             DocumentEmbedding.embedding_model == embedding_model,
#         )
#         .all()
#     )

#     if not rows:
#         return []

#     # cosine 유사도 계산으로 줄세우기
#     scored = calc_cos_score(rows, embedding)

#     scored.sort(key=lambda x: x[0], reverse=True)

#     top_chunk_ids = [
#         chunk_id for _, chunk_id in scored[:top_k]
#     ]

#     # DB에서 재검색
#     chunks = (
#         db.query(DocumentChunk)
#         .filter(DocumentChunk.id.in_(top_chunk_ids))
#         .all()
#     )

#     # 순서 보장 (IN은 순서 보장 안됨)
#     chunk_map = {c.id: c for c in chunks}

#     ordered_chunks = [ chunk_map[cid] for cid in top_chunk_ids if cid in chunk_map ]

#     for o in ordered_chunks :
#         contents.append(o.content)

#     return contents
    