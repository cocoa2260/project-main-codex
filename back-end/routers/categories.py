from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.category import CategoryResponse
from services.category_service import list_active_categories


router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_active_categories(db)
