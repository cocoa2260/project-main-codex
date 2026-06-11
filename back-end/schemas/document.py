from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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
    page_count: int | None = 0
    file_size: int
    upload_at: datetime
    process_at: datetime | None = None
    embedding_model: str | None = None
    llm_model: str | None = None


class DocumentActionResponse(BaseModel):
    document_id: UUID
    task_id: UUID | None = None
    status: str
    message: str


class DocumentResponse(BaseModel):
    id: UUID
    file_name: str
    status: str
    category: str | None = None
    summary: str | None = None
    page_count: int | None = 0
    selected_embedding_model: str | None = None
    upload_at: datetime

    class Config:
        from_attributes = True
