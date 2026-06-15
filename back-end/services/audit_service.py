from uuid import UUID

from math import ceil

from sqlalchemy.orm import Session

from models.audit_log import AuditLog
from models.user import User
from schemas.admin import AdminAuditLogItemResponse
from schemas.admin import AdminAuditLogListResponse
from schemas.admin import AdminPaginationResponse


AUDIT_ACTION_FAILED_TASK_RETRY = "FAILED_TASK_RETRY"
AUDIT_TARGET_TASK = "TASK"


def _audit_log_item_response(audit_log: AuditLog) -> AdminAuditLogItemResponse:
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


def list_audit_logs(
    db: Session,
    page: int = 1,
    limit: int = 50,
    action: str | None = None,
    target_type: str | None = None,
) -> AdminAuditLogListResponse:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return AdminAuditLogListResponse(
        items=[_audit_log_item_response(item) for item in items],
        pagination=AdminPaginationResponse(
            page=page,
            limit=limit,
            total=total,
            total_pages=ceil(total / limit) if total else 0,
        ),
    )


def record_failed_task_retry(
    db: Session,
    actor: User,
    target_task_id: UUID,
    retry_task_id: UUID,
    document_id: UUID,
    task_type: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    audit_log = AuditLog(
        actor_user_id=actor.id,
        actor_email_snapshot=actor.email,
        target_type=AUDIT_TARGET_TASK,
        target_id=target_task_id,
        action=AUDIT_ACTION_FAILED_TASK_RETRY,
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
        metadata_json={
            "document_id": str(document_id),
            "retry_task_id": str(retry_task_id),
        },
    )
    db.add(audit_log)
    db.commit()
