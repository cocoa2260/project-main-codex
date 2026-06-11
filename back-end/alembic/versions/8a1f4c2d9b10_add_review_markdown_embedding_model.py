"""add review markdown embedding model

Revision ID: 8a1f4c2d9b10
Revises: ccfb3531a067
Create Date: 2026-06-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a1f4c2d9b10"
down_revision: Union[str, None] = "ccfb3531a067"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # PostgreSQL ENUM에 REVIEW_REQUIRED 값을 추가한다.
    # 기존 DB에서도 안전하게 실행되도록 IF NOT EXISTS를 사용한다.
    op.execute("ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED'")

    op.add_column(
        "documents",
        sa.Column("ocr_markdown", sa.Text(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("selected_embedding_model", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("documents", "selected_embedding_model")
    op.drop_column("documents", "ocr_markdown")

    # PostgreSQL은 ENUM value 삭제를 직접 지원하지 않는다.
    # 개발 초기에는 down -v로 초기화하는 편이 안전하므로 여기서는 컬럼만 되돌린다.
