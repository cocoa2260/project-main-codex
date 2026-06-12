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
