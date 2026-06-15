from datetime import date
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from db.session import get_db
from models.audit_log import AuditAction
from models.audit_log import AuditTargetType
from models.document import DocumentStatus
from models.task_tracker import TaskStage
from models.task_tracker import TaskStatus
from models.task_tracker import TaskType
from models.user import User
from models.user import UserRole
from models.user import UserStatus
from routers.deps import require_admin
from schemas.admin import AdminAuditLogListResponse
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentDeleteResponse
from schemas.admin import AdminDocumentListResponse
from schemas.admin import AdminDocumentRetryRequest
from schemas.admin import AdminDocumentRetryResponse
from schemas.admin import AdminLogListResponse
from schemas.admin import AdminLogSummaryResponse
from schemas.admin import AdminQueueListResponse
from schemas.admin import AdminSettingsResponse
from schemas.admin import AdminSystemHealthResponse
from schemas.admin import AdminTaskDetailResponse
from schemas.admin import AdminTaskListResponse
from schemas.admin import AdminTaskRetryResponse
from schemas.admin import AdminUserDetailResponse
from schemas.admin import AdminUserListItemResponse
from schemas.admin import AdminUserListResponse
from schemas.admin import AdminUserRoleUpdateRequest
from schemas.admin import AdminUserStatusUpdateRequest
from schemas.admin import AdminWorkerListResponse
from services.audit_service import list_admin_audit_logs
from services.admin_service import delete_admin_document
from services.admin_service import get_admin_document_detail
from services.admin_service import get_admin_logs_summary
from services.admin_service import get_admin_queues
from services.admin_service import get_admin_settings
from services.admin_service import get_admin_task_detail
from services.admin_service import get_admin_user_detail
from services.admin_service import get_admin_workers
from services.admin_service import get_dashboard_summary
from services.admin_service import get_system_health
from services.admin_service import ROLE_UPDATE_LAST_ADMIN
from services.admin_service import ROLE_UPDATE_SELF_DEMOTION
from services.admin_service import STATUS_UPDATE_LAST_ADMIN
from services.admin_service import STATUS_UPDATE_SELF_SUSPEND
from services.admin_service import list_admin_documents
from services.admin_service import list_admin_logs
from services.admin_service import list_admin_tasks
from services.admin_service import list_admin_users
from services.admin_service import AdminDocumentExportError
from services.admin_service import AdminTaskRetryError
from services.admin_service import AdminDocumentRetryError
from services.admin_service import prepare_admin_document_original_export
from services.admin_service import retry_admin_document_from_stage
from services.admin_service import retry_failed_task
from services.admin_service import update_admin_user_role
from services.admin_service import update_admin_user_status


router = APIRouter()
DOCUMENT_STATUSES = {
    DocumentStatus.PENDING,
    DocumentStatus.PROCESSING,
    DocumentStatus.REVIEW_REQUIRED,
    DocumentStatus.COMPLETED,
    DocumentStatus.FAILED,
}
DOCUMENT_SORT_FIELDS = {
    "upload_at",
    "updated_at",
    "file_name",
    "file_size",
    "page_count",
    "status",
}
TASK_STATUSES = {
    TaskStatus.PENDING,
    TaskStatus.PROCESSING,
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
}
TASK_TYPES = {
    TaskType.OCR,
    TaskType.SUMMARY,
    TaskType.EMBEDDING,
    TaskType.RAG_INDEXING,
}
TASK_STAGES = {
    TaskStage.UPLOAD_COMPLETED,
    TaskStage.OCR_PENDING,
    TaskStage.OCR_PROCESSING,
    TaskStage.OCR_COMPLETED,
    TaskStage.MARKDOWN_REVIEW,
    TaskStage.SUMMARY_PENDING,
    TaskStage.CHUNKING_PROCESSING,
    TaskStage.CHUNKING_COMPLETED,
    TaskStage.EMBEDDING_PROCESSING,
    TaskStage.EMBEDDING_COMPLETED,
    TaskStage.SUMMARY_PROCESSING,
    TaskStage.SUMMARY_COMPLETED,
    TaskStage.RAG_INDEXING,
    TaskStage.RAG_READY,
    TaskStage.FAILED,
}
TASK_SORT_FIELDS = {
    "created_at",
    "updated_at",
    "started_at",
    "completed_at",
    "progress",
    "status",
    "task_type",
}
USER_ROLES = {
    UserRole.USER,
    UserRole.ADMIN,
}
USER_STATUSES = {
    UserStatus.ACTIVE,
    UserStatus.SUSPENDED,
    UserStatus.INACTIVE,
}
USER_SORT_FIELDS = {
    "created_at",
    "updated_at",
    "name",
    "email",
    "role",
    "status",
    "last_active_at",
    "document_count",
    "upload_count",
}
LOG_LEVELS = {
    "INFO",
    "WARNING",
    "ERROR",
    "SUCCESS",
}
AUDIT_ACTIONS = {
    AuditAction.USER_ROLE_CHANGED,
    AuditAction.USER_STATUS_CHANGED,
    AuditAction.DOCUMENT_DELETED,
    AuditAction.DOCUMENT_REPROCESS_REQUESTED,
    AuditAction.DOCUMENT_EXPORTED,
}
AUDIT_TARGET_TYPES = {
    AuditTargetType.USER,
    AuditTargetType.DOCUMENT,
}
SORT_ORDERS = {"asc", "desc"}


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip() or None

    return request.client.host if request.client else None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


@router.get(
    "/dashboard/summary",
    response_model=AdminDashboardSummaryResponse,
)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_dashboard_summary(db)


@router.get(
    "/system/health",
    response_model=AdminSystemHealthResponse,
)
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_system_health(db)


@router.get(
    "/queues",
    response_model=AdminQueueListResponse,
    response_model_exclude_none=True,
)
def list_queues(
    current_user: User = Depends(require_admin),
):
    return get_admin_queues()


@router.get(
    "/workers",
    response_model=AdminWorkerListResponse,
    response_model_exclude_none=True,
)
def list_workers(
    current_user: User = Depends(require_admin),
):
    return get_admin_workers()


@router.get(
    "/settings",
    response_model=AdminSettingsResponse,
)
def admin_settings(
    current_user: User = Depends(require_admin),
):
    return get_admin_settings()


@router.get(
    "/logs/summary",
    response_model=AdminLogSummaryResponse,
    response_model_exclude_none=True,
)
def logs_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_admin_logs_summary(db)


@router.get(
    "/logs",
    response_model=AdminLogListResponse,
    response_model_exclude_none=True,
)
def list_logs(
    q: str | None = None,
    level: str | None = None,
    service: str | None = None,
    from_datetime: datetime | None = Query(default=None, alias="from"),
    to_datetime: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if level and level not in LOG_LEVELS:
        raise HTTPException(status_code=400, detail="지원하지 않는 로그 레벨입니다.")

    return list_admin_logs(
        db=db,
        q=q,
        level=level,
        service=service,
        from_datetime=from_datetime,
        to_datetime=to_datetime,
        page=page,
        limit=limit,
    )


@router.get(
    "/audit-logs",
    response_model=AdminAuditLogListResponse,
    response_model_exclude_none=True,
)
def list_audit_logs(
    action: str | None = None,
    actor_user_id: UUID | None = None,
    target_type: str | None = None,
    target_id: UUID | None = None,
    from_datetime: datetime | None = Query(default=None, alias="from"),
    to_datetime: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if action and action not in AUDIT_ACTIONS:
        raise HTTPException(status_code=400, detail="지원하지 않는 감사 로그 액션입니다.")

    if target_type and target_type not in AUDIT_TARGET_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 감사 로그 대상 유형입니다.")

    return list_admin_audit_logs(
        db=db,
        action=action,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=target_id,
        from_datetime=from_datetime,
        to_datetime=to_datetime,
        page=page,
        limit=limit,
    )


@router.get(
    "/users",
    response_model=AdminUserListResponse,
)
def list_users(
    q: str | None = None,
    role: str | None = None,
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if role and role not in USER_ROLES:
        raise HTTPException(status_code=400, detail="지원하지 않는 사용자 역할입니다.")

    if status and status not in USER_STATUSES:
        raise HTTPException(status_code=400, detail="지원하지 않는 사용자 상태입니다.")

    if sort_by not in USER_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 필드입니다.")

    if sort_order.lower() not in SORT_ORDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 방향입니다.")

    return list_admin_users(
        db=db,
        q=q,
        role=role,
        status=status,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.patch(
    "/users/{user_id}/role",
    response_model=AdminUserListItemResponse,
)
def update_user_role(
    user_id: UUID,
    req: AdminUserRoleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if req.role not in USER_ROLES:
        raise HTTPException(status_code=400, detail="지원하지 않는 사용자 역할입니다.")

    user, error_code = update_admin_user_role(
        db=db,
        user_id=user_id,
        new_role=req.role,
        current_user=current_user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    if error_code == ROLE_UPDATE_SELF_DEMOTION:
        raise HTTPException(status_code=400, detail="자기 자신의 관리자 권한은 해제할 수 없습니다.")

    if error_code == ROLE_UPDATE_LAST_ADMIN:
        raise HTTPException(status_code=409, detail="마지막 관리자 계정은 일반 사용자로 변경할 수 없습니다.")

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return user


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserListItemResponse,
)
def update_user_status(
    user_id: UUID,
    req: AdminUserStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if req.status not in USER_STATUSES:
        raise HTTPException(status_code=400, detail="지원하지 않는 사용자 상태입니다.")

    user, error_code = update_admin_user_status(
        db=db,
        user_id=user_id,
        new_status=req.status,
        reason=req.reason,
        current_user=current_user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    if error_code == STATUS_UPDATE_SELF_SUSPEND:
        raise HTTPException(status_code=400, detail="자기 자신의 계정은 정지할 수 없습니다.")

    if error_code == STATUS_UPDATE_LAST_ADMIN:
        raise HTTPException(status_code=409, detail="마지막 관리자 계정은 정지할 수 없습니다.")

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return user


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = get_admin_user_detail(db=db, user_id=user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return user


@router.get(
    "/documents",
    response_model=AdminDocumentListResponse,
)
def list_documents(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    uploaded_from: date | None = None,
    uploaded_to: date | None = None,
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if status and status not in DOCUMENT_STATUSES:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 상태입니다.")

    if sort_by not in DOCUMENT_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 필드입니다.")

    if sort_order.lower() not in SORT_ORDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 방향입니다.")

    return list_admin_documents(
        db=db,
        page=page,
        limit=limit,
        status=status,
        owner_id=owner_id,
        search=search,
        uploaded_from=uploaded_from,
        uploaded_to=uploaded_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/documents/{document_id}",
    response_model=AdminDocumentDetailResponse,
)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    document = get_admin_document_detail(db=db, document_id=document_id)

    if document is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return document


@router.get(
    "/documents/{document_id}/export",
    response_class=FileResponse,
)
def export_document(
    document_id: UUID,
    request: Request,
    format: str = Query(default="original"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        export_file = prepare_admin_document_original_export(
            db=db,
            document_id=document_id,
            export_format=format,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except AdminDocumentExportError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)

    return FileResponse(
        path=export_file.path,
        media_type=export_file.content_type,
        filename=export_file.file_name,
    )


@router.post(
    "/documents/{document_id}/retry-from-stage",
    response_model=AdminDocumentRetryResponse,
)
def retry_document_from_stage(
    document_id: UUID,
    req: AdminDocumentRetryRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return retry_admin_document_from_stage(
            db=db,
            document_id=document_id,
            retry_from_stage=req.retry_from_stage,
            reason=req.reason,
            actor=current_user,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
        )
    except AdminDocumentRetryError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.delete(
    "/documents/{document_id}",
    response_model=AdminDocumentDeleteResponse,
)
def delete_document(
    document_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = delete_admin_document(
        db=db,
        document_id=document_id,
        actor=current_user,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
    )

    if result is None:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    return result


@router.get(
    "/tasks",
    response_model=AdminTaskListResponse,
)
def list_tasks(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str | None = None,
    task_type: str | None = None,
    stage: str | None = None,
    document_id: UUID | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if status and status not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="지원하지 않는 작업 상태입니다.")

    if task_type and task_type not in TASK_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 작업 유형입니다.")

    if stage and stage not in TASK_STAGES:
        raise HTTPException(status_code=400, detail="지원하지 않는 작업 단계입니다.")

    if sort_by not in TASK_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 필드입니다.")

    if sort_order.lower() not in SORT_ORDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 방향입니다.")

    return list_admin_tasks(
        db=db,
        page=page,
        limit=limit,
        status=status,
        task_type=task_type,
        stage=stage,
        document_id=document_id,
        owner_id=owner_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/tasks/{task_id}",
    response_model=AdminTaskDetailResponse,
)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    task = get_admin_task_detail(db=db, task_id=task_id)

    if task is None:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    return task


@router.post(
    "/tasks/{task_id}/retry",
    response_model=AdminTaskRetryResponse,
)
def retry_task(
    task_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return retry_failed_task(
            db=db,
            task_id=task_id,
            actor=current_user,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except AdminTaskRetryError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail)
