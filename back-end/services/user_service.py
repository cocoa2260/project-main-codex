from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.security import hash_password
from core.security import verify_password
from models.user import User
from schemas.user import UserProfileUpdateRequest
from schemas.user import UserProfileResponse
from schemas.user import UserPasswordUpdateRequest
from schemas.user import UserPasswordUpdateResponse


PASSWORD_CHANGED_MESSAGE = "비밀번호가 변경되었습니다."


def to_user_profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
    )


def update_current_user_profile(
    db: Session,
    user: User,
    req: UserProfileUpdateRequest,
) -> UserProfileResponse:
    next_name = req.name.strip()
    if not next_name:
        raise HTTPException(
            status_code=422,
            detail="이름을 입력해 주세요.",
        )

    user.name = next_name
    db.commit()
    db.refresh(user)

    return to_user_profile_response(user)


def update_current_user_password(
    db: Session,
    user: User,
    req: UserPasswordUpdateRequest,
) -> UserPasswordUpdateResponse:
    if not verify_password(req.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="현재 비밀번호가 올바르지 않습니다.",
        )

    user.password = hash_password(req.new_password)
    db.commit()

    return UserPasswordUpdateResponse(message=PASSWORD_CHANGED_MESSAGE)
