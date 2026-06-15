import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class AuditAction:
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    USER_STATUS_CHANGED = "USER_STATUS_CHANGED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    DOCUMENT_REPROCESS_REQUESTED = "DOCUMENT_REPROCESS_REQUESTED"
    DOCUMENT_EXPORTED = "DOCUMENT_EXPORTED"


class AuditTargetType:
    USER = "USER"
    DOCUMENT = "DOCUMENT"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    actor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    actor_email_snapshot = Column(
        String(255),
        nullable=True,
    )

    target_type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    target_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    action = Column(
        String(100),
        nullable=False,
        index=True,
    )

    old_value = Column(
        JSONB,
        nullable=True,
    )

    new_value = Column(
        JSONB,
        nullable=True,
    )

    reason = Column(
        Text,
        nullable=True,
    )

    ip_address = Column(
        String(64),
        nullable=True,
    )

    user_agent = Column(
        String(500),
        nullable=True,
    )

    metadata_json = Column(
        "metadata",
        JSONB,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,

        index=True,
    )

    actor = relationship("User")
