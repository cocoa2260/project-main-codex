from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    task_id: UUID
    status: str
    ocr_markdown: str | None = None
    embedding_model: str | None = None


class DocumentStatusResponse(BaseModel):
    document_id: UUID
    task_id: UUID | None = None
    status: str
    stage: str | None = None
    progress: int = 0
    message: str | None = None


class DocumentMarkdownResponse(BaseModel):
    document_id: UUID
    status: str
    markdown: str | None = None
    embedding_model: str | None = None


class DocumentSummaryResponse(BaseModel):
    document_id: UUID
    file_name: str
    status: str
    summary: str | None = None
    # documents.keywords에 저장된 문서 대표 키워드를 프론트 요약 화면에 내려준다.
    keywords: list[str] = []
    page_count: int | None = 0
    file_size: int
    upload_at: datetime
    process_at: datetime | None = None
    embedding_model: str | None = None
    llm_model: str | None = None
    category: dict[str, str | float | None] | None = None


class DocumentActionResponse(BaseModel):
    document_id: UUID
    task_id: UUID | None = None
    status: str
    message: str


class DocumentDeleteResponse(BaseModel):
    document_id: UUID
    file_name: str
    deleted: bool
    message: str


class DocumentChatRequest(BaseModel):
    message: str


class DocumentChatCitation(BaseModel):
    source: str
    label: str
    chunk_id: UUID | None = None
    page_no: int | None = None


class DocumentChatResponse(BaseModel):
    answer: str
    citations: list[DocumentChatCitation] = []
    session_id: UUID | None = None
    message_id: UUID | None = None


class DocumentChatSessionCreateRequest(BaseModel):
    title: str | None = None


class DocumentChatSessionListItem(BaseModel):
    id: UUID
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class DocumentChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime


class DocumentChatSessionDetailResponse(BaseModel):
    id: UUID
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    messages: list[DocumentChatMessageResponse] = Field(default_factory=list)


class DocumentResponse(BaseModel):
    id: UUID
    file_name: str
    file_size: int
    status: str
    category: str | None = None
    category_confidence: float | None = None
    keywords: list[str] = []
    summary: str | None = None
    page_count: int | None = 0
    selected_embedding_model: str | None = None
    upload_at: datetime

    class Config:
        from_attributes = True
