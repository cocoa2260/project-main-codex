"""create common codes

Revision ID: 20260611_000001
Revises: ec869c280a55
Create Date: 2026-06-11 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import uuid


revision: str = "20260611_000001"
down_revision: Union[str, None] = "ec869c280a55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COMMON_CODE_ROWS = [
    ("DOCUMENT_STATUS", "PENDING", "대기 중", "문서가 등록되고 작업 대기 중입니다.", 10),
    ("DOCUMENT_STATUS", "PROCESSING", "처리 중", "문서 처리 파이프라인이 진행 중입니다.", 20),
    ("DOCUMENT_STATUS", "REVIEW_REQUIRED", "리뷰 필요", "OCR/Markdown 결과 검토가 필요합니다.", 30),
    ("DOCUMENT_STATUS", "COMPLETED", "완료", "문서 처리 및 요약이 완료되었습니다.", 40),
    ("DOCUMENT_STATUS", "FAILED", "실패", "문서 처리 중 오류가 발생했습니다.", 50),
    ("TASK_STATUS", "PENDING", "대기 중", "작업이 대기 중입니다.", 10),
    ("TASK_STATUS", "PROCESSING", "처리 중", "작업이 진행 중입니다.", 20),
    ("TASK_STATUS", "COMPLETED", "완료", "작업이 완료되었습니다.", 30),
    ("TASK_STATUS", "FAILED", "실패", "작업이 실패했습니다.", 40),
    ("TASK_TYPE", "OCR", "OCR", "OCR/Markdown 변환 작업", 10),
    ("TASK_TYPE", "SUMMARY", "요약", "Chunking/Embedding/LLM 요약 작업", 20),
    ("TASK_TYPE", "EMBEDDING", "임베딩", "문서 임베딩 생성 작업", 30),
    ("TASK_TYPE", "RAG_INDEXING", "RAG 인덱싱", "RAG 검색 인덱스 생성 작업", 40),
    ("TASK_STAGE", "UPLOAD_COMPLETED", "업로드 완료", "파일 업로드가 완료되었습니다.", 10),
    ("TASK_STAGE", "OCR_PENDING", "OCR 대기", "OCR 작업 대기 중입니다.", 20),
    ("TASK_STAGE", "OCR_PROCESSING", "OCR 처리 중", "OCR로 텍스트를 추출하고 있습니다.", 30),
    ("TASK_STAGE", "OCR_COMPLETED", "OCR 완료", "OCR/Markdown 변환이 완료되었습니다.", 40),
    ("TASK_STAGE", "MARKDOWN_REVIEW", "Markdown 리뷰", "사용자 Markdown 검토가 필요합니다.", 50),
    ("TASK_STAGE", "SUMMARY_PENDING", "요약 대기", "요약/임베딩 작업 대기 중입니다.", 60),
    ("TASK_STAGE", "CHUNKING_PROCESSING", "Chunking 처리 중", "Markdown 문서를 chunk 단위로 분할하고 있습니다.", 70),
    ("TASK_STAGE", "CHUNKING_COMPLETED", "Chunking 완료", "Chunking 작업이 완료되었습니다.", 80),
    ("TASK_STAGE", "EMBEDDING_PROCESSING", "Embedding 처리 중", "문서 임베딩을 생성하고 있습니다.", 90),
    ("TASK_STAGE", "EMBEDDING_COMPLETED", "Embedding 완료", "문서 임베딩 생성이 완료되었습니다.", 100),
    ("TASK_STAGE", "SUMMARY_PROCESSING", "요약 처리 중", "AI 요약을 생성하고 있습니다.", 110),
    ("TASK_STAGE", "SUMMARY_COMPLETED", "요약 완료", "AI 요약 생성이 완료되었습니다.", 120),
    ("TASK_STAGE", "RAG_INDEXING", "RAG 인덱싱 중", "RAG 검색 인덱스를 생성하고 있습니다.", 130),
    ("TASK_STAGE", "RAG_READY", "RAG 준비 완료", "문서 기반 질의응답 준비가 완료되었습니다.", 140),
    ("TASK_STAGE", "FAILED", "실패", "작업 단계 처리 중 오류가 발생했습니다.", 900),
]


def upgrade() -> None:
    op.create_table(
        "common_codes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_code", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("code_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_code", "code", name="uq_common_codes_group_code_code"),
    )
    op.create_index(op.f("ix_common_codes_group_code"), "common_codes", ["group_code"], unique=False)
    op.create_index(op.f("ix_common_codes_code"), "common_codes", ["code"], unique=False)

    common_codes = sa.table(
        "common_codes",
        sa.column("id", sa.UUID()),
        sa.column("group_code", sa.String()),
        sa.column("code", sa.String()),
        sa.column("code_name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )

    op.bulk_insert(
        common_codes,
        [
            {
                "id": uuid.uuid4(),
                "group_code": group_code,
                "code": code,
                "code_name": code_name,
                "description": description,
                "sort_order": sort_order,
                "is_active": True,
            }
            for group_code, code, code_name, description, sort_order in COMMON_CODE_ROWS
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_common_codes_code"), table_name="common_codes")
    op.drop_index(op.f("ix_common_codes_group_code"), table_name="common_codes")
    op.drop_table("common_codes")
