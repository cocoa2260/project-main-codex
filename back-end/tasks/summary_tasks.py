from datetime import datetime
from uuid import UUID

from ai.llms.llm_factory import get_llm_provider
from app.celery_app import celery_app
from core.config import settings
from db.database import SessionLocal
from models.document import Document, DocumentStatus
from models.document_chunk import DocumentChunk
from models.task_tracker import TaskStage, TaskStatus, TaskTracker
from services.document_service import trigger_embedding_pipeline
from tasks.ocr_tasks import update_task_progress
from utils.text_chunk import split_text


def build_document_chunks(markdown: str) -> list[str]:
    chunks = [
        chunk_text
        for chunk_text in split_text(markdown or "")
        if chunk_text.strip()
    ]

    if not chunks:
        raise ValueError("No chunks were created from OCR Markdown.")

    return chunks


def summarize_chunks(
    db,
    document: Document,
    llm_provider,
    chunks: list[str],
    task: TaskTracker,
) -> tuple[list[str], int]:
    chunk_summaries: list[str] = []
    document_keywords: list[str] = []
    keyword_count = 0
    total_chunks = len(chunks)

    for index, chunk in enumerate(chunks, start=1):
        progress = 30 + int((index / total_chunks) * 45)
        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=progress,
            stage=TaskStage.SUMMARY_PROCESSING,
            message=f"chunk {index}/{total_chunks}의 요약과 핵심 키워드를 생성하는 중입니다.",
        )

        keywords = llm_provider.extract_keywords(chunk)
        representative_keyword = llm_provider.extract_representative_keyword(chunk)
        chunk_summary = llm_provider.summarize_chunk(chunk)

        # summary 단계에서 LLM으로 추출한 키워드를 chunk row에 저장한다.
        # embedding 단계가 먼저 만든 chunk가 있으면 keywords만 채우고, 없으면 fallback으로 생성한다.
        chunk_index = index - 1
        chunk_row = (
            db.query(DocumentChunk)
            .filter(
                DocumentChunk.document_id == document.id,
                DocumentChunk.chunk_index == chunk_index,
            )
            .first()
        )

        if chunk_row is None:
            chunk_row = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk_index,
                content=chunk,
            )
            db.add(chunk_row)

        chunk_row.keywords = keywords

        # 프론트 표시용 대표 키워드는 chunk마다 1개씩 뽑아 documents.keywords에 모아 저장한다.
        if representative_keyword and representative_keyword not in document_keywords:
            document_keywords.append(representative_keyword)

        keyword_text = ", ".join(keywords) if keywords else "없음"
        chunk_summaries.append(
            f"chunk {index} 키워드: {keyword_text}\nchunk {index} 요약: {chunk_summary}"
        )
        keyword_count += len(keywords)

    document.keywords = document_keywords

    return chunk_summaries, keyword_count


@celery_app.task(name="tasks.summary_tasks.process_document_summary")
def process_document_summary(document_id: str, task_id: str):
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

        if not document.ocr_markdown:
            raise ValueError("OCR Markdown result is empty.")

        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.utcnow()

        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=20,
            stage=TaskStage.CHUNKING_PROCESSING,
            message="Markdown 문서를 chunk 단위로 분할하는 중입니다.",
        )

        chunks = build_document_chunks(document.ocr_markdown)
        llm_provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)

        chunk_summaries, keyword_count = summarize_chunks(
            db=db,
            document=document,
            llm_provider=llm_provider,
            chunks=chunks,
            task=task,
        )

        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=85,
            stage=TaskStage.SUMMARY_PROCESSING,
            message="chunk별 요약을 바탕으로 문서 전체 요약을 생성하는 중입니다.",
        )

        document.summary = llm_provider.summarize_from_chunk_summaries(chunk_summaries)
        document.status = DocumentStatus.PROCESSING
        document.process_at = datetime.utcnow()

        task.progress = 100
        task.status = TaskStatus.COMPLETED
        task.stage = TaskStage.SUMMARY_COMPLETED
        task.message = "chunk별 요약/키워드 처리가 완료되었습니다."
        task.completed_at = datetime.utcnow()

        db.commit()

        try:
            embedding_task = trigger_embedding_pipeline(
                db=db,
                document=document,
            )
            embedding_task_id = str(embedding_task.id)
            embedding_status = "PENDING"
        except Exception as embedding_error:
            db.rollback()
            document = db.query(Document).filter(Document.id == document_uuid).first()
            if document:
                document.status = DocumentStatus.FAILED
                db.commit()
            embedding_task_id = None
            embedding_status = "FAILED"
            embedding_error_message = str(embedding_error)
        else:
            embedding_error_message = None

        return {
            "document_id": document_id,
            "task_id": task_id,
            "embedding_task_id": embedding_task_id,
            "embedding_status": embedding_status,
            "embedding_error": embedding_error_message,
            "status": "COMPLETED",
            "chunk_count": len(chunks),
            "keyword_count": keyword_count,
        }

    except Exception as exc:
        db.rollback()

        try:
            task = db.query(TaskTracker).filter(TaskTracker.id == UUID(task_id)).first()
            document = db.query(Document).filter(Document.id == UUID(document_id)).first()

            if task:
                task.status = TaskStatus.FAILED
                task.stage = TaskStage.FAILED
                task.message = "요약/키워드 처리 중 오류가 발생했습니다."
                task.error_message = str(exc)
                task.completed_at = datetime.utcnow()

            if document:
                document.status = DocumentStatus.FAILED

            db.commit()
        except Exception:
            db.rollback()

        raise

    finally:
        db.close()
