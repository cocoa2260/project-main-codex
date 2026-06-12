from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.user import User
from routers.deps import require_admin
from schemas.admin import AdminDashboardSummaryResponse
from services.admin_service import get_dashboard_summary


router = APIRouter()


@router.get(
    "/dashboard/summary",
    response_model=AdminDashboardSummaryResponse,
)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_dashboard_summary(db)
