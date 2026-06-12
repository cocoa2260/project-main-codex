from datetime import date
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
from routers.deps import require_admin
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentListResponse
from schemas.admin import AdminTaskDetailResponse
from schemas.admin import AdminTaskListResponse
from services.admin_service import get_admin_document_detail
from services.admin_service import get_admin_task_detail
from services.admin_service import get_dashboard_summary
from services.admin_service import list_admin_documents
from services.admin_service import list_admin_tasks


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
