from dataclasses import dataclass
from datetime import UTC
from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from ai.llms.llm_factory import get_llm_provider
from core.config import settings
from models.chat_message import ChatMessage
from models.chat_message import ChatRole
from models.chat_session import ChatSession
from models.document import Document
from models.document import DocumentStatus
from models.document_chunk import DocumentChunk

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
    user_id: UUID,
) -> Document:
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == user_id,
        )
        .first()
    )
    if document is None:
        raise DocumentChatNotFoundError("문서를 찾을 수 없습니다.")

    if document.status != DocumentStatus.COMPLETED:
        raise DocumentChatInvalidStateError("처리가 완료된 문서만 질문할 수 있습니다.")

    return document


def create_chat_session(
    db: Session,
    document_id: UUID,
    user_id: UUID,
    title: str | None = None,
) -> ChatSession:
    document = get_user_document_for_chat(db, document_id, user_id)
    session = ChatSession(
        user_id=user_id,
        document_id=document.id,
        title=_normalize_title(title),
        llm_model=settings.DEFAULT_LLM_MODEL,
        embedding_model=document.selected_embedding_model,
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
    get_user_document_for_chat(db, document_id, user_id)

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
    get_user_document_for_chat(db, document_id, user_id)

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
    document: Document,
    user_id: UUID,
) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.document_id == document.id,
            ChatSession.user_id == user_id,
        )
        .order_by(ChatSession.updated_at.desc())
        .first()
    )
    if session is not None:
        return session

    session = ChatSession(
        user_id=user_id,
        document_id=document.id,
        title=DEFAULT_CHAT_SESSION_TITLE,
        llm_model=settings.DEFAULT_LLM_MODEL,
        embedding_model=document.selected_embedding_model,
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


def _score_chunk(question_terms: set[str], chunk: DocumentChunk) -> int:
    if not question_terms:
        return 0

    content = (chunk.content or "").lower()
    keywords = " ".join(chunk.keywords or []).lower()
    haystack = f"{content} {keywords}"

    return sum(1 for term in question_terms if term and term in haystack)


def _select_relevant_chunks(db: Session, document_id: UUID, question: str) -> list[DocumentChunk]:
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    if not chunks:
        return []

    question_terms = {
        term.strip().lower()
        for term in question.replace("\n", " ").split(" ")
        if len(term.strip()) >= 2
    }
    scored_chunks = [
        (_score_chunk(question_terms, chunk), chunk.chunk_index, chunk)
        for chunk in chunks
    ]
    scored_chunks.sort(key=lambda item: (-item[0], item[1]))

    selected = [chunk for score, _, chunk in scored_chunks if score > 0][:MAX_CHUNKS]
    if selected:
        return selected

    return chunks[:MAX_CHUNKS]


def _build_chat_context(document: Document, chunks: list[DocumentChunk]) -> tuple[str, list[DocumentChatCitation]]:
    context_parts: list[str] = []
    citations: list[DocumentChatCitation] = []

    if document.summary:
        context_parts.append(f"## 문서 요약\n{document.summary.strip()}")
        citations.append(DocumentChatCitation(source="summary", label="문서 요약"))

    for chunk in chunks:
        chunk_text = (chunk.content or "").strip()
        if not chunk_text:
            continue

        label = f"Chunk {chunk.chunk_index}"
        if chunk.page_no:
            label = f"Page {chunk.page_no} · {label}"
        context_parts.append(f"## {label}\n{chunk_text}")
        citations.append(
            DocumentChatCitation(
                source="chunk",
                label=label,
                chunk_id=chunk.id,
                page_no=chunk.page_no,
            )
        )

    if not context_parts and document.ocr_markdown:
        context_parts.append(f"## OCR Markdown\n{document.ocr_markdown.strip()[:MAX_CONTEXT_CHARS]}")
        citations.append(DocumentChatCitation(source="ocr_markdown", label="OCR Markdown"))

    context = "\n\n".join(context_parts).strip()
    return context[:MAX_CONTEXT_CHARS], citations


def _generate_answer(question: str, context: str) -> str:
    provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)
    return provider.answer_question(question=question, context=context).strip()


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

    document = get_user_document_for_chat(db, document_id, user_id)

    chunks = _select_relevant_chunks(db, document.id, question)
    context, citations = _build_chat_context(document, chunks)
    if not context:
        raise DocumentChatContextError("질문에 사용할 문서 컨텍스트가 없습니다.")

    if session_id is None:
        session = get_or_create_latest_chat_session(db, document, user_id)
    else:
        session = get_chat_session(db, document_id, session_id, user_id)

    user_message = ChatMessage(
        session_id=session.id,
        role=ChatRole.USER,
        content=question,
        created_at=datetime.now(UTC),
    )
    db.add(user_message)
    db.flush()

    try:
        answer = _generate_answer(question, context)
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
        created_at=datetime.now(UTC),
    )
    db.add(assistant_message)

    if session.title == DEFAULT_CHAT_SESSION_TITLE:
        session.title = _title_from_question(question)
    session.updated_at = datetime.now(UTC)

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
    context_text = "[관련 판례 내용] 피고인은 고의성 없이 영장 발부 사실을 몰랐으므로..."
    
    # 2. QnA 목적에 맞는 프롬프트로 수정
    prompt = f"""당신은 유능한 법률 전문가입니다. 아래 제공된 법률 판례 원문을 바탕으로 사용자의 질문에 정확하고 간결하게 답변해 주세요.
    ### 원본 문서:
    {context_text}
    ### 질문:
    {user_message}
    ### 답변:
    """

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
