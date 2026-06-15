from datetime import date
from datetime import datetime
from datetime import time
from datetime import timezone
from math import ceil
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
from urllib.parse import urlunsplit
from uuid import UUID

import httpx
import redis
from sqlalchemy import and_
from sqlalchemy import func
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.celery_app import celery_app
from core.config import settings
from core.security import ACCESS_TOKEN_EXPIRE_MINUTES
from core.security import ALGORITHM
from models.document import Document
from models.document import DocumentStatus
from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding
from models.audit_log import AuditAction
from models.audit_log import AuditTargetType
from models.task_tracker import TaskStatus
from models.task_tracker import TaskStage
from models.task_tracker import TaskTracker
from models.task_tracker import TaskType
from models.user import User
from models.user import UserRole
from models.user import UserStatus
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentDeleteResponse
from schemas.admin import AdminDocumentListItemResponse
from schemas.admin import AdminDocumentListResponse
from schemas.admin import AdminDocumentRetryResponse
from schemas.admin import AdminQueueListResponse
from schemas.admin import AdminQueueResponse
from schemas.admin import AdminSystemHealthResponse
from schemas.admin import AdminSystemHealthServiceResponse
from schemas.admin import AdminTaskDetailResponse
from schemas.admin import AdminTaskDocumentResponse
from schemas.admin import AdminTaskListItemResponse
from schemas.admin import AdminTaskListResponse
from schemas.admin import AdminTaskRetryResponse
from schemas.admin import AdminUserDetailResponse
from schemas.admin import AdminUserDocumentResponse
from schemas.admin import AdminUserListItemResponse
from schemas.admin import AdminUserListResponse
from schemas.admin import AdminWorkerListResponse
from schemas.admin import AdminWorkerResponse
from schemas.admin import AdminLatestTaskResponse
from schemas.admin import AdminLogItemResponse
from schemas.admin import AdminLogListResponse
from schemas.admin import AdminLogSummaryResponse
from schemas.admin import AdminOwnerResponse
from schemas.admin import AdminPaginationResponse
from schemas.admin import AdminSettingItemResponse
from schemas.admin import AdminSettingsCategoryResponse
from schemas.admin import AdminSettingsResponse
from schemas.admin import DocumentStatsResponse
from schemas.admin import RecentEventResponse
from schemas.admin import TaskStatsResponse
from schemas.admin import UserStatsResponse
from services.audit_service import record_document_reprocess_requested
from services.audit_service import record_failed_task_retry
from services.document_service import attach_celery_task_id
from services.document_service import create_document_task
from tasks.ocr_tasks import process_document_ocr
from tasks.summary_tasks import process_document_summary
from services.audit_service import record_admin_action


HEALTHY = "HEALTHY"
WARNING = "WARNING"
ERROR = "ERROR"
ACTIVE = "ACTIVE"
IDLE = "IDLE"
STORAGE_DIR = "/storage/uploads"
MAX_UPLOAD_SIZE = 30 * 1024 * 1024
SUPPORTED_EXTENSIONS = [".pdf"]
LOG_LEVEL_INFO = "INFO"
LOG_LEVEL_WARNING = "WARNING"
LOG_LEVEL_ERROR = "ERROR"
LOG_LEVEL_SUCCESS = "SUCCESS"
LOG_SOURCE_TASK_TRACKER = "TaskTracker"
LOG_QUERY_WARNING = "TaskTracker 기반 이벤트 로그를 사용했습니다. 파일 로그 위치가 명확하지 않습니다."
RETRY_REGISTERED_MESSAGE = "재시도 작업을 등록했습니다."
DOCUMENT_REPROCESS_REGISTERED_MESSAGE = "문서 재처리 작업을 등록했습니다."
ROLE_UPDATE_SELF_DEMOTION = "SELF_DEMOTION"
ROLE_UPDATE_LAST_ADMIN = "LAST_ADMIN"
STATUS_UPDATE_SELF_SUSPEND = "SELF_SUSPEND"
STATUS_UPDATE_LAST_ADMIN = "LAST_ADMIN"
DOCUMENT_DELETE_MESSAGE = "문서가 삭제되었습니다."
DOCUMENT_RETRY_STAGE_OCR = "OCR"
DOCUMENT_RETRY_STAGE_SUMMARY = "SUMMARY"
DOCUMENT_RETRY_FROM_STAGES = {
    DOCUMENT_RETRY_STAGE_OCR,
    DOCUMENT_RETRY_STAGE_SUMMARY,
}
DOCUMENT_RETRY_ALLOWED_STATUSES = {
    DocumentStatus.FAILED,
    DocumentStatus.COMPLETED,
    DocumentStatus.REVIEW_REQUIRED,
}

SENSITIVE_VALUE_PATTERNS = [
    re.compile(
        r"(?i)(authorization\s*[:=]\s*(?:bearer\s+)?)([^\s,;]+)"
    ),
    re.compile(
        r"(?i)((?:access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password)\s*[:=]\s*)([^\s,;&]+)"
    ),
    re.compile(
        r"(?i)((?:postgresql|postgres|mysql|redis)://)([^\s]+)"
    ),
    re.compile(
        r"(?i)((?:hashed\s+password)\s*[:=]\s*)([^\s,;&]+)"
    ),
]
INTERNAL_PATH_PATTERN = re.compile(r"(?<!\w)(/(?:Users|private|storage|var|tmp|app|code|workspace)/[^\s,;:]+)")


def _today_bounds() -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=timezone.utc)
    return start, end


def _checked_at() -> datetime:
    return datetime.now(timezone.utc)


def _health_service(
    key: str,
    name: str,
    status: str,
    details: str | None = None,
) -> AdminSystemHealthServiceResponse:
    return AdminSystemHealthServiceResponse(
        key=key,
        name=name,
        status=status,
        details=details,
        checked_at=_checked_at(),
    )


def _exception_details(error: Exception) -> str:
    return f"{error.__class__.__name__}: {error}"


def _join_details(details: list[str]) -> str | None:
    return " ".join(details) if details else None


def _mask_sensitive(value: str | None) -> str | None:
    if value is None:
        return None

    masked = str(value)
    for pattern in SENSITIVE_VALUE_PATTERNS:
        masked = pattern.sub(r"\1***MASKED***", masked)

    return INTERNAL_PATH_PATTERN.sub("***MASKED_PATH***", masked)


def _mask_details(details: dict[str, str | int | None]) -> dict[str, str | int | None]:
    return {
        key: _mask_sensitive(value) if isinstance(value, str) else value
        for key, value in details.items()
    }


def _mask_url_credentials(value: str) -> str:
    parsed = urlsplit(value)
    if not parsed.hostname or not parsed.username:
        return value

    hostname = parsed.hostname
    if parsed.port:
        hostname = f"{hostname}:{parsed.port}"

    return urlunsplit(
        (
            parsed.scheme,
            f"***:***@{hostname}",
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


def _setting(
    key: str,
    label: str,
    value,
    sensitive: bool = False,
) -> AdminSettingItemResponse:
    return AdminSettingItemResponse(
        key=key,
        label=label,
        value=value,
        editable=False,
        sensitive=sensitive,
    )


def _task_log_level(task_status: str | None) -> str:
    if task_status == TaskStatus.FAILED:
        return LOG_LEVEL_ERROR

    if task_status == TaskStatus.COMPLETED:
        return LOG_LEVEL_SUCCESS

    if task_status in {TaskStatus.PENDING, TaskStatus.PROCESSING}:
        return LOG_LEVEL_INFO

    return LOG_LEVEL_WARNING


def _task_log_message(task: TaskTracker) -> str:
    message = task.error_message or task.message
    if message:
        return _mask_sensitive(message) or ""

    return f"{task.task_type} task is {task.status}"


def _task_log_item(task: TaskTracker) -> AdminLogItemResponse:
    details = {
        "task_type": task.task_type,
        "status": task.status,
        "stage": task.stage,
        "progress": task.progress,
    }

    return AdminLogItemResponse(
        id=task.id,
        timestamp=task.updated_at,
        level=_task_log_level(task.status),
        service=task.task_type,
        source=LOG_SOURCE_TASK_TRACKER,
        message=_task_log_message(task),
        details=_mask_details(details),
        related_task_id=task.id,
        related_document_id=task.document_id,
    )


def _check_api_health() -> AdminSystemHealthServiceResponse:
    return _health_service(
        key="api",
        name="API Server",
        status=HEALTHY,
    )


def _check_postgres_health(db: Session) -> AdminSystemHealthServiceResponse:
    try:
        db.execute(text("SELECT 1")).scalar()
        return _health_service(
            key="postgresql",
            name="PostgreSQL",
            status=HEALTHY,
        )
    except Exception as error:
        return _health_service(
            key="postgresql",
            name="PostgreSQL",
            status=ERROR,
            details=_exception_details(error),
        )


def _redis_url() -> str | None:
    candidates = [
        os.getenv("REDIS_URL"),
        os.getenv("CELERY_BROKER_URL"),
        os.getenv("CELERY_RESULT_BACKEND"),
    ]
    return next(
        (
            candidate
            for candidate in candidates
            if candidate and candidate.startswith(("redis://", "rediss://"))
        ),
        None,
    )


def _check_redis_health() -> AdminSystemHealthServiceResponse:
    redis_url = _redis_url()

    if redis_url is None:
        return _health_service(
            key="redis",
            name="Redis",
            status=ERROR,
            details="Redis URL is not configured.",
        )

    client = redis.Redis.from_url(
        redis_url,
        socket_connect_timeout=1,
        socket_timeout=1,
    )

    try:
        client.ping()
        return _health_service(
            key="redis",
            name="Redis",
            status=HEALTHY,
        )
    except Exception as error:
        return _health_service(
            key="redis",
            name="Redis",
            status=ERROR,
            details=_exception_details(error),
        )
    finally:
        client.close()


def _check_ollama_health() -> AdminSystemHealthServiceResponse:
    ollama_url = settings.OLLAMA_URL.rstrip("/")

    try:
        response = httpx.get(f"{ollama_url}/api/tags", timeout=2)
        response.raise_for_status()
        return _health_service(
            key="ollama",
            name="Ollama",
            status=HEALTHY,
        )
    except Exception as error:
        return _health_service(
            key="ollama",
            name="Ollama",
            status=ERROR,
            details=_exception_details(error),
        )


def _check_storage_health() -> AdminSystemHealthServiceResponse:
    storage_dir = Path(os.getenv("STORAGE_DIR", STORAGE_DIR))

    if not storage_dir.exists():
        return _health_service(
            key="storage",
            name="Storage",
            status=WARNING,
            details=f"Storage directory does not exist: {storage_dir}",
        )

    if not storage_dir.is_dir():
        return _health_service(
            key="storage",
            name="Storage",
            status=ERROR,
            details=f"Storage path is not a directory: {storage_dir}",
        )

    if not os.access(storage_dir, os.R_OK):
        return _health_service(
            key="storage",
            name="Storage",
            status=ERROR,
            details=f"Storage directory is not readable: {storage_dir}",
        )

    return _health_service(
        key="storage",
        name="Storage",
        status=HEALTHY,
    )


def _check_celery_health() -> AdminSystemHealthServiceResponse:
    try:
        inspect_control = celery_app.control.inspect(timeout=1)
        workers = inspect_control.ping()
    except Exception as error:
        return _health_service(
            key="celery",
            name="Celery",
            status=WARNING,
            details=f"Worker inspect unavailable. {_exception_details(error)}",
        )

    if not workers:
        return _health_service(
            key="celery",
            name="Celery",
            status=WARNING,
            details="No Celery workers responded to inspect.",
        )

    return _health_service(
        key="celery",
        name="Celery",
        status=HEALTHY,
        details=f"{len(workers)} worker(s) responded.",
    )


def _redis_client():
    redis_url = _redis_url()

    if redis_url is None:
        return None

    return redis.Redis.from_url(
        redis_url,
        socket_connect_timeout=1,
        socket_timeout=1,
    )


def _default_queue_name() -> str:
    return str(celery_app.conf.task_default_queue or "celery")


def _safe_inspect_call(inspect_control, method_name: str):
    try:
        method = getattr(inspect_control, method_name)
        return method(), None
    except Exception as error:
        return None, f"{method_name} unavailable. {_exception_details(error)}"


def _task_request(task: dict) -> dict:
    request = task.get("request")
    if isinstance(request, dict):
        return request

    return task


def _task_queue_name(task: dict) -> str | None:
    request = _task_request(task)
    delivery_info = request.get("delivery_info")

    if isinstance(delivery_info, dict):
        queue_name = delivery_info.get("routing_key") or delivery_info.get("queue")
        if queue_name:
            return str(queue_name)

    queue_name = request.get("queue")
    return str(queue_name) if queue_name else None


def _queue_names_from_active_queues(active_queues: dict | None) -> set[str]:
    queue_names = set()

    for queues in (active_queues or {}).values():
        for queue in queues or []:
            if not isinstance(queue, dict):
                continue

            queue_name = queue.get("name") or queue.get("routing_key")
            if queue_name:
                queue_names.add(str(queue_name))

    return queue_names


def _count_tasks_by_queue(tasks_by_worker: dict | None) -> dict[str, int]:
    counts: dict[str, int] = {}

    for tasks in (tasks_by_worker or {}).values():
        for task in tasks or []:
            if not isinstance(task, dict):
                continue

            queue_name = _task_queue_name(task)
            if queue_name:
                counts[queue_name] = counts.get(queue_name, 0) + 1

    return counts


def _pending_counts(queue_names: set[str]) -> tuple[dict[str, int], str | None]:
    client = _redis_client()

    if client is None:
        return {}, "Redis URL is not configured."

    try:
        return {
            queue_name: int(client.llen(queue_name))
            for queue_name in queue_names
        }, None
    except Exception as error:
        return {}, f"Redis queue length unavailable. {_exception_details(error)}"
    finally:
        client.close()


def _processed_count(worker_stats: dict | None) -> int | None:
    if not worker_stats:
        return None

    totals = worker_stats.get("total")
    if not isinstance(totals, dict):
        return None

    return sum(int(count or 0) for count in totals.values())


def get_admin_queues() -> AdminQueueListResponse:
    checked_at = _checked_at()
    details = []
    queue_names = {_default_queue_name()}

    inspect_control = celery_app.control.inspect(timeout=1)
    active_queues, active_queue_error = _safe_inspect_call(inspect_control, "active_queues")
    active, active_error = _safe_inspect_call(inspect_control, "active")
    scheduled, scheduled_error = _safe_inspect_call(inspect_control, "scheduled")
    reserved, reserved_error = _safe_inspect_call(inspect_control, "reserved")

    for error in [active_queue_error, active_error, scheduled_error, reserved_error]:
        if error:
            details.append(error)

    queue_names.update(_queue_names_from_active_queues(active_queues))
    queue_names.update(_count_tasks_by_queue(active).keys())
    queue_names.update(_count_tasks_by_queue(scheduled).keys())
    queue_names.update(_count_tasks_by_queue(reserved).keys())

    pending_counts, pending_error = _pending_counts(queue_names)
    if pending_error:
        details.append(pending_error)

    active_counts = _count_tasks_by_queue(active)
    scheduled_counts = _count_tasks_by_queue(scheduled)
    reserved_counts = _count_tasks_by_queue(reserved)
    status = WARNING if details else HEALTHY

    return AdminQueueListResponse(
        queues=[
            AdminQueueResponse(
                name=queue_name,
                pending_count=pending_counts.get(queue_name, 0),
                active_count=active_counts.get(queue_name) if active is not None else None,
                scheduled_count=scheduled_counts.get(queue_name) if scheduled is not None else None,
                reserved_count=reserved_counts.get(queue_name) if reserved is not None else None,
                status=status if details else None,
                details=_join_details(details),
            )
            for queue_name in sorted(queue_names)
        ],
        checked_at=checked_at,
        status=status,
        details=_join_details(details),
    )


def get_admin_workers() -> AdminWorkerListResponse:
    checked_at = _checked_at()
    details = []

    inspect_control = celery_app.control.inspect(timeout=1)
    ping, ping_error = _safe_inspect_call(inspect_control, "ping")
    active, active_error = _safe_inspect_call(inspect_control, "active")
    scheduled, scheduled_error = _safe_inspect_call(inspect_control, "scheduled")
    reserved, reserved_error = _safe_inspect_call(inspect_control, "reserved")
    stats, stats_error = _safe_inspect_call(inspect_control, "stats")
    active_queues, active_queue_error = _safe_inspect_call(inspect_control, "active_queues")

    for error in [
        ping_error,
        active_error,
        scheduled_error,
        reserved_error,
        stats_error,
        active_queue_error,
    ]:
        if error:
            details.append(error)

    if not ping:
        details.append("No Celery workers responded to inspect.")

    worker_names = set((ping or {}).keys())
    worker_names.update((active or {}).keys())
    worker_names.update((scheduled or {}).keys())
    worker_names.update((reserved or {}).keys())
    worker_names.update((stats or {}).keys())
    worker_names.update((active_queues or {}).keys())

    workers = []
    for worker_name in sorted(worker_names):
        worker_active = active.get(worker_name, []) if active is not None else None
        worker_reserved = reserved.get(worker_name, []) if reserved is not None else None
        worker_scheduled = scheduled.get(worker_name, []) if scheduled is not None else None
        worker_stats = stats.get(worker_name) if stats is not None else None
        worker_queues = active_queues.get(worker_name, []) if active_queues is not None else None

        worker_details = []
        if ping and worker_name not in ping:
            worker_details.append("Worker did not respond to ping.")

        if details:
            worker_status = WARNING
        else:
            worker_status = ACTIVE if len(worker_active or []) > 0 else IDLE

        workers.append(
            AdminWorkerResponse(
                id=worker_name,
                name=worker_name,
                status=worker_status,
                active_task_count=len(worker_active) if worker_active is not None else None,
                reserved_task_count=len(worker_reserved) if worker_reserved is not None else None,
                scheduled_task_count=len(worker_scheduled) if worker_scheduled is not None else None,
                processed_count=_processed_count(worker_stats),
                current_queues=sorted(_queue_names_from_active_queues({worker_name: worker_queues}))
                if worker_queues is not None
                else None,
                checked_at=checked_at,
                details=_join_details(worker_details) or (_join_details(details) if details else None),
            )
        )

    return AdminWorkerListResponse(
        workers=workers,
        checked_at=checked_at,
        status=WARNING if details else HEALTHY,
        details=_join_details(details),
    )


def get_admin_settings() -> AdminSettingsResponse:
    celery_enabled = bool(
        os.getenv("CELERY_BROKER_URL")
        or os.getenv("CELERY_RESULT_BACKEND")
        or celery_app.conf.broker_url
        or celery_app.conf.result_backend
    )

    return AdminSettingsResponse(
        categories=[
            AdminSettingsCategoryResponse(
                id="ocr",
                name="OCR",
                settings=[
                    _setting(
                        key="max_file_size",
                        label="Max File Size",
                        value=MAX_UPLOAD_SIZE,
                    ),
                    _setting(
                        key="supported_extensions",
                        label="Supported Extensions",
                        value=SUPPORTED_EXTENSIONS,
                    ),
                ],
            ),
            AdminSettingsCategoryResponse(
                id="llm",
                name="LLM",
                settings=[
                    _setting(
                        key="ollama_url",
                        label="Ollama URL",
                        value=_mask_url_credentials(settings.OLLAMA_URL),
                    ),
                    _setting(
                        key="default_model",
                        label="Default Model",
                        value=settings.DEFAULT_LLM_MODEL,
                    ),
                ],
            ),
            AdminSettingsCategoryResponse(
                id="embedding",
                name="Embedding",
                settings=[
                    _setting(
                        key="default_embedding_model",
                        label="Default Embedding Model",
                        value=settings.EMBEDDING_MODEL,
                    ),
                ],
            ),
            AdminSettingsCategoryResponse(
                id="worker",
                name="Worker",
                settings=[
                    _setting(
                        key="celery_enabled",
                        label="Celery Enabled",
                        value=celery_enabled,
                    ),
                    _setting(
                        key="redis_enabled",
                        label="Redis Enabled",
                        value=_redis_url() is not None,
                    ),
                ],
            ),
            AdminSettingsCategoryResponse(
                id="storage",
                name="Storage",
                settings=[
                    _setting(
                        key="storage_path",
                        label="Storage Path",
                        value=os.getenv("STORAGE_DIR", STORAGE_DIR),
                    ),
                ],
            ),
            AdminSettingsCategoryResponse(
                id="security",
                name="Security",
                settings=[
                    _setting(
                        key="jwt_algorithm",
                        label="JWT Algorithm",
                        value=ALGORITHM,
                    ),
                    _setting(
                        key="access_token_expire_minutes",
                        label="Access Token Expire Minutes",
                        value=ACCESS_TOKEN_EXPIRE_MINUTES,
                    ),
                ],
            ),
        ],
    )


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


def _date_start(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _date_end(value: date) -> datetime:
    return datetime.combine(value, time.max, tzinfo=timezone.utc)


def _latest_task_subquery():
    return (
        func.row_number()
        .over(
            partition_by=TaskTracker.document_id,
            order_by=(
                TaskTracker.updated_at.desc(),
                TaskTracker.id.desc(),
            ),
        )
        .label("row_number")
    )


def _build_latest_task_query(db: Session):
    latest_task = (
        db.query(
            TaskTracker.id.label("id"),
            TaskTracker.document_id.label("document_id"),
            TaskTracker.task_type.label("task_type"),
            TaskTracker.status.label("status"),
            TaskTracker.stage.label("stage"),
            TaskTracker.progress.label("progress"),
            TaskTracker.message.label("message"),
            TaskTracker.error_message.label("error_message"),
            TaskTracker.started_at.label("started_at"),
            TaskTracker.completed_at.label("completed_at"),
            TaskTracker.created_at.label("created_at"),
            TaskTracker.updated_at.label("updated_at"),
            _latest_task_subquery(),
        )
        .subquery()
    )
    return latest_task


def _owner_response(user: User) -> AdminOwnerResponse:
    return AdminOwnerResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


def _latest_task_response(row) -> AdminLatestTaskResponse | None:
    if row.task_id is None:
        return None

    return AdminLatestTaskResponse(
        id=row.task_id,
        task_type=row.task_type,
        status=row.task_status,
        stage=row.task_stage,
        progress=row.task_progress,
        message=row.task_message,
        error_message=row.task_error_message,
        started_at=row.task_started_at,
        completed_at=row.task_completed_at,
        created_at=row.task_created_at,
        updated_at=row.task_updated_at,
    )


def _document_list_item_response(row) -> AdminDocumentListItemResponse:
    return AdminDocumentListItemResponse(
        id=row.document_id,
        file_name=row.file_name,
        status=row.document_status,
        category=row.category,
        file_size=row.file_size,
        page_count=row.page_count,
        selected_embedding_model=row.selected_embedding_model,
        upload_at=row.upload_at,
        process_at=row.process_at,
        created_at=row.document_created_at,
        updated_at=row.document_updated_at,
        owner=AdminOwnerResponse(
            id=row.owner_id,
            email=row.owner_email,
            name=row.owner_name,
            role=row.owner_role,
        ),
        latest_task=_latest_task_response(row),
    )


def _task_document_response(row) -> AdminTaskDocumentResponse:
    return AdminTaskDocumentResponse(
        id=row.document_id,
        file_name=row.file_name,
        status=row.document_status,
        category=row.category,
        upload_at=row.upload_at,
        updated_at=row.document_updated_at,
    )


def _task_list_item_response(row) -> AdminTaskListItemResponse:
    return AdminTaskListItemResponse(
        id=row.task_id,
        task_type=row.task_type,
        status=row.task_status,
        stage=row.task_stage,
        progress=row.task_progress,
        message=row.task_message,
        error_message=row.task_error_message,
        started_at=row.task_started_at,
        completed_at=row.task_completed_at,
        created_at=row.task_created_at,
        updated_at=row.task_updated_at,
        document=_task_document_response(row),
        owner=AdminOwnerResponse(
            id=row.owner_id,
            email=row.owner_email,
            name=row.owner_name,
            role=row.owner_role,
        ),
    )


def _user_list_item_response(row) -> AdminUserListItemResponse:
    document_count = row.document_count or 0

    return AdminUserListItemResponse(
        id=row.user_id,
        name=row.name,
        email=row.email,
        role=row.role,
        status=row.status,
        last_active_at=row.last_active_at,
        suspended_at=row.suspended_at,
        suspended_reason=row.suspended_reason,
        document_count=document_count,
        upload_count=document_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _admin_user_item_response(user: User, document_count: int) -> AdminUserListItemResponse:
    return AdminUserListItemResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        last_active_at=user.last_active_at,
        suspended_at=user.suspended_at,
        suspended_reason=user.suspended_reason,
        document_count=document_count,
        upload_count=document_count,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _user_document_response(document: Document) -> AdminUserDocumentResponse:
    return AdminUserDocumentResponse(
        id=document.id,
        file_name=document.file_name,
        status=document.status,
        upload_at=document.upload_at,
    )


def _apply_document_filters(
    query,
    status: str | None,
    owner_id: UUID | None,
    search: str | None,
    uploaded_from: date | None,
    uploaded_to: date | None,
):
    if status:
        query = query.filter(Document.status == status)

    if owner_id:
        query = query.filter(Document.user_id == owner_id)

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.file_name.ilike(keyword),
                Document.category.ilike(keyword),
                User.name.ilike(keyword),
                User.email.ilike(keyword),
            )
        )

    if uploaded_from:
        query = query.filter(Document.upload_at >= _date_start(uploaded_from))

    if uploaded_to:
        query = query.filter(Document.upload_at <= _date_end(uploaded_to))

    return query


def _apply_task_filters(
    query,
    status: str | None,
    task_type: str | None,
    stage: str | None,
    document_id: UUID | None,
    owner_id: UUID | None,
    search: str | None,
    created_from: date | None,
    created_to: date | None,
):
    if status:
        query = query.filter(TaskTracker.status == status)

    if task_type:
        query = query.filter(TaskTracker.task_type == task_type)

    if stage:
        query = query.filter(TaskTracker.stage == stage)

    if document_id:
        query = query.filter(TaskTracker.document_id == document_id)

    if owner_id:
        query = query.filter(Document.user_id == owner_id)

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.file_name.ilike(keyword),
                User.name.ilike(keyword),
                User.email.ilike(keyword),
                TaskTracker.message.ilike(keyword),
                TaskTracker.error_message.ilike(keyword),
            )
        )

    if created_from:
        query = query.filter(TaskTracker.created_at >= _date_start(created_from))

    if created_to:
        query = query.filter(TaskTracker.created_at <= _date_end(created_to))

    return query


def _apply_user_filters(
    query,
    q: str | None,
    role: str | None,
    status: str | None,
):
    if q:
        search_text = q.strip()
        if search_text:
            keyword = f"%{search_text}%"
            query = query.filter(
                or_(
                    User.name.ilike(keyword),
                    User.email.ilike(keyword),
                )
            )

    if role:
        query = query.filter(User.role == role)

    if status:
        query = query.filter(User.status == status)

    return query


def _sort_expression(sort_by: str, sort_order: str):
    sort_columns = {
        "upload_at": Document.upload_at,
        "updated_at": Document.updated_at,
        "file_name": Document.file_name,
        "file_size": Document.file_size,
        "page_count": Document.page_count,
        "status": Document.status,
    }
    column = sort_columns.get(sort_by, Document.updated_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _task_sort_expression(sort_by: str, sort_order: str):
    sort_columns = {
        "created_at": TaskTracker.created_at,
        "updated_at": TaskTracker.updated_at,
        "started_at": TaskTracker.started_at,
        "completed_at": TaskTracker.completed_at,
        "progress": TaskTracker.progress,
        "status": TaskTracker.status,
        "task_type": TaskTracker.task_type,
    }
    column = sort_columns.get(sort_by, TaskTracker.updated_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _user_sort_expression(sort_by: str, sort_order: str, document_count_column):
    sort_columns = {
        "created_at": User.created_at,
        "updated_at": User.updated_at,
        "name": User.name,
        "email": User.email,
        "role": User.role,
        "status": User.status,
        "last_active_at": User.last_active_at,
        "document_count": document_count_column,
        "upload_count": document_count_column,
    }
    column = sort_columns.get(sort_by, User.created_at)

    if sort_order.lower() == "asc":
        return column.asc()

    return column.desc()


def _table_has_column(db: Session, table_name: str, column_name: str) -> bool:
    inspector = inspect(db.bind)
    return any(
        column["name"] == column_name
        for column in inspector.get_columns(table_name)
    )


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


def _log_level_statuses(level: str | None) -> list[str] | None:
    if level == LOG_LEVEL_ERROR:
        return [TaskStatus.FAILED]

    if level == LOG_LEVEL_SUCCESS:
        return [TaskStatus.COMPLETED]

    if level == LOG_LEVEL_INFO:
        return [TaskStatus.PENDING, TaskStatus.PROCESSING]

    if level == LOG_LEVEL_WARNING:
        return []

    return None


def _apply_log_filters(
    query,
    q: str | None,
    level: str | None,
    service: str | None,
    from_datetime: datetime | None,
    to_datetime: datetime | None,
):
    statuses = _log_level_statuses(level)
    if statuses is not None:
        if not statuses:
            return query.filter(False)
        query = query.filter(TaskTracker.status.in_(statuses))

    if service:
        query = query.filter(TaskTracker.task_type == service.strip())

    if q:
        search_text = q.strip()
        if search_text:
            keyword = f"%{search_text}%"
            query = query.filter(
                or_(
                    TaskTracker.task_type.ilike(keyword),
                    TaskTracker.status.ilike(keyword),
                    TaskTracker.stage.ilike(keyword),
                    TaskTracker.message.ilike(keyword),
                    TaskTracker.error_message.ilike(keyword),
                )
            )

    if from_datetime:
        query = query.filter(TaskTracker.updated_at >= from_datetime)

    if to_datetime:
        query = query.filter(TaskTracker.updated_at <= to_datetime)

    return query


def list_admin_logs(
    db: Session,
    q: str | None = None,
    level: str | None = None,
    service: str | None = None,
    from_datetime: datetime | None = None,
    to_datetime: datetime | None = None,
    page: int = 1,
    limit: int = 50,
) -> AdminLogListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    try:
        count_query = db.query(func.count(TaskTracker.id))
        count_query = _apply_log_filters(
            count_query,
            q=q,
            level=level,
            service=service,
            from_datetime=from_datetime,
            to_datetime=to_datetime,
        )
        total = count_query.scalar() or 0

        query = db.query(TaskTracker)
        query = _apply_log_filters(
            query,
            q=q,
            level=level,
            service=service,
            from_datetime=from_datetime,
            to_datetime=to_datetime,
        )
        tasks = (
            query.order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        return AdminLogListResponse(
            items=[_task_log_item(task) for task in tasks],
            pagination=AdminPaginationResponse(
                page=page,
                limit=limit,
                total=total,
                total_pages=ceil(total / limit) if total else 0,
            ),
            warning_message=LOG_QUERY_WARNING,
        )
    except Exception as error:
        return AdminLogListResponse(
            items=[],
            pagination=AdminPaginationResponse(
                page=page,
                limit=limit,
                total=0,
                total_pages=0,
            ),
            warning_message=f"로그 조회에 실패했습니다. {_mask_sensitive(_exception_details(error))}",
        )


def get_admin_logs_summary(db: Session) -> AdminLogSummaryResponse:
    try:
        counts = _count_by(db, TaskTracker, TaskTracker.status)
        info = counts.get(TaskStatus.PENDING, 0) + counts.get(TaskStatus.PROCESSING, 0)
        error = counts.get(TaskStatus.FAILED, 0)
        success = counts.get(TaskStatus.COMPLETED, 0)
        warning = 0
        total = info + warning + error + success

        recent_errors = (
            db.query(TaskTracker)
            .filter(TaskTracker.status == TaskStatus.FAILED)
            .order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
            .limit(10)
            .all()
        )

        return AdminLogSummaryResponse(
            total=total,
            info=info,
            warning=warning,
            error=error,
            success=success,
            recent_errors=[_task_log_item(task) for task in recent_errors],
            warning_message=LOG_QUERY_WARNING,
        )
    except Exception as error:
        return AdminLogSummaryResponse(
            total=0,
            info=0,
            warning=0,
            error=0,
            success=0,
            recent_errors=[],
            warning_message=f"로그 요약 조회에 실패했습니다. {_mask_sensitive(_exception_details(error))}",
        )


def get_system_health(db: Session) -> AdminSystemHealthResponse:
    return AdminSystemHealthResponse(
        services=[
            _check_api_health(),
            _check_postgres_health(db),
            _check_redis_health(),
            _check_ollama_health(),
            _check_storage_health(),
            _check_celery_health(),
        ]
    )


def _user_document_count_subquery(db: Session):
    return (
        db.query(
            Document.user_id.label("user_id"),
            func.count(Document.id).label("document_count"),
        )
        .group_by(Document.user_id)
        .subquery()
    )


def list_admin_users(
    db: Session,
    q: str | None = None,
    role: str | None = None,
    status: str | None = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> AdminUserListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = db.query(func.count(User.id))
    count_query = _apply_user_filters(
        count_query,
        q=q,
        role=role,
        status=status,
    )
    total = count_query.scalar() or 0

    document_counts = _user_document_count_subquery(db)
    document_count_column = func.coalesce(document_counts.c.document_count, 0)
    query = (
        db.query(
            User.id.label("user_id"),
            User.name.label("name"),
            User.email.label("email"),
            User.role.label("role"),
            User.status.label("status"),
            User.last_active_at.label("last_active_at"),
            User.suspended_at.label("suspended_at"),
            User.suspended_reason.label("suspended_reason"),
            User.created_at.label("created_at"),
            User.updated_at.label("updated_at"),
            document_count_column.label("document_count"),
        )
        .outerjoin(document_counts, document_counts.c.user_id == User.id)
    )
    query = _apply_user_filters(
        query,
        q=q,
        role=role,
        status=status,
    )
    rows = (
        query.order_by(_user_sort_expression(sort_by, sort_order, document_count_column), User.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminUserListResponse(
        items=[_user_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_user_detail(
    db: Session,
    user_id: UUID,
) -> AdminUserDetailResponse | None:
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return None

    documents = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.upload_at.desc(), Document.id.desc())
        .all()
    )
    document_count = len(documents)
    recent_task_rows = (
        _base_task_query(db)
        .filter(User.id == user.id)
        .order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
        .limit(10)
        .all()
    )

    return AdminUserDetailResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        last_active_at=user.last_active_at,
        suspended_at=user.suspended_at,
        suspended_reason=user.suspended_reason,
        document_count=document_count,
        upload_count=document_count,
        created_at=user.created_at,
        updated_at=user.updated_at,
        documents=[_user_document_response(document) for document in documents],
        recent_tasks=[_task_list_item_response(row) for row in recent_task_rows],
    )


def update_admin_user_role(
    db: Session,
    user_id: UUID,
    new_role: str,
    current_user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[AdminUserListItemResponse | None, str | None]:
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return None, None

    if user.role == UserRole.ADMIN and new_role == UserRole.USER:
        admin_count = (
            db.query(func.count(User.id))
            .filter(User.role == UserRole.ADMIN)
            .scalar()
            or 0
        )

        if admin_count <= 1:
            return None, ROLE_UPDATE_LAST_ADMIN

        if user.id == current_user.id:
            return None, ROLE_UPDATE_SELF_DEMOTION

    if user.role != new_role:
        old_role = user.role
        user.role = new_role
        record_admin_action(
            db=db,
            actor_user=current_user,
            action=AuditAction.USER_ROLE_CHANGED,
            target_type=AuditTargetType.USER,
            target_id=user.id,
            old_value={"role": old_role},
            new_value={"role": new_role},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.commit()
        db.refresh(user)

    document_count = (
        db.query(func.count(Document.id))
        .filter(Document.user_id == user.id)
        .scalar()
        or 0
    )

    return _admin_user_item_response(user, document_count), None


def update_admin_user_status(
    db: Session,
    user_id: UUID,
    new_status: str,
    reason: str | None,
    current_user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[AdminUserListItemResponse | None, str | None]:
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return None, None

    if new_status == UserStatus.SUSPENDED:
        if user.role == UserRole.ADMIN:
            active_admin_count = (
                db.query(func.count(User.id))
                .filter(
                    User.role == UserRole.ADMIN,
                    User.status != UserStatus.SUSPENDED,
                )
                .scalar()
                or 0
            )

            if user.status != UserStatus.SUSPENDED and active_admin_count <= 1:
                return None, STATUS_UPDATE_LAST_ADMIN

        if user.id == current_user.id:
            return None, STATUS_UPDATE_SELF_SUSPEND

    old_status = user.status
    old_suspended_reason = user.suspended_reason
    new_suspended_reason = reason.strip() if reason and reason.strip() else None

    if user.status != new_status:
        user.status = new_status

    if new_status == UserStatus.SUSPENDED:
        user.suspended_at = func.now()
        user.suspended_reason = new_suspended_reason
    else:
        user.suspended_at = None
        user.suspended_reason = None

    if old_status != new_status or old_suspended_reason != user.suspended_reason:
        new_value = {"status": new_status}
        if new_status == UserStatus.SUSPENDED:
            new_value["suspended_reason"] = user.suspended_reason

        record_admin_action(
            db=db,
            actor_user=current_user,
            action=AuditAction.USER_STATUS_CHANGED,
            target_type=AuditTargetType.USER,
            target_id=user.id,
            old_value={"status": old_status},
            new_value=new_value,
            reason=user.suspended_reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    db.commit()
    db.refresh(user)

    document_count = (
        db.query(func.count(Document.id))
        .filter(Document.user_id == user.id)
        .scalar()
        or 0
    )

    return _admin_user_item_response(user, document_count), None


def list_admin_documents(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    uploaded_from: date | None = None,
    uploaded_to: date | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> AdminDocumentListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = db.query(func.count(Document.id)).join(User)
    count_query = _apply_document_filters(
        count_query,
        status=status,
        owner_id=owner_id,
        search=search,
        uploaded_from=uploaded_from,
        uploaded_to=uploaded_to,
    )
    total = count_query.scalar() or 0

    latest_task = _build_latest_task_query(db)
    query = (
        db.query(
            Document.id.label("document_id"),
            Document.file_name.label("file_name"),
            Document.status.label("document_status"),
            Document.category.label("category"),
            Document.file_size.label("file_size"),
            Document.page_count.label("page_count"),
            Document.selected_embedding_model.label("selected_embedding_model"),
            Document.upload_at.label("upload_at"),
            Document.process_at.label("process_at"),
            Document.created_at.label("document_created_at"),
            Document.updated_at.label("document_updated_at"),
            User.id.label("owner_id"),
            User.email.label("owner_email"),
            User.name.label("owner_name"),
            User.role.label("owner_role"),
            latest_task.c.id.label("task_id"),
            latest_task.c.task_type.label("task_type"),
            latest_task.c.status.label("task_status"),
            latest_task.c.stage.label("task_stage"),
            latest_task.c.progress.label("task_progress"),
            latest_task.c.message.label("task_message"),
            latest_task.c.error_message.label("task_error_message"),
            latest_task.c.started_at.label("task_started_at"),
            latest_task.c.completed_at.label("task_completed_at"),
            latest_task.c.created_at.label("task_created_at"),
            latest_task.c.updated_at.label("task_updated_at"),
        )
        .join(User)
        .outerjoin(
            latest_task,
            and_(
                latest_task.c.document_id == Document.id,
                latest_task.c.row_number == 1,
            ),
        )
    )
    query = _apply_document_filters(
        query,
        status=status,
        owner_id=owner_id,
        search=search,
        uploaded_from=uploaded_from,
        uploaded_to=uploaded_to,
    )
    rows = (
        query.order_by(_sort_expression(sort_by, sort_order), Document.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminDocumentListResponse(
        items=[_document_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_document_detail(
    db: Session,
    document_id: UUID,
) -> AdminDocumentDetailResponse | None:
    document = (
        db.query(Document)
        .options(joinedload(Document.user))
        .filter(Document.id == document_id)
        .first()
    )

    if document is None:
        return None

    latest_task = (
        db.query(TaskTracker)
        .filter(TaskTracker.document_id == document.id)
        .order_by(TaskTracker.updated_at.desc(), TaskTracker.id.desc())
        .first()
    )
    chunk_count = (
        db.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.document_id == document.id)
        .scalar()
        or 0
    )
    keywords = []
    if _table_has_column(db, DocumentChunk.__tablename__, "keywords"):
        chunk_keywords = (
            db.query(DocumentChunk.keywords)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )

        for row_keywords, in chunk_keywords:
            for keyword in row_keywords or []:
                if keyword and keyword not in keywords:
                    keywords.append(keyword)

    return AdminDocumentDetailResponse(
        id=document.id,
        file_name=document.file_name,
        status=document.status,
        category=document.category,
        file_size=document.file_size,
        page_count=document.page_count,
        selected_embedding_model=document.selected_embedding_model,
        upload_at=document.upload_at,
        process_at=document.process_at,
        created_at=document.created_at,
        updated_at=document.updated_at,
        owner=_owner_response(document.user),
        latest_task=AdminLatestTaskResponse(
            id=latest_task.id,
            task_type=latest_task.task_type,
            status=latest_task.status,
            stage=latest_task.stage,
            progress=latest_task.progress,
            message=latest_task.message,
            error_message=latest_task.error_message,
            started_at=latest_task.started_at,
            completed_at=latest_task.completed_at,
            created_at=latest_task.created_at,
            updated_at=latest_task.updated_at,
        )
        if latest_task
        else None,
        summary=document.summary,
        chunk_count=chunk_count,
        keywords=keywords,
    )


def _document_cleanup_paths(storage_path: str | None) -> list[Path]:
    if not storage_path:
        return []

    original_path = Path(storage_path)
    paths = [
        original_path,
        original_path.with_suffix(".md"),
        original_path.with_suffix(".txt"),
        original_path.with_suffix(".json"),
        original_path.with_name(f"{original_path.stem}.ocr.md"),
        original_path.with_name(f"{original_path.stem}.ocr.txt"),
        original_path.with_name(f"{original_path.stem}.ocr.json"),
        original_path.with_name(f"{original_path.stem}_ocr.md"),
        original_path.with_name(f"{original_path.stem}_ocr.txt"),
        original_path.with_name(f"{original_path.stem}_ocr.json"),
        original_path.with_name(f"{original_path.stem}_ocr"),
        original_path.with_name(f"{original_path.stem}.ocr"),
    ]

    unique_paths = []
    seen = set()
    for path in paths:
        path_key = str(path)
        if path_key not in seen:
            seen.add(path_key)
            unique_paths.append(path)

    return unique_paths


def _delete_storage_path_if_exists(path: Path) -> None:
    try:
        if path.is_dir():
            shutil.rmtree(path)
            return

        path.unlink()
    except FileNotFoundError:
        return


def delete_admin_document(
    db: Session,
    document_id: UUID,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AdminDocumentDeleteResponse | None:
    document = db.query(Document).filter(Document.id == document_id).first()

    if document is None:
        return None

    old_value = {
        "document_id": str(document.id),
        "file_name": document.file_name,
        "status": document.status,
    }
    cleanup_paths = _document_cleanup_paths(document.storage_path)
    response = AdminDocumentDeleteResponse(
        document_id=document.id,
        file_name=document.file_name,
        deleted=True,
        message=DOCUMENT_DELETE_MESSAGE,
    )

    for path in cleanup_paths:
        _delete_storage_path_if_exists(path)

    record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_DELETED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document.id,
        old_value=old_value,
        new_value={"deleted": True},
        reason="Admin deleted document.",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.delete(document)
    db.commit()

    return response


class AdminDocumentRetryError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def _normalize_document_retry_stage(retry_from_stage: str) -> str:
    return (retry_from_stage or "").strip().upper()


def _document_has_running_task(db: Session, document_id: UUID) -> bool:
    return (
        db.query(TaskTracker.id)
        .filter(
            TaskTracker.document_id == document_id,
            TaskTracker.status.in_([TaskStatus.PENDING, TaskStatus.PROCESSING]),
        )
        .first()
        is not None
    )


def _clear_document_retry_artifacts(
    db: Session,
    document: Document,
    retry_from_stage: str,
) -> list[str]:
    cleared_artifacts = []

    if retry_from_stage == DOCUMENT_RETRY_STAGE_OCR:
        document.ocr_markdown = None
        cleared_artifacts.append("ocr_markdown")

    document.summary = None
    cleared_artifacts.append("summary")

    db.query(DocumentEmbedding).filter(
        DocumentEmbedding.document_id == document.id,
    ).delete(synchronize_session=False)

    db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document.id,
    ).delete(synchronize_session=False)
    cleared_artifacts.append("chunks")
    cleared_artifacts.append("embeddings")

    return cleared_artifacts


def retry_admin_document_from_stage(
    db: Session,
    document_id: UUID,
    retry_from_stage: str,
    reason: str | None,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AdminDocumentRetryResponse:
    retry_stage = _normalize_document_retry_stage(retry_from_stage)
    if retry_stage not in DOCUMENT_RETRY_FROM_STAGES:
        raise AdminDocumentRetryError(400, "지원하지 않는 재처리 단계입니다.")

    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise AdminDocumentRetryError(404, "문서를 찾을 수 없습니다.")

    previous_status = document.status
    if previous_status not in DOCUMENT_RETRY_ALLOWED_STATUSES:
        raise AdminDocumentRetryError(409, "재처리할 수 없는 문서 상태입니다.")

    if _document_has_running_task(db=db, document_id=document.id):
        raise AdminDocumentRetryError(409, "이미 실행 중인 문서 작업이 있습니다.")

    if retry_stage == DOCUMENT_RETRY_STAGE_SUMMARY and not document.ocr_markdown:
        raise AdminDocumentRetryError(400, "OCR Markdown 결과가 없습니다.")

    cleared_artifacts = _clear_document_retry_artifacts(
        db=db,
        document=document,
        retry_from_stage=retry_stage,
    )
    db.commit()

    retry_task = None
    try:
        if retry_stage == DOCUMENT_RETRY_STAGE_OCR:
            retry_task = create_document_task(
                db=db,
                document_id=document.id,
                task_type=TaskType.OCR,
                stage=TaskStage.OCR_PENDING,
                message="문서 OCR 재처리 작업 대기 중입니다.",
            )
            async_result = process_document_ocr.delay(
                str(document.id),
                str(retry_task.id),
            )
        else:
            retry_task = create_document_task(
                db=db,
                document_id=document.id,
                task_type=TaskType.SUMMARY,
                stage=TaskStage.SUMMARY_PENDING,
                message="문서 요약 재처리 작업 대기 중입니다.",
            )
            async_result = process_document_summary.delay(
                str(document.id),
                str(retry_task.id),
            )
    except Exception as error:
        if retry_task is not None:
            retry_task.status = TaskStatus.FAILED
            retry_task.stage = TaskStage.FAILED
            retry_task.message = "문서 재처리 작업 등록 중 오류가 발생했습니다."
            retry_task.error_message = str(error)
            retry_task.completed_at = datetime.now(timezone.utc)
            db.commit()
        raise

    attach_celery_task_id(
        db=db,
        task_id=retry_task.id,
        celery_task_id=async_result.id,
    )

    document.status = DocumentStatus.PROCESSING
    db.commit()
    db.refresh(document)
    db.refresh(retry_task)

    record_document_reprocess_requested(
        db=db,
        actor=actor,
        document_id=document.id,
        previous_status=previous_status,
        retry_task_id=retry_task.id,
        retry_from_stage=retry_stage,
        status=document.status,
        cleared_artifacts=cleared_artifacts,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.commit()

    return AdminDocumentRetryResponse(
        document_id=document.id,
        retry_task_id=retry_task.id,
        retry_from_stage=retry_stage,
        previous_status=previous_status,
        status=document.status,
        cleared_artifacts=cleared_artifacts,
        message=DOCUMENT_REPROCESS_REGISTERED_MESSAGE,
    )


def _base_task_query(db: Session):
    return (
        db.query(
            TaskTracker.id.label("task_id"),
            TaskTracker.task_type.label("task_type"),
            TaskTracker.status.label("task_status"),
            TaskTracker.stage.label("task_stage"),
            TaskTracker.progress.label("task_progress"),
            TaskTracker.message.label("task_message"),
            TaskTracker.error_message.label("task_error_message"),
            TaskTracker.started_at.label("task_started_at"),
            TaskTracker.completed_at.label("task_completed_at"),
            TaskTracker.created_at.label("task_created_at"),
            TaskTracker.updated_at.label("task_updated_at"),
            Document.id.label("document_id"),
            Document.file_name.label("file_name"),
            Document.status.label("document_status"),
            Document.category.label("category"),
            Document.upload_at.label("upload_at"),
            Document.updated_at.label("document_updated_at"),
            User.id.label("owner_id"),
            User.email.label("owner_email"),
            User.name.label("owner_name"),
            User.role.label("owner_role"),
        )
        .join(Document, TaskTracker.document_id == Document.id)
        .join(User, Document.user_id == User.id)
    )


def list_admin_tasks(
    db: Session,
    page: int = 1,
    limit: int = 20,
    status: str | None = None,
    task_type: str | None = None,
    stage: str | None = None,
    document_id: UUID | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
) -> AdminTaskListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    count_query = (
        db.query(func.count(TaskTracker.id))
        .join(Document, TaskTracker.document_id == Document.id)
        .join(User, Document.user_id == User.id)
    )
    count_query = _apply_task_filters(
        count_query,
        status=status,
        task_type=task_type,
        stage=stage,
        document_id=document_id,
        owner_id=owner_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
    )
    total = count_query.scalar() or 0

    query = _base_task_query(db)
    query = _apply_task_filters(
        query,
        status=status,
        task_type=task_type,
        stage=stage,
        document_id=document_id,
        owner_id=owner_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
    )
    rows = (
        query.order_by(_task_sort_expression(sort_by, sort_order), TaskTracker.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminTaskListResponse(
        items=[_task_list_item_response(row) for row in rows],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def get_admin_task_detail(
    db: Session,
    task_id: UUID,
) -> AdminTaskDetailResponse | None:
    row = (
        _base_task_query(db)
        .filter(TaskTracker.id == task_id)
        .first()
    )

    if row is None:
        return None

    item = _task_list_item_response(row)
    return AdminTaskDetailResponse(**item.dict())


class AdminTaskRetryError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def retry_failed_task(
    db: Session,
    task_id: UUID,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AdminTaskRetryResponse:
    original_task = (
        db.query(TaskTracker)
        .options(joinedload(TaskTracker.document))
        .filter(TaskTracker.id == task_id)
        .first()
    )

    if original_task is None:
        raise AdminTaskRetryError(404, "작업을 찾을 수 없습니다.")

    if original_task.status != TaskStatus.FAILED:
        raise AdminTaskRetryError(409, "실패한 작업만 재시도할 수 있습니다.")

    if original_task.task_type not in {TaskType.OCR, TaskType.SUMMARY}:
        raise AdminTaskRetryError(400, "지원하지 않는 작업 유형입니다.")

    document = original_task.document
    if document is None:
        raise AdminTaskRetryError(404, "문서를 찾을 수 없습니다.")

    running_task = (
        db.query(TaskTracker)
        .filter(
            TaskTracker.document_id == original_task.document_id,
            TaskTracker.task_type == original_task.task_type,
            TaskTracker.status.in_([TaskStatus.PENDING, TaskStatus.PROCESSING]),
        )
        .first()
    )
    if running_task is not None:
        raise AdminTaskRetryError(409, "이미 실행 중인 동일 유형 작업이 있습니다.")

    retry_task = None
    try:
        if original_task.task_type == TaskType.OCR:
            retry_task = create_document_task(
                db=db,
                document_id=document.id,
                task_type=TaskType.OCR,
                stage=TaskStage.OCR_PENDING,
                message="OCR 재시도 작업 대기 중입니다.",
            )
            async_result = process_document_ocr.delay(
                str(document.id),
                str(retry_task.id),
            )
        else:
            if not document.ocr_markdown:
                raise AdminTaskRetryError(400, "OCR Markdown 결과가 없습니다.")

            retry_task = create_document_task(
                db=db,
                document_id=document.id,
                task_type=TaskType.SUMMARY,
                stage=TaskStage.SUMMARY_PENDING,
                message="요약 재시도 작업 대기 중입니다.",
            )
            async_result = process_document_summary.delay(
                str(document.id),
                str(retry_task.id),
            )
    except AdminTaskRetryError:
        raise
    except Exception as error:
        if retry_task is not None:
            retry_task.status = TaskStatus.FAILED
            retry_task.stage = TaskStage.FAILED
            retry_task.message = "재시도 작업 등록 중 오류가 발생했습니다."
            retry_task.error_message = str(error)
            retry_task.completed_at = datetime.now(timezone.utc)
            db.commit()
        raise

    attach_celery_task_id(
        db=db,
        task_id=retry_task.id,
        celery_task_id=async_result.id,
    )

    document.status = DocumentStatus.PROCESSING
    db.commit()
    db.refresh(retry_task)

    record_failed_task_retry(
        db=db,
        actor=actor,
        target_task_id=original_task.id,
        retry_task_id=retry_task.id,
        document_id=document.id,
        task_type=original_task.task_type,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return AdminTaskRetryResponse(
        original_task_id=original_task.id,
        retry_task_id=retry_task.id,
        document_id=document.id,
        task_type=retry_task.task_type,
        status=retry_task.status,
        message=RETRY_REGISTERED_MESSAGE,
    )
