from datetime import date
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy.orm import Session

from db.session import get_db
from models.document import DocumentStatus
from models.user import User
from routers.deps import require_admin
from schemas.admin import AdminDashboardSummaryResponse
from schemas.admin import AdminDocumentDetailResponse
from schemas.admin import AdminDocumentListResponse
from services.admin_service import get_admin_document_detail
from services.admin_service import get_dashboard_summary
from services.admin_service import list_admin_documents


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
