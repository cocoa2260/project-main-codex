import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from constants.pipeline_codes import TaskStageCode, TaskStatusCode, TaskTypeCode
from db.database import Base


class TaskType:
    OCR = TaskTypeCode.OCR
    SUMMARY = TaskTypeCode.SUMMARY
    EMBEDDING = TaskTypeCode.EMBEDDING
    RAG_INDEXING = TaskTypeCode.RAG_INDEXING


class TaskStatus:
    PENDING = TaskStatusCode.PENDING
    PROCESSING = TaskStatusCode.PROCESSING
    COMPLETED = TaskStatusCode.COMPLETED
    FAILED = TaskStatusCode.FAILED


class TaskStage:
    UPLOAD_COMPLETED = TaskStageCode.UPLOAD_COMPLETED
    OCR_PENDING = TaskStageCode.OCR_PENDING
    OCR_PROCESSING = TaskStageCode.OCR_PROCESSING
    OCR_COMPLETED = TaskStageCode.OCR_COMPLETED
    MARKDOWN_REVIEW = TaskStageCode.MARKDOWN_REVIEW
    SUMMARY_PENDING = TaskStageCode.SUMMARY_PENDING
    CHUNKING_PROCESSING = TaskStageCode.CHUNKING_PROCESSING
    CHUNKING_COMPLETED = TaskStageCode.CHUNKING_COMPLETED
    EMBEDDING_PENDING = TaskStageCode.EMBEDDING_PENDING
    EMBEDDING_PROCESSING = TaskStageCode.EMBEDDING_PROCESSING
    EMBEDDING_COMPLETED = TaskStageCode.EMBEDDING_COMPLETED
    SUMMARY_PROCESSING = TaskStageCode.SUMMARY_PROCESSING
    SUMMARY_COMPLETED = TaskStageCode.SUMMARY_COMPLETED
    RAG_INDEXING = TaskStageCode.RAG_INDEXING
    RAG_READY = TaskStageCode.RAG_READY
    FAILED = TaskStageCode.FAILED


class TaskTracker(Base):
    __tablename__ = "task_trackers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    celery_task_id = Column(
        String(255),
        nullable=True,
        index=True,
    )

    task_type = Column(
        Enum(
            TaskType.OCR,
            TaskType.SUMMARY,
            TaskType.EMBEDDING,
            TaskType.RAG_INDEXING,
            name="task_type",
        ),
        nullable=False,
    )

    status = Column(
        Enum(
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
            name="task_status",
        ),
        nullable=False,
        default=TaskStatus.PENDING,
    )

    progress = Column(
        Integer,
        nullable=False,
        default=0,
    )

    stage = Column(
        String(100),
        nullable=True,
    )

    message = Column(
        Text,
        nullable=True,
    )

    error_message = Column(
        Text,
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
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
        back_populates="tasks",
    )
