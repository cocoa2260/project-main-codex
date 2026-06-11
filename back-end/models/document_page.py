import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import Text
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class PageStatus:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    page_no = Column(
        Integer,
        nullable=False,
    )

    raw_text = Column(
        Text,
        nullable=True,
    )

    ocr_text = Column(
        Text,
        nullable=True,
    )

    merged_text = Column(
        Text,
        nullable=True,
    )

    status = Column(
        Enum(
            PageStatus.PENDING,
            PageStatus.PROCESSING,
            PageStatus.COMPLETED,
            PageStatus.FAILED,
            name="page_status",
        ),
        nullable=False,
        default=PageStatus.PENDING,
    )

    error_message = Column(
        Text,
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

    document = relationship(
        "Document",
        back_populates="pages",
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="page",
        cascade="all, delete-orphan",
    )