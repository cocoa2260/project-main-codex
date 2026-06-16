from datetime import datetime
from uuid import UUID

from ai.embeddings.embedding_factory import EMBEDDING_REGISTRY
from ai.embeddings.embedding_factory import get_embedding_provider
from app.celery_app import celery_app
from db.database import SessionLocal
from models.document import Document
from models.document import DocumentStatus
from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding
from models.task_tracker import TaskStage
from models.task_tracker import TaskStatus
from models.task_tracker import TaskTracker
from models.task_tracker import TaskType
from services.document_service import save_embeddings


def update_embedding_progress(
    db,
    task: TaskTracker,
    progress: int,
    stage: str,
    message: str,
) -> None:
    task.status = TaskStatus.PROCESSING
    task.progress = progress
    task.stage = stage
    task.message = message
    db.commit()


def chunk_embedding(
    document: Document,
    embedding_model: str,
    chunk_rows: list[DocumentChunk],
) -> list[DocumentEmbedding]:
    provider = get_embedding_provider(embedding_model)
    embeddings = []

    for chunk in chunk_rows:
        vector = provider.embed(chunk.content)
        embeddings.append(
            DocumentEmbedding(
                document_id=document.id,
                chunk_id=chunk.id,
                embedding_model=embedding_model,
                embedding_dimension=len(vector),
                embedding=vector,
            )
        )

    return embeddings


@celery_app.task(name="tasks.embedding_tasks.process_document_embedding")
def process_document_embedding(
    document_id: str,
    task_id: str,
    embedding_model: str = "snowflake-ko-lora",
):
    db = SessionLocal()

    try:
        document_uuid = UUID(document_id)
        task_uuid = UUID(task_id)

        document = db.query(Document).filter(Document.id == document_uuid).first()
        task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        if document is None or task is None:
            return {
                "document_id": document_id,
                "task_id": task_id,
                "status": "FAILED",
                "error": "document or task not found",
            }

        if task.task_type != TaskType.EMBEDDING:
            raise ValueError("Embedding task requires an EMBEDDING TaskTracker.")

        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.now()
        update_embedding_progress(
            db=db,
            task=task,
            progress=10,
            stage=TaskStage.EMBEDDING_PROCESSING,
            message="요약 단계에서 생성된 chunk를 조회하는 중입니다.",
        )

        chunk_rows = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )

        if not chunk_rows:
            raise ValueError("Document chunks are required before embedding.")

        if embedding_model not in EMBEDDING_REGISTRY:
            embedding_model = next(iter(EMBEDDING_REGISTRY))

        update_embedding_progress(
            db=db,
            task=task,
            progress=40,
            stage=TaskStage.EMBEDDING_PROCESSING,
            message=f"{embedding_model} 모델로 임베딩을 생성하는 중입니다.",
        )

        embeddings = chunk_embedding(
            document=document,
            embedding_model=embedding_model,
            chunk_rows=chunk_rows,
        )

        update_embedding_progress(
            db=db,
            task=task,
            progress=70,
            stage=TaskStage.EMBEDDING_PROCESSING,
            message="임베딩 결과를 저장하는 중입니다.",
        )

        db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == document.id,
            DocumentEmbedding.embedding_model == embedding_model,
        ).delete(synchronize_session=False)
        save_embeddings(db, embeddings)

        task.progress = 100
        task.status = TaskStatus.COMPLETED
        task.stage = TaskStage.EMBEDDING_COMPLETED
        task.message = "EMBEDDING 처리가 완료되었습니다."
        task.completed_at = datetime.now()

        document.status = DocumentStatus.COMPLETED
        document.process_at = datetime.now()

        db.commit()

        return {
            "document_id": document_id,
            "task_id": task_id,
            "embedding_model": embedding_model,
            "status": "COMPLETED",
        }

    except Exception as exc:
        db.rollback()

        try:
            task = db.query(TaskTracker).filter(TaskTracker.id == UUID(task_id)).first()
            document = db.query(Document).filter(Document.id == UUID(document_id)).first()

            if task:
                task.status = TaskStatus.FAILED
                task.stage = TaskStage.FAILED
                task.message = "임베딩 처리 중 오류가 발생했습니다."
                task.error_message = str(exc)
                task.completed_at = datetime.now()

            if document:
                document.status = DocumentStatus.FAILED

            db.commit()
        except Exception:
            db.rollback()

        raise

    finally:
        db.close()
