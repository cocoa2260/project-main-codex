from datetime import date
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.orm import Session

from db.session import get_db
from models.document import DocumentStatus
from models.task_tracker import TaskStage
from models.task_tracker import TaskStatus
from models.task_tracker import TaskType
from models.user import User
from models.user import UserRole
from routers.deps import require_admin
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentListResponse
from schemas.admin import AdminLogListResponse
from schemas.admin import AdminLogSummaryResponse
from schemas.admin import AdminQueueListResponse
from schemas.admin import AdminSystemHealthResponse
from schemas.admin import AdminTaskDetailResponse
from schemas.admin import AdminTaskListResponse
from schemas.admin import AdminUserDetailResponse
from schemas.admin import AdminUserListResponse
from schemas.admin import AdminWorkerListResponse
from services.admin_service import get_admin_document_detail
from services.admin_service import get_admin_logs_summary
from services.admin_service import get_admin_queues
from services.admin_service import get_admin_task_detail
from services.admin_service import get_admin_user_detail
from services.admin_service import get_admin_workers
from services.admin_service import get_dashboard_summary
from services.admin_service import get_system_health
from services.admin_service import list_admin_documents
from services.admin_service import list_admin_logs
from services.admin_service import list_admin_tasks
from services.admin_service import list_admin_users


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
USER_SORT_FIELDS = {
    "created_at",
    "updated_at",
    "name",
    "email",
    "role",
    "document_count",
    "upload_count",
}
LOG_LEVELS = {
    "INFO",
    "WARNING",
    "ERROR",
    "SUCCESS",
}
SORT_ORDERS = {"asc", "desc"}


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
    "/users",
    response_model=AdminUserListResponse,
)
def list_users(
    q: str | None = None,
    role: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if role and role not in USER_ROLES:
        raise HTTPException(status_code=400, detail="지원하지 않는 사용자 역할입니다.")

    if sort_by not in USER_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 필드입니다.")

    if sort_order.lower() not in SORT_ORDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬 방향입니다.")

    return list_admin_users(
        db=db,
        q=q,
        role=role,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


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
