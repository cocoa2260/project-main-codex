from datetime import datetime
from datetime import time
from datetime import timezone

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from models.document import Document
from models.document import DocumentStatus
from models.task_tracker import TaskStatus
from models.task_tracker import TaskTracker
from models.task_tracker import TaskType
from models.user import User
from models.user import UserRole
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import DocumentStatsResponse
from schemas.admin import RecentEventResponse
from schemas.admin import TaskStatsResponse
from schemas.admin import UserStatsResponse


def _today_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=timezone.utc)
    return start, end


def _count_by(db: Session, model, column) -> dict[str, int]:
    rows = (
        db.query(column, func.count(model.id))
        .group_by(column)
        .all()
    )
    return {str(key): count for key, count in rows}


def _fill_counts(values: dict[str, int], expected_values: list[str]) -> dict[str, int]:
    return {
        value: values.get(value, 0)
        for value in expected_values
    }


def get_user_stats(db: Session) -> UserStatsResponse:
    today_start, today_end = _today_bounds()

    total_users = db.query(func.count(User.id)).scalar() or 0
    admin_users = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.ADMIN)
        .scalar()
        or 0
    )
    today_users = (
        db.query(func.count(User.id))
        .filter(
            User.created_at >= today_start,
            User.created_at <= today_end,
        )
        .scalar()
        or 0
    )

    return UserStatsResponse(
        total_users=total_users,
        admin_users=admin_users,
        today_users=today_users,
    )


def get_document_stats(db: Session) -> DocumentStatsResponse:
    today_start, today_end = _today_bounds()

    total = db.query(func.count(Document.id)).scalar() or 0
    uploaded_today = (
        db.query(func.count(Document.id))
        .filter(
            Document.upload_at >= today_start,
            Document.upload_at <= today_end,
        )
        .scalar()
        or 0
    )
    by_status = _fill_counts(
        _count_by(db, Document, Document.status),
        [
            DocumentStatus.PENDING,
            DocumentStatus.PROCESSING,
            DocumentStatus.REVIEW_REQUIRED,
            DocumentStatus.COMPLETED,
            DocumentStatus.FAILED,
        ],
    )

    return DocumentStatsResponse(
        total=total,
        uploaded_today=uploaded_today,
        by_status=by_status,
    )


def get_task_stats(db: Session) -> TaskStatsResponse:
    total = db.query(func.count(TaskTracker.id)).scalar() or 0
    by_status = _fill_counts(
        _count_by(db, TaskTracker, TaskTracker.status),
        [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
        ],
    )
    by_type = _fill_counts(
        _count_by(db, TaskTracker, TaskTracker.task_type),
        [
            TaskType.OCR,
            TaskType.SUMMARY,
            TaskType.EMBEDDING,
            TaskType.RAG_INDEXING,
        ],
    )

    return TaskStatsResponse(
        total=total,
        by_status=by_status,
        by_type=by_type,
    )


def get_recent_events(db: Session, limit: int = 10) -> list[RecentEventResponse]:
    tasks = (
        db.query(TaskTracker)
        .options(joinedload(TaskTracker.document))
        .order_by(TaskTracker.updated_at.desc())
        .limit(limit)
        .all()
    )

    events = []
    for task in tasks:
        document_name = task.document.file_name if task.document else None
        task_label = task.task_type or "TASK"
        status_label = task.status or "UNKNOWN"
        message = task.message or task.error_message or f"{task_label} task is {status_label}"

        events.append(
            RecentEventResponse(
                id=task.id,
                event_type="TASK",
                message=message,
                occurred_at=task.updated_at,
                document_id=task.document_id,
                document_name=document_name,
                task_type=task.task_type,
                status=task.status,
            )
        )

    return events


def get_dashboard_summary(db: Session) -> AdminDashboardSummaryResponse:
    return AdminDashboardSummaryResponse(
        users=get_user_stats(db),
        documents=get_document_stats(db),
        tasks=get_task_stats(db),
        recent_events=get_recent_events(db),
    )
