from datetime import datetime
from time import sleep
from uuid import UUID

from app.celery_app import celery_app
from ai.llms.llm_factory import get_llm_provider
from core.config import settings
from db.database import SessionLocal
from models.document import Document, DocumentStatus
from models.task_tracker import TaskTracker, TaskStatus
from tasks.ocr_tasks import update_task_progress


@celery_app.task(name="tasks.summary_tasks.process_document_summary")
def process_document_summary(document_id: str, task_id: str):
    """
    Markdown 검수 승인 이후 실행되는 Summary/Chunking/Embedding/RAG 파이프라인 껍데기.

    구현 코드 연결 예정 위치:
    1. documents.ocr_markdown 읽기
    2. Markdown 기반 chunking
    3. 선택된 embedding_model로 embedding 생성
    4. document_chunks / document_embeddings 저장
    5. LLM 요약 생성 후 documents.summary 저장
    """
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
            raise ValueError("OCR Markdown 결과가 없어 요약을 진행할 수 없습니다.")

        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.utcnow()
        db.commit()

        steps = [
            (20, "CHUNKING", "Markdown 문서를 chunk 단위로 분할하는 중입니다."),
            (50, "EMBEDDING", f"{document.selected_embedding_model} 모델로 임베딩을 생성하는 중입니다."),
            (80, "SUMMARY", "AI 요약을 생성하는 중입니다."),
        ]

        for progress, stage, message in steps:
            sleep(1)
            update_task_progress(
                db=db,
                task=task,
                status=TaskStatus.PROCESSING,
                progress=progress,
                stage=stage,
                message=message,
            )

        # env의 기본 LLM 모델(qwen3:4b)을 factory에 넘겨 provider를 가져온다.
        llm_provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)

        # OCR Markdown을 LLM에 넣어 요약하고, 결과를 documents.summary에 저장한다.
        document.summary = llm_provider.summarize(document.ocr_markdown)
        document.status = DocumentStatus.COMPLETED
        document.process_at = datetime.utcnow()

        task.progress = 100
        task.status = TaskStatus.COMPLETED
        task.stage = "COMPLETED"
        task.message = "요약/임베딩 처리가 완료되었습니다."
        task.completed_at = datetime.utcnow()

        db.commit()

        return {
            "document_id": document_id,
            "task_id": task_id,
            "status": "COMPLETED",
        }

    except Exception as exc:
        db.rollback()

        try:
            task = db.query(TaskTracker).filter(TaskTracker.id == UUID(task_id)).first()
            document = db.query(Document).filter(Document.id == UUID(document_id)).first()

            if task:
                task.status = TaskStatus.FAILED
                task.stage = "FAILED"
                task.message = "요약/임베딩 처리 중 오류가 발생했습니다."
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
