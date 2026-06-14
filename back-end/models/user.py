import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class UserRole:
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus:
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password = Column(
        String(255),
        nullable=False,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    role = Column(
        Enum(
            UserRole.USER,
            UserRole.ADMIN,
            name="user_role",
        ),
        nullable=False,
        default=UserRole.USER,
    )

    status = Column(
        Enum(
            UserStatus.ACTIVE,
            UserStatus.SUSPENDED,
            UserStatus.INACTIVE,
            name="user_status",
        ),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE,
    )

    last_active_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    suspended_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    suspended_reason = Column(
        String(500),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    documents = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
