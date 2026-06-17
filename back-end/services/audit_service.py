from datetime import datetime
from math import ceil
import re
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.audit_log import AuditAction
from models.audit_log import AuditLog
from models.audit_log import AuditTargetType
from models.user import User
from schemas.admin import AdminAuditLogItemResponse
from schemas.admin import AdminAuditLogListResponse
from schemas.admin import AdminPaginationResponse


SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "hashed_password",
    "jwt",
    "access_token",
    "refresh_token",
    "secret",
    "secret_key",
    "api_key",
    "token",
    "database_url",
    "redis_url",
    "storage_path",
    "file_path",
    "path",
}

SENSITIVE_TEXT_PATTERNS = [
    re.compile(
        r"(?i)(authorization\s*[:=]\s*(?:bearer\s+)?)([^\s,;]+)"
    ),
    re.compile(
        r"(?i)((?:jwt|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password)\s*[:=]\s*)([^\s,;&]+)"
    ),
    re.compile(
        r"(?i)((?:postgresql|postgres|mysql|redis)://)([^\s]+)"
    ),
]
INTERNAL_PATH_PATTERN = re.compile(
    r"(?<!\w)(/(?:Users|private|storage|var|tmp|app|code|workspace)/[^\s,;:]+)"
)


def _sanitize_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(sensitive_key in normalized for sensitive_key in SENSITIVE_KEYS)


def _sanitize_string(value: str) -> str:
    sanitized = value
    for pattern in SENSITIVE_TEXT_PATTERNS:
        sanitized = pattern.sub(r"\1***MASKED***", sanitized)

    return INTERNAL_PATH_PATTERN.sub("***MASKED_PATH***", sanitized)


def sanitize_audit_value(value):
    if value is None:
        return None

    if isinstance(value, dict):
        return {
            key: "***MASKED***" if _sanitize_key(str(key)) else sanitize_audit_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [sanitize_audit_value(item) for item in value]

    if isinstance(value, str):
        return _sanitize_string(value)

    return value


def _truncate(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None

    return value[:max_length]


def record_admin_action(
    db: Session,
    actor_user: User,
    action: str,
    target_type: str,
    target_id: UUID | None,
    old_value: dict | None,
    new_value: dict | None,
    reason: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        actor_user_id=actor_user.id if actor_user else None,
        actor_email_snapshot=actor_user.email if actor_user else None,
        target_type=target_type,
        target_id=target_id,
        action=action,
        old_value=sanitize_audit_value(old_value),
        new_value=sanitize_audit_value(new_value),
        reason=_truncate(sanitize_audit_value(reason), 1000),
        ip_address=_truncate(sanitize_audit_value(ip_address), 64),
        user_agent=_truncate(sanitize_audit_value(user_agent), 500),
        metadata_json=sanitize_audit_value(metadata),
    )
    db.add(audit_log)
    return audit_log


def record_failed_task_retry(
    db: Session,
    actor: User,
    target_task_id: UUID,
    retry_task_id: UUID,
    document_id: UUID,
    task_type: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    return record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.FAILED_TASK_RETRY,
        target_type=AuditTargetType.TASK,
        target_id=target_task_id,
        old_value={
            "task_id": str(target_task_id),
            "task_type": task_type,
            "status": "FAILED",
        },
        new_value={
            "retry_task_id": str(retry_task_id),
            "document_id": str(document_id),
            "task_type": task_type,
            "status": "PENDING",
        },
        reason="Admin requested failed task retry.",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "document_id": str(document_id),
            "retry_task_id": str(retry_task_id),
        },
    )


def record_document_reprocess_requested(
    db: Session,
    actor: User,
    document_id: UUID,
    previous_status: str,
    retry_task_id: UUID,
    retry_from_stage: str,
    status: str,
    cleared_artifacts: list[str],
    reason: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    metadata_json = {
        "cleared_artifacts": cleared_artifacts,
    }
    if metadata:
        metadata_json.update(metadata)

    return record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_REPROCESS_REQUESTED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document_id,
        old_value={
            "document_id": str(document_id),
            "status": previous_status,
        },
        new_value={
            "retry_task_id": str(retry_task_id),
            "retry_from_stage": retry_from_stage,
            "status": status,
        },
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata_json,
    )


def record_document_exported(
    db: Session,
    actor: User,
    document_id: UUID,
    file_name: str,
    status: str,
    export_format: str,
    content_type: str,
    file_size: int,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    return record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.DOCUMENT_EXPORTED,
        target_type=AuditTargetType.DOCUMENT,
        target_id=document_id,
        old_value={
            "document_id": str(document_id),
            "file_name": file_name,
            "status": status,
        },
        new_value={
            "exported": True,
            "format": export_format,
        },
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "format": export_format,
            "content_type": content_type,
            "file_size": file_size,
        },
    )


def _audit_log_response(audit_log: AuditLog) -> AdminAuditLogItemResponse:
    return AdminAuditLogItemResponse(
        id=audit_log.id,
        actor_user_id=audit_log.actor_user_id,
        actor_email_snapshot=audit_log.actor_email_snapshot,
        target_type=audit_log.target_type,
        target_id=audit_log.target_id,
        action=audit_log.action,
        old_value=audit_log.old_value,
        new_value=audit_log.new_value,
        reason=audit_log.reason,
        ip_address=audit_log.ip_address,
        user_agent=audit_log.user_agent,
        metadata=audit_log.metadata_json,
        created_at=audit_log.created_at,
    )


def list_admin_audit_logs(
    db: Session,
    action: str | None = None,
    actor_user_id: UUID | None = None,
    target_type: str | None = None,
    target_id: UUID | None = None,
    from_datetime: datetime | None = None,
    to_datetime: datetime | None = None,
    page: int = 1,
    limit: int = 50,
) -> AdminAuditLogListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    if actor_user_id:
        query = query.filter(AuditLog.actor_user_id == actor_user_id)

    if target_type:
        query = query.filter(AuditLog.target_type == target_type)

    if target_id:
        query = query.filter(AuditLog.target_id == target_id)

    if from_datetime:
        query = query.filter(AuditLog.created_at >= from_datetime)

    if to_datetime:
        query = query.filter(AuditLog.created_at <= to_datetime)

    total = query.with_entities(func.count(AuditLog.id)).scalar() or 0
    audit_logs = (
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminAuditLogListResponse(
        items=[_audit_log_response(audit_log) for audit_log in audit_logs],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )
