"""add user account status

Revision ID: 20260614_000001
Revises: 20260611_000001
Create Date: 2026-06-14 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260614_000001"
down_revision: Union[str, None] = "20260611_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_status = sa.Enum(
    "ACTIVE",
    "SUSPENDED",
    "INACTIVE",
    name="user_status",
)


def upgrade() -> None:
    bind = op.get_bind()
    user_status.create(bind, checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "status",
            user_status,
            server_default="ACTIVE",
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("suspended_reason", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "suspended_reason")
    op.drop_column("users", "suspended_at")
    op.drop_column("users", "last_active_at")
    op.drop_column("users", "status")

    bind = op.get_bind()
    user_status.drop(bind, checkfirst=True)
