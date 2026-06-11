from datetime import datetime
from datetime import timedelta

from jose import jwt
from jose import JWTError

from passlib.context import CryptContext

from core.config import settings


ALGORITHM="HS256"

ACCESS_TOKEN_EXPIRE_MINUTES=60


pwd_context=CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(
    password:str
)->str:

    return pwd_context.hash(
        password
    )


def verify_password(
    plain_password:str,
    hashed_password:str
)->bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(
    data:dict
):

    payload=data.copy()

    expire=datetime.utcnow()+timedelta(
        minutes=
        ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update(
        {"exp":expire}
    )

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM
    )