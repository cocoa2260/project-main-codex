import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Integer
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Text
from sqlalchemy import Enum
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import ARRAY, UUID

from sqlalchemy.orm import relationship

from constants.pipeline_codes import DocumentStatusCode
from db.database import Base


class DocumentStatus:
    PENDING = DocumentStatusCode.PENDING
    PROCESSING = DocumentStatusCode.PROCESSING
    REVIEW_REQUIRED = DocumentStatusCode.REVIEW_REQUIRED
    COMPLETED = DocumentStatusCode.COMPLETED
    FAILED = DocumentStatusCode.FAILED


class Document(Base):
    __tablename__ = "documents"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    file_name = Column(
        String(255),
        nullable=False,
    )

    storage_path = Column(
        String(500),
        nullable=False,
    )

    file_size = Column(
        Integer,
        nullable=False,
    )

    page_count = Column(
        Integer,
        default=0,
    )

    category = Column(
        String(100),
        nullable=True,
    )

    summary = Column(
        Text,
        nullable=True,
    )

    # 프론트 요약 화면에 표시할 문서 대표 키워드 목록이다.
    # chunk별 상세 키워드는 document_chunks.keywords에 따로 저장한다.
    keywords = Column(
        ARRAY(String),
        nullable=True,
    )

    # PDF 텍스트 추출 후 Markdown 형식으로 변환한 결과를 저장한다.
    # 이 값은 DocumentReviewPage에서 사용자에게 먼저 보여주고,
    # 사용자가 요약 진행을 승인하면 LLM 요약/Chunking/Embedding 단계로 넘긴다.
    ocr_markdown = Column(
        Text,
        nullable=True,
    )

    # 업로드 시 사용자가 선택한 embedding model을 저장한다.
    # 이후 confirm-summary 단계에서 Chunking/Embedding 작업이 이 모델명을 기준으로 동작한다.
    selected_embedding_model = Column(
        String(100),
        nullable=True,
    )

    status = Column(
        Enum(
            DocumentStatus.PENDING,
            DocumentStatus.PROCESSING,
            DocumentStatus.REVIEW_REQUIRED,
            DocumentStatus.COMPLETED,
            DocumentStatus.FAILED,
            name="document_status",
        ),
        default=DocumentStatus.PENDING,
        nullable=False,
    )

    upload_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    process_at = Column(
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

    user = relationship(
        "User",
        back_populates="documents",
    )

    pages = relationship(
        "DocumentPage",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    embeddings = relationship(
        "DocumentEmbedding",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    chat_sessions = relationship(
        "ChatSession",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    tasks = relationship(
        "TaskTracker",
        back_populates="document",
        cascade="all, delete-orphan",
    )
