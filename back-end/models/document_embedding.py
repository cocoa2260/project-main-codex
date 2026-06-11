import uuid

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import UniqueConstraint
from sqlalchemy import Float
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import ARRAY

from sqlalchemy.orm import relationship

from pgvector.sqlalchemy import VECTOR

from db.database import Base


class DocumentEmbedding(Base):

    """
    Document Embedding Table

    역할:

    DocumentChunk
        ↓
    Embedding 생성
        ↓
    Embedding Model 별 저장
        ↓
    RAG Search

    특징:

    - 하나의 Chunk 에 여러 Embedding Model 저장 가능
    - Embedding Dimension 자유롭게 변경 가능
    - 화면에서 Embedding Model 변경 가능
    - Embedding 실험 / 비교 가능
    - 향후 FAISS / Milvus / Qdrant 확장 고려

    예시:

    Chunk A

      ├─ nomic-embed-text (768)

      ├─ bge-m3 (1024)

      └─ e5-large (1536)
    """

    __tablename__ = "document_embeddings"

    # UUID PK
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )


    # 어떤 Document 에 속하는 Embedding 인지
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "documents.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )


    # 어떤 Chunk 의 Embedding 인지
    chunk_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "document_chunks.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )


    # Embedding Model 이름
    #
    # 예:
    #
    # nomic-embed-text
    # bge-m3
    # e5-large
    #
    embedding_model = Column(
        String(100),
        nullable=False,
        index=True
    )


    # Embedding Dimension
    #
    # 예:
    #
    # 768
    # 1024
    # 1536
    #
    embedding_dimension = Column(
        Integer,
        nullable=False
    )


    # 실제 Embedding Vector 저장
    #
    # ARRAY(Float) 사용 이유:
    #
    # Vector(768) 처럼 고정 차원 사용 시
    # Embedding Model 변경 어려움
    #
    # ARRAY(Float) 사용 시
    #
    # 서로 다른 Dimension 저장 가능
    #
    embedding = Column(
        VECTOR(1024),
        nullable=False
    )


    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


    # ===========================
    # Relationships
    # ===========================

    document = relationship(
        "Document",
        back_populates="embeddings"
    )


    chunk = relationship(
        "DocumentChunk",
        back_populates="embeddings"
    )


    # ===========================
    # Constraints
    # ===========================
    #
    # 같은 Chunk 에
    #
    # 같은 Model Embedding 중복 저장 방지
    #
    __table_args__ = (
        UniqueConstraint(
            "chunk_id",
            "embedding_model",
            name="uq_document_embedding_chunk_model"
        ),

    )