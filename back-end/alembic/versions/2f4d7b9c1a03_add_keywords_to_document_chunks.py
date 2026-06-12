"""add keywords to document chunks

Revision ID: 2f4d7b9c1a03
Revises: 8a1f4c2d9b10
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "2f4d7b9c1a03"
down_revision: Union[str, None] = "8a1f4c2d9b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # LLM에서 추출한 핵심 키워드를 chunk별 ARRAY 컬럼으로 저장하기 위해 추가한다.
    op.add_column(
        "document_chunks",
        sa.Column("keywords", postgresql.ARRAY(sa.String()), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("document_chunks", "keywords")
