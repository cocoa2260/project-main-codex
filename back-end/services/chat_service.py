from dataclasses import dataclass
from datetime import UTC
from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

import json

from ai.llms.llm_factory import get_llm_provider
from core.config import settings
from models.chat_message import ChatMessage
from models.chat_message import ChatRole
from models.chat_session import ChatSession
from models.document import Document
from models.document import DocumentStatus
from models.document_chunk import DocumentChunk
from services.prompt_defaults import DEFAULT_QA_PROMPT
from services.prompt_defaults import QA_PROMPT_KEY
from services.prompt_service import get_active_prompt_content
from tasks.search_tasks import process_search_chunks

COLAB_LLM_URL = "https://caravan-powdery-omen.ngrok-free.dev/generate"
MAX_CONTEXT_CHARS = 12000
MAX_CHUNKS = 4


class DocumentChatError(Exception):
    pass


class DocumentChatNotFoundError(DocumentChatError):
    pass


class DocumentChatInvalidStateError(DocumentChatError):
    pass


class DocumentChatEmptyMessageError(DocumentChatError):
    pass


class DocumentChatContextError(DocumentChatError):
    pass


class DocumentChatGenerationError(DocumentChatError):
    pass


@dataclass
class DocumentChatCitation:
    source: str
    label: str
    chunk_id: UUID | None = None
    page_no: int | None = None


@dataclass
class DocumentChatResult:
    answer: str
    citations: list[DocumentChatCitation]
    session_id: UUID | None
    message_id: UUID | None


DEFAULT_CHAT_SESSION_TITLE = "새 채팅"
TITLE_MAX_LENGTH = 50


def _normalize_title(title: str | None) -> str:
    normalized = (title or "").strip()
    return normalized[:120] if normalized else DEFAULT_CHAT_SESSION_TITLE


def _title_from_question(question: str) -> str:
    return question.replace("\n", " ").strip()[:TITLE_MAX_LENGTH] or DEFAULT_CHAT_SESSION_TITLE


def _role_to_response(role: str) -> str:
    if role == ChatRole.USER:
        return "user"
    if role == ChatRole.ASSISTANT:
        return "assistant"
    return role.lower()


def get_user_document_for_chat(
    db: Session,
    document_id: UUID,
    question: str,
    top_k: int = 5,
) -> list[tuple[dict, float]]:
    document = process_search_chunks(
        db=db,
        document_id=document_id,
        task_id=None,
        question=question,
        embedding_model=settings.EMBEDDING_MODEL,
        top_k=top_k,
    )

    if document is None:
        raise DocumentChatNotFoundError("문서를 찾을 수 없습니다.")


    return document


def _build_reranked_context(rerank_chunks: list[tuple[dict, float]]) -> str:
    chunk_texts: list[str] = []

    for chunk in rerank_chunks:
        if isinstance(chunk, tuple):
            chunk_text = chunk[0]['content'] if isinstance(chunk[0], dict) else chunk[0]
        else:
            chunk_text = chunk

        if isinstance(chunk_text, str) and chunk_text.strip():
            chunk_texts.append(chunk_text.strip())

    return " | ".join(chunk_texts)


def _build_reranked_citations(rerank_chunks: list[tuple[dict, float]]) -> list[DocumentChatCitation]:
    citations: list[DocumentChatCitation] = []
    labels = set()

    for index, chunk in enumerate(rerank_chunks, start=1):
        
        if isinstance(chunk, tuple):
            chunk_text = chunk[0]['content'] if isinstance(chunk[0], dict) else chunk[0]
        else:
            chunk_text = chunk

        if not isinstance(chunk_text, str) or not chunk_text.strip():
            continue

        label = chunk[0]['file_name'] if isinstance(chunk[0], dict) and 'file_name' in chunk[0] else f"Chunk {index}"
        if label not in labels:
            labels.add(label)

            citations.append(
            DocumentChatCitation(
                source=chunk_text,
                label=label,
            )
        )    
        else :
            continue        
    
    return citations


def create_chat_session(
    db: Session,
    document_id: UUID,
    user_id: UUID,
    title: str | None = None,
) -> ChatSession:
    # document = get_user_document_for_chat(db, document_id, user_id)
    session = ChatSession(
        user_id=user_id,
        document_id=document_id,
        title=_normalize_title(title),
        llm_model=settings.DEFAULT_LLM_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def list_chat_sessions(
    db: Session,
    document_id: UUID,
    user_id: UUID,
) -> list[tuple[ChatSession, int]]:
    # get_user_document_for_chat(db, document_id, user_id)

    rows = (
        db.query(ChatSession, func.count(ChatMessage.id).label("message_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .filter(
            ChatSession.document_id == document_id,
            ChatSession.user_id == user_id,
        )
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [(session, int(message_count or 0)) for session, message_count in rows]


def get_chat_session(
    db: Session,
    document_id: UUID,
    session_id: UUID,
    user_id: UUID,
) -> ChatSession:
    # get_user_document_for_chat(db, document_id, user_id)

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.document_id == document_id,
            ChatSession.user_id == user_id,
        )
        .first()
    )
    if session is None:
        raise DocumentChatNotFoundError("채팅 세션을 찾을 수 없습니다.")

    return session


def delete_chat_session(
    db: Session,
    document_id: UUID,
    session_id: UUID,
    user_id: UUID,
) -> None:
    session = get_chat_session(db, document_id, session_id, user_id)
    db.delete(session)
    db.commit()


def list_chat_messages(
    db: Session,
    session_id: UUID,
) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )


def get_or_create_latest_chat_session(
    db: Session,
    document_id: UUID,
    document_embedding_model: str,
    user_id: UUID,
) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.document_id == document_id,
            ChatSession.user_id == user_id,
        )
        .order_by(ChatSession.updated_at.desc())
        .first()
    )
    if session is not None:
        return session

    session = ChatSession(
        user_id=user_id,
        document_id=document_id,
        title=DEFAULT_CHAT_SESSION_TITLE,
        llm_model=settings.DEFAULT_LLM_MODEL,
        embedding_model=document_embedding_model,
    )
    db.add(session)
    db.flush()
    return session


def serialize_chat_message(message: ChatMessage) -> dict:
    return {
        "id": message.id,
        "role": _role_to_response(message.role),
        "content": message.content,
        "created_at": message.created_at,
    }


# def _score_chunk(question_terms: set[str], chunk: DocumentChunk) -> int:
#     if not question_terms:
#         return 0

#     content = (chunk.content or "").lower()
#     keywords = " ".join(chunk.keywords or []).lower()
#     haystack = f"{content} {keywords}"

#     return sum(1 for term in question_terms if term and term in haystack)


# def _select_relevant_chunks(db: Session, document_id: UUID, question: str) -> list[DocumentChunk]:
#     chunks = (
#         db.query(DocumentChunk)
#         .filter(DocumentChunk.document_id == document_id)
#         .order_by(DocumentChunk.chunk_index.asc())
#         .all()
#     )
#     if not chunks:
#         return []

#     question_terms = {
#         term.strip().lower()
#         for term in question.replace("\n", " ").split(" ")
#         if len(term.strip()) >= 2
#     }
#     scored_chunks = [
#         (_score_chunk(question_terms, chunk), chunk.chunk_index, chunk)
#         for chunk in chunks
#     ]
#     scored_chunks.sort(key=lambda item: (-item[0], item[1]))

#     selected = [chunk for score, _, chunk in scored_chunks if score > 0][:MAX_CHUNKS]
#     if selected:
#         return selected

#     return chunks[:MAX_CHUNKS]


# def _build_chat_context(document: Document, chunks: list[DocumentChunk]) -> tuple[str, list[DocumentChatCitation]]:
#     context_parts: list[str] = []
#     citations: list[DocumentChatCitation] = []

#     if document.summary:
#         context_parts.append(f"## 문서 요약\n{document.summary.strip()}")
#         citations.append(DocumentChatCitation(source="summary", label="문서 요약"))

#     for chunk in chunks:
#         chunk_text = (chunk.content or "").strip()
#         if not chunk_text:
#             continue

#         label = f"Chunk {chunk.chunk_index}"
#         if chunk.page_no:
#             label = f"Page {chunk.page_no} · {label}"
#         context_parts.append(f"## {label}\n{chunk_text}")
#         citations.append(
#             DocumentChatCitation(
#                 source="chunk",
#                 label=label,
#                 chunk_id=chunk.id,
#                 page_no=chunk.page_no,
#             )
#         )

#     if not context_parts and document.ocr_markdown:
#         context_parts.append(f"## OCR Markdown\n{document.ocr_markdown.strip()[:MAX_CONTEXT_CHARS]}")
#         citations.append(DocumentChatCitation(source="ocr_markdown", label="OCR Markdown"))

#     context = "\n\n".join(context_parts).strip()
#     return context[:MAX_CONTEXT_CHARS], citations


def _generate_answer(question: str, context: str, prompt: str | None = None) -> str:
    provider = get_llm_provider(settings.DEFAULT_QA_MODEL)
    return provider.answer_question(question=question, context=context, prompt=prompt).strip()


def answer_document_question(
    db: Session,
    document_id: UUID,
    user_id: UUID,
    message: str,
    session_id: UUID | None = None,
) -> DocumentChatResult:
    question = message.strip()
    if not question:
        raise DocumentChatEmptyMessageError("질문 내용을 입력해 주세요.")

    rerank_chunks = get_user_document_for_chat(db, document_id, question, 5)

    # chunks = _select_relevant_chunks(db, document_id, question)
    # context, citations = _build_chat_context(document, chunks)

    context = _build_reranked_context(rerank_chunks)
    citations = _build_reranked_citations(rerank_chunks)
    
    if not context:
        raise DocumentChatContextError("질문에 사용할 문서 컨텍스트가 없습니다.")

    qa_prompt = get_active_prompt_content(db, QA_PROMPT_KEY)

    if session_id is None:
        session = get_or_create_latest_chat_session(db, document_id, settings.EMBEDDING_MODEL, user_id)
    else:
        session = get_chat_session(db, document_id, session_id, user_id)

    user_message = ChatMessage(
        session_id=session.id,
        role=ChatRole.USER,
        content=question,
        created_at=datetime.now(),
    )
    db.add(user_message)
    db.flush()

    try:
        answer = _generate_answer(question, context, prompt=qa_prompt)
    except Exception as exc:
        db.rollback()
        raise DocumentChatGenerationError("LLM 답변 생성에 실패했습니다.") from exc
    
    if not answer:
        db.rollback()
        raise DocumentChatGenerationError("LLM 답변이 비어 있습니다.")

    assistant_message = ChatMessage(
        session_id=session.id,
        role=ChatRole.ASSISTANT,
        content=answer,
        created_at=datetime.now(),
    )
    db.add(assistant_message)

    if session.title == DEFAULT_CHAT_SESSION_TITLE:
        session.title = _title_from_question(question)
    session.updated_at = datetime.now()

    db.commit()
    db.refresh(session)
    db.refresh(assistant_message)

    return DocumentChatResult(
        answer=answer,
        citations=citations,
        session_id=session.id,
        message_id=assistant_message.id,
    )

async def generate_rag_stream(user_message: str, document_id: str, db: Session):
    question = user_message.strip()

    if not question:
        yield json.dumps({
            "type": "error",
            "message": "질문 내용을 입력해 주세요."
        }, ensure_ascii=False)
        return

    try:
        document_uuid = UUID(document_id)
    except ValueError:
        yield json.dumps({
            "type": "error",
            "message": "잘못된 문서 ID입니다."
        }, ensure_ascii=False)
        return

    document = (
        db.query(Document)
        .filter(Document.id == document_uuid)
        .first()
    )

    if document is None:
        yield json.dumps({
            "type": "error",
            "message": "문서를 찾을 수 없습니다."
        }, ensure_ascii=False)
        return

    if document.status != DocumentStatus.COMPLETED:
        yield json.dumps({
            "type": "error",
            "message": "처리가 완료된 문서만 질문할 수 있습니다."
        }, ensure_ascii=False)
        return

    """
    [안정화된 스트리밍 브릿지]
    """
    # 1. 실제 DB에서 문서를 조회하는 로직으로 교체 (동기 ORM 사용 시 주의)
    # document = db.query(Document).filter(Document.id == document_id).first()
    # if not document:
    #     yield "문서를 찾을 수 없습니다.\n[DONE]"
    #     return
    # context_text = document.content
    
    # (임시) 일단 기존 로직을 살려둡니다.
    # context_text = "[관련 판례 내용] 피고인은 고의성 없이 영장 발부 사실을 몰랐으므로..."

    context_text = process_search_chunks(db, document.id, question, document.selected_embedding_model, top_k=5)


    
    qa_prompt = get_active_prompt_content(db, QA_PROMPT_KEY) or DEFAULT_QA_PROMPT
    prompt = (
        f"{qa_prompt}\n\n"
        "### 원본 문서:\n"
        f"{context_text}\n"
        "### 질문:\n"
        f"{user_message}\n"
        "### 답변:\n"
    )

    # 3. 통신 시작
    async with httpx.AsyncClient(verify=False, timeout=120.0) as client:
        headers = {"ngrok-skip-browser-warning": "true"}
        
        async with client.stream("POST", COLAB_LLM_URL, json={"prompt": prompt}, headers=headers) as response:
            if response.status_code == 200:
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
                yield "\n[DONE]"
            else:
                yield f"[오류] 서버 응답 코드: {response.status_code}\n[DONE]"
