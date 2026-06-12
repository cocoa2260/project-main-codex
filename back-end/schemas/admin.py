from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserStatsResponse(BaseModel):
    total_users: int
    admin_users: int
    today_users: int


class DocumentStatsResponse(BaseModel):
    total: int
    uploaded_today: int
    by_status: dict[str, int]


class TaskStatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    by_type: dict[str, int]


class RecentEventResponse(BaseModel):
    id: UUID
    event_type: str
    message: str
    occurred_at: datetime
    document_id: UUID | None = None
    document_name: str | None = None
    task_type: str | None = None
    status: str | None = None


class AdminDashboardSummaryResponse(BaseModel):
    users: UserStatsResponse
    documents: DocumentStatsResponse
    tasks: TaskStatsResponse
    recent_events: list[RecentEventResponse]


class AdminOwnerResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str


class AdminLatestTaskResponse(BaseModel):
    id: UUID
    task_type: str
    status: str
    stage: str | None = None
    progress: int
    message: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminDocumentListItemResponse(BaseModel):
    id: UUID
    file_name: str
    status: str
    category: str | None = None
    file_size: int
    page_count: int | None = 0
    selected_embedding_model: str | None = None
    upload_at: datetime
    process_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    owner: AdminOwnerResponse
    latest_task: AdminLatestTaskResponse | None = None


class AdminPaginationResponse(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class AdminDocumentListResponse(BaseModel):
    items: list[AdminDocumentListItemResponse]
    pagination: AdminPaginationResponse


class AdminDocumentDetailResponse(AdminDocumentListItemResponse):
    summary: str | None = None
    chunk_count: int
    keywords: list[str]
