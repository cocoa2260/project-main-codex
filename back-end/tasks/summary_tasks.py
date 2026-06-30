from datetime import datetime
import re
from uuid import UUID

from ai.llms.llm_factory import get_llm_provider
from app.celery_app import celery_app
from core.config import settings
from db.database import SessionLocal
from models.document import Document, DocumentStatus
from models.document_chunk import DocumentChunk
from models.task_tracker import TaskStage, TaskStatus, TaskTracker
from services.category_service import CategoryClassification
from services.category_service import save_document_category
from services.document_service import trigger_embedding_pipeline
from services.prompt_defaults import CATEGORY_PROMPT_KEY
from services.prompt_defaults import SUMMARY_PROMPT_KEY
from services.prompt_service import get_active_prompt_content
from tasks.ocr_tasks import update_task_progress
from utils.text_chunk import split_text


EMBEDDING_CHUNK_SIZE = 1000
SUMMARY_CHUNK_SIZE = 3000
DOCUMENT_KEYWORD_LIMIT = 10

LOW_VALUE_KEYWORDS = {
    "사항",
    "내용",
    "경우",
    "필요",
    "따른",
    "관련",
    "관한",
    "등에",
    "국가등",
    "국가 등",
    "지방자치단체",
    "사람",
    "대상",
    "지원",
    "권리",
    "의무",
}


def build_document_chunks(markdown: str, chunk_size: int = EMBEDDING_CHUNK_SIZE) -> list[str]:
    chunks = [
        chunk_text
        for chunk_text in split_text(markdown or "", size=chunk_size)
        if chunk_text.strip()
    ]

    if not chunks:
        raise ValueError("No chunks were created from OCR Markdown.")

    return chunks


def normalize_display_keyword(keyword: str) -> str:
    normalized = keyword.strip().strip("`*_\"'")
    normalized = re.sub(r"^[-*]\s*", "", normalized)
    normalized = re.sub(r"^\d+[\.)]\s+", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"제\s*(\d+)\s*조", r"제\1조", normalized)
    normalized = re.sub(r"(\d+)\s*[·ㆍ]\s*(\d+)", r"\1·\2", normalized)
    return normalized.strip()


def compact_keyword_key(keyword: str) -> str:
    return re.sub(r"\s+", "", keyword).lower()


def without_leading_event_date(compact_keyword: str) -> str:
    return re.sub(r"^\d+·\d+", "", compact_keyword)


def is_keyword_supported_by_text(keyword: str, text: str) -> bool:
    compact_text = compact_keyword_key(normalize_display_keyword(text))
    compact_keyword = compact_keyword_key(keyword)

    if compact_keyword in compact_text:
        return True

    tokens = [
        token
        for token in re.findall(r"[가-힣A-Za-z0-9·]+", keyword)
        if token and token not in LOW_VALUE_KEYWORDS
    ]

    if not tokens:
        return False

    if any(token in keyword for token in ("법", "령", "규칙", "조례")):
        head_token = tokens[0]
        if len(head_token) >= 4:
            return head_token[:4] in compact_text
        return head_token in compact_text

    return any(len(token) >= 3 and token in compact_text for token in tokens)


def keyword_priority(keyword: str) -> int:
    priority = 0
    if any(token in keyword for token in ("법", "령", "규칙", "조례")):
        priority += 5
    if any(token in keyword for token in ("사건", "참사", "사고")):
        priority += 4
    if any(token in keyword for token in ("제도", "지원금", "지원단", "위원회", "특례")):
        priority += 3
    if any(token in keyword for token in ("권리", "의무", "금지", "벌칙", "처벌", "휴직", "비밀유지")):
        priority += 2
    return priority


def build_document_display_keywords(
    keywords: list[str],
    source_texts: list[str] | None = None,
    limit: int = DOCUMENT_KEYWORD_LIMIT,
) -> list[str]:
    keyword_map: dict[str, dict[str, object]] = {}
    low_value_keyword_keys = {compact_keyword_key(item) for item in LOW_VALUE_KEYWORDS}

    for index, keyword in enumerate(keywords):
        normalized = normalize_display_keyword(keyword)
        compact_key = compact_keyword_key(normalized)
        source_text = source_texts[index] if source_texts and index < len(source_texts) else ""

        if (
            not normalized
            or normalized.isdigit()
            or len(compact_key) <= 1
            or normalized in LOW_VALUE_KEYWORDS
            or compact_key in low_value_keyword_keys
        ):
            continue

        if source_text and not is_keyword_supported_by_text(normalized, source_text):
            continue

        if compact_key not in keyword_map:
            keyword_map[compact_key] = {
                "keyword": normalized,
                "count": 0,
                "priority": keyword_priority(normalized),
                "index": index,
            }

        keyword_map[compact_key]["count"] = int(keyword_map[compact_key]["count"]) + 1

    ranked_keywords = sorted(
        keyword_map.values(),
        key=lambda item: (
            -int(item["priority"]),
            -int(item["count"]),
            int(item["index"]),
        ),
    )

    selected: list[str] = []
    selected_compact_keys: list[str] = []

    for item in ranked_keywords:
        keyword = str(item["keyword"])
        compact_key = compact_keyword_key(keyword)
        comparable_key = without_leading_event_date(compact_key)

        if any(
            len(comparable_key) >= 5
            and (
                comparable_key in selected_key
                or selected_key in comparable_key
            )
            for selected_key in selected_compact_keys
        ):
            continue

        selected.append(keyword)
        selected_compact_keys.append(comparable_key)

        if len(selected) >= limit:
            break

    return selected


def summarize_chunks(
    db,
    document: Document,
    llm_provider,
    embedding_chunks: list[str],
    summary_chunks: list[str],
    task: TaskTracker,
) -> tuple[list[str], int]:
    chunk_summaries: list[str] = []
    document_keywords: list[str] = []
    document_keyword_sources: list[str] = []
    keyword_count = 0
    total_embedding_chunks = len(embedding_chunks)

    for index, chunk in enumerate(embedding_chunks, start=1):
        progress = 30 + int((index / total_embedding_chunks) * 20)
        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=progress,
            stage=TaskStage.SUMMARY_PROCESSING,
            message=f"임베딩 chunk {index}/{total_embedding_chunks}의 핵심 키워드를 생성하는 중입니다.",
        )

        keywords = llm_provider.extract_keywords(chunk)
        representative_keyword = llm_provider.extract_representative_keyword(
            chunk,
            candidate_keywords=keywords,
        )

        # 임베딩 검색 품질을 위해 document_chunks에는 기존 크기의 chunk를 그대로 저장한다.
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

        # LLM 대표 키워드는 유지하되, 저장 직전에 프론트 표시용으로 한 번 더 정리한다.
        if representative_keyword:
            document_keywords.append(representative_keyword)
            document_keyword_sources.append(chunk)

        keyword_count += len(keywords)

    total_summary_chunks = len(summary_chunks)

    for index, chunk in enumerate(summary_chunks, start=1):
        progress = 50 + int((index / total_summary_chunks) * 25)
        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=progress,
            stage=TaskStage.SUMMARY_PROCESSING,
            message=f"요약 chunk {index}/{total_summary_chunks}를 요약하는 중입니다.",
        )

        chunk_summary = llm_provider.summarize_chunk(chunk)
        chunk_summaries.append(
            f"chunk {index} 요약: {chunk_summary}"
        )

    document.keywords = build_document_display_keywords(
        document_keywords,
        source_texts=document_keyword_sources,
    )

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
            message="임베딩용 chunk를 생성하는 중입니다.",
        )

        embedding_chunks = build_document_chunks(
            document.ocr_markdown,
            chunk_size=EMBEDDING_CHUNK_SIZE,
        )
        summary_chunks = build_document_chunks(
            document.ocr_markdown,
            chunk_size=SUMMARY_CHUNK_SIZE,
        )
        llm_provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)
        summary_prompt = get_active_prompt_content(db, SUMMARY_PROMPT_KEY)
        category_prompt = get_active_prompt_content(db, CATEGORY_PROMPT_KEY)

        chunk_summaries, keyword_count = summarize_chunks(
            db=db,
            document=document,
            llm_provider=llm_provider,
            embedding_chunks=embedding_chunks,
            summary_chunks=summary_chunks,
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

        generated_summary = llm_provider.summarize_from_chunk_summaries(
            chunk_summaries,
            prompt=summary_prompt,
        )
        if not generated_summary.strip():
            raise ValueError("Generated document summary is empty.")

        document.summary = generated_summary

        category_result = llm_provider.classify_document_category(
            markdown=document.ocr_markdown,
            summary=document.summary,
            prompt=category_prompt,
        )
        save_document_category(
            db=db,
            document=document,
            classification=CategoryClassification(
                category=str(category_result.get("category") or "기타"),
                confidence=category_result.get("confidence"),
            ),
        )

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
            "chunk_count": len(embedding_chunks),
            "summary_chunk_count": len(summary_chunks),
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
