"""create document categories

Revision ID: 20260618_000001
Revises: 20260616_000001
Create Date: 2026-06-18 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260618_000001"
down_revision: Union[str, None] = "20260616_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGAL_CATEGORIES = [
    ("20260618-0001-0001-0001-000000000001", "민법", "civil-law", "민사상 권리, 의무, 계약, 손해배상, 가족 및 상속 관련 문서", 10),
    ("20260618-0001-0001-0001-000000000002", "형법", "criminal-law", "범죄 성립, 처벌, 고소 및 형사 책임 관련 문서", 20),
    ("20260618-0001-0001-0001-000000000003", "민사소송법", "civil-procedure-law", "민사 소송, 보전처분, 집행 및 절차 관련 문서", 30),
    ("20260618-0001-0001-0001-000000000004", "형사소송법", "criminal-procedure-law", "수사, 공판, 증거, 형사 절차 관련 문서", 40),
    ("20260618-0001-0001-0001-000000000005", "상법", "commercial-law", "회사, 상거래, 보험, 주식 및 영업 관련 문서", 50),
    ("20260618-0001-0001-0001-000000000006", "행정법", "administrative-law", "행정처분, 인허가, 행정심판 및 행정소송 관련 문서", 60),
    ("20260618-0001-0001-0001-000000000007", "노동법", "labor-law", "근로계약, 임금, 해고, 산업재해 및 노사관계 관련 문서", 70),
    ("20260618-0001-0001-0001-000000000008", "조세법", "tax-law", "세금, 과세처분, 조세불복 및 세무 관련 문서", 80),
    ("20260618-0001-0001-0001-000000000009", "헌법", "constitutional-law", "기본권, 헌법소원 및 헌법상 쟁점 관련 문서", 90),
    ("20260618-0001-0001-0001-000000000010", "지식재산권법", "intellectual-property-law", "저작권, 특허, 상표, 영업비밀 관련 문서", 100),
    ("20260618-0001-0001-0001-000000000011", "개인정보보호법", "privacy-law", "개인정보 처리, 유출, 정보주체 권리 관련 문서", 110),
    ("20260618-0001-0001-0001-000000000012", "기타", "other", "고정 법률 카테고리로 분류하기 어려운 문서", 120),
]


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
    )
    op.create_index(op.f("ix_categories_parent_id"), "categories", ["parent_id"], unique=False)

    op.create_table(
        "document_categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="LLM"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", name="uq_document_categories_document_id"),
        sa.UniqueConstraint("document_id", "category_id", name="uq_document_categories_document_category"),
    )
    op.create_index(op.f("ix_document_categories_category_id"), "document_categories", ["category_id"], unique=False)
    op.create_index(op.f("ix_document_categories_document_id"), "document_categories", ["document_id"], unique=False)

    for category_id, name, slug, description, sort_order in LEGAL_CATEGORIES:
        op.execute(
            sa.text(
                """
                INSERT INTO categories (
                    id, name, slug, description, parent_id, is_active, sort_order
                )
                VALUES (
                    :id, :name, :slug, :description, NULL, true, :sort_order
                )
                ON CONFLICT (slug) DO NOTHING
                """
            ).bindparams(
                id=category_id,
                name=name,
                slug=slug,
                description=description,
                sort_order=sort_order,
            )
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_document_categories_document_id"), table_name="document_categories")
    op.drop_index(op.f("ix_document_categories_category_id"), table_name="document_categories")
    op.drop_table("document_categories")
    op.drop_index(op.f("ix_categories_parent_id"), table_name="categories")
    op.drop_table("categories")
