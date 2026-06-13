from __future__ import annotations

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


class AdminSystemHealthServiceResponse(BaseModel):
    key: str
    name: str
    status: str
    details: str | None = None
    checked_at: datetime


class AdminSystemHealthResponse(BaseModel):
    services: list[AdminSystemHealthServiceResponse]


class AdminQueueResponse(BaseModel):
    name: str
    pending_count: int
    active_count: int | None = None
    scheduled_count: int | None = None
    reserved_count: int | None = None
    failed_count: int | None = None
    oldest_task_age_seconds: int | None = None
    status: str | None = None
    details: str | None = None


class AdminQueueListResponse(BaseModel):
    queues: list[AdminQueueResponse]
    checked_at: datetime
    status: str | None = None
    details: str | None = None


class AdminWorkerResponse(BaseModel):
    id: str
    name: str
    status: str
    active_task_count: int | None = None
    reserved_task_count: int | None = None
    scheduled_task_count: int | None = None
    processed_count: int | None = None
    current_queues: list[str] | None = None
    checked_at: datetime
    details: str | None = None


class AdminWorkerListResponse(BaseModel):
    workers: list[AdminWorkerResponse]
    checked_at: datetime
    status: str | None = None
    details: str | None = None


class AdminLogItemResponse(BaseModel):
    id: UUID
    timestamp: datetime
    level: str
    service: str | None = None
    source: str
    message: str
    details: dict[str, str | int | None] | None = None
    related_task_id: UUID | None = None
    related_document_id: UUID | None = None


class AdminLogListResponse(BaseModel):
    items: list[AdminLogItemResponse]
    pagination: AdminPaginationResponse
    warning_message: str | None = None


class AdminLogSummaryResponse(BaseModel):
    total: int
    info: int
    warning: int
    error: int
    success: int
    recent_errors: list[AdminLogItemResponse]
    warning_message: str | None = None


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


class AdminTaskDocumentResponse(BaseModel):
    id: UUID
    file_name: str
    status: str
    category: str | None = None
    upload_at: datetime
    updated_at: datetime


class AdminTaskListItemResponse(BaseModel):
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
    document: AdminTaskDocumentResponse
    owner: AdminOwnerResponse


class AdminTaskListResponse(BaseModel):
    items: list[AdminTaskListItemResponse]
    pagination: AdminPaginationResponse


class AdminTaskDetailResponse(AdminTaskListItemResponse):
    pass


class AdminUserListItemResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    document_count: int
    upload_count: int
    created_at: datetime
    updated_at: datetime


class AdminUserDocumentResponse(BaseModel):
    id: UUID
    file_name: str
    status: str
    upload_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItemResponse]
    pagination: AdminPaginationResponse


class AdminUserDetailResponse(AdminUserListItemResponse):
    documents: list[AdminUserDocumentResponse]
    recent_tasks: list[AdminTaskListItemResponse]
