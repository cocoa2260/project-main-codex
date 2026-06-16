"""add keywords to documents

Revision ID: 20260615_000002
Revises: 20260615_000001
Create Date: 2026-06-15 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260615_000002"
down_revision: Union[str, None] = "20260615_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 프론트 표시용 문서 대표 키워드를 ARRAY 형태로 저장한다.
    op.add_column(
        "documents",
        sa.Column("keywords", postgresql.ARRAY(sa.String()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "keywords")
