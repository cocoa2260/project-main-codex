from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.user import User
from models.user import UserStatus

from schemas.auth import SignupRequest

from core.logging_config import get_logger
from core.security import hash_password
from core.security import verify_password

logging = get_logger(__name__)
EMAIL_ALREADY_EXISTS_MESSAGE = "이미 가입된 이메일입니다."

def create_user(db:Session, req:SignupRequest):
    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == req.email.lower())
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail=EMAIL_ALREADY_EXISTS_MESSAGE,
        )

    user=User(
        email=req.email,
        password=
        hash_password(
            req.password
        ),
        name=req.name
    )

    logging.info(f"Creating user with email: {user.email}")
    logging.info(f"User name: {user.name}")
    
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=EMAIL_ALREADY_EXISTS_MESSAGE,
        )
    db.refresh(user)
    return user


def authenticate(db:Session, email:str, password:str):
    user=(db.query(User).filter(User.email==email).first())

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    if user.status == UserStatus.SUSPENDED:
        return None

    user.last_active_at = func.now()
    db.commit()
    db.refresh(user)

    return user
