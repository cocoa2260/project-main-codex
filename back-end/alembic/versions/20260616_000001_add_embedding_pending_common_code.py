"""add embedding pending common code

Revision ID: 20260616_000001
Revises: 20260615_000002
Create Date: 2026-06-16 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260616_000001"
down_revision: Union[str, None] = "20260615_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO common_codes (
            id,
            group_code,
            code,
            code_name,
            description,
            sort_order,
            is_active
        )
        VALUES (
            '20260616-0001-0001-0001-000000000001',
            'TASK_STAGE',
            'EMBEDDING_PENDING',
            'Embedding 대기',
            '문서 임베딩 작업 대기 중입니다.',
            90,
            true
        )
        ON CONFLICT (group_code, code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM common_codes "
        "WHERE group_code = 'TASK_STAGE' AND code = 'EMBEDDING_PENDING'"
    )
