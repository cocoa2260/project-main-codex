from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from db.session import get_db

from schemas.auth import *

from services.auth_service import *

from core.security import create_access_token
from routers.deps import get_current_user


router=APIRouter()


def to_user_response(user):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        status=user.status,
    )

@router.post("/signup")
def signup(req:SignupRequest, db:Session=Depends(get_db)):
    user=create_user(db, req)

    return {
        "message": "signup success",
        "user_id": str(user.id)
    }


@router.post("/login", response_model=TokenResponse)
def login(req:LoginRequest, db:Session=Depends(get_db)):
    user=authenticate(db, req.email, req.password)

    if not user:
        raise HTTPException(
            status_code=401,
            detail=
            "invalid credentials"
        )

    token=create_access_token(
        {
            "sub":
            str(user.id),
            "role":
            user.role
        }
    )

    return TokenResponse(
        access_token=token,
        user=to_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return to_user_response(current_user)
