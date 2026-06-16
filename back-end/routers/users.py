from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from db.session import get_db
from models.user import User
from routers.deps import get_current_user
from schemas.user import UserPasswordUpdateRequest
from schemas.user import UserPasswordUpdateResponse
from schemas.user import UserProfileResponse
from schemas.user import UserProfileUpdateRequest
from services.user_service import update_current_user_password
from services.user_service import update_current_user_profile


router = APIRouter()


@router.patch("/me/profile", response_model=UserProfileResponse)
def update_me_profile(
    req: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_current_user_profile(db, current_user, req)


@router.patch("/me/password", response_model=UserPasswordUpdateResponse)
def update_me_password(
    req: UserPasswordUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_current_user_password(db, current_user, req)
