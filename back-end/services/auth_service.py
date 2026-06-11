from sqlalchemy.orm import Session

from models.user import User

from schemas.auth import SignupRequest

from core.logging_config import get_logger, setup_logging
from core.security import hash_password
from core.security import verify_password

logging = get_logger(__name__)

def create_user(db:Session, req:SignupRequest):

    user=User(
        email=req.email,
        password=
        hash_password(
            req.password
        ),
        name=req.name
    )

    logging.info(f"Creating user with email: {user.email}")
    logging.info(f"Hashed password: {user.password}")
    logging.info(f"User name: {user.name}")
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db:Session, email:str, password:str):
    user=(db.query(User).filter(User.email==email).first())

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user