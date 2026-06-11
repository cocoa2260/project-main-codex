from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from db.session import get_db

from schemas.auth import *

from services.auth_service import *

from core.security import create_access_token


router=APIRouter()

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

    return TokenResponse(access_token=token)