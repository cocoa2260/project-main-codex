"""create prompts

Revision ID: 20260618_000002
Revises: 20260618_000001
Create Date: 2026-06-18 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260618_000002"
down_revision: Union[str, None] = "20260618_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PROMPTS = [
    {
        "id": "20260618-0002-0001-0001-000000000001",
        "prompt_key": "SUMMARY_PROMPT",
        "name": "Summary Prompt",
        "description": "문서 chunk 요약을 통합해 전체 요약을 생성할 때 사용하는 시스템 프롬프트",
        "content": (
            "당신은 여러 chunk 요약을 통합해 문서 전체 요약을 작성하는 전문가입니다. "
            "반드시 한국어로만 작성하고, chunk 요약에 없는 내용은 추가하지 마세요. "
            "최종 답변만 출력하세요. /no_think"
        ),
    },
    {
        "id": "20260618-0002-0001-0001-000000000002",
        "prompt_key": "CATEGORY_PROMPT",
        "name": "Category Prompt",
        "description": "OCR 원문과 요약을 기준으로 문서 카테고리를 분류할 때 사용하는 시스템 프롬프트",
        "content": (
            "당신은 한국 법률 문서를 고정된 법률 카테고리 중 하나로 분류하는 전문가입니다.\n"
            "반드시 아래 Seed 카테고리 중 하나만 선택하세요.\n\n"
            "Seed 카테고리:\n"
            "- 민법\n"
            "- 형법\n"
            "- 민사소송법\n"
            "- 형사소송법\n"
            "- 상법\n"
            "- 행정법\n"
            "- 노동법\n"
            "- 조세법\n"
            "- 헌법\n"
            "- 지식재산권법\n"
            "- 개인정보보호법\n"
            "- 기타\n\n"
            "규칙:\n"
            "1. 임의 카테고리를 만들지 마세요.\n"
            "2. 문서에 근거가 부족하면 기타를 선택하세요.\n"
            "3. 키워드 추출 결과는 사용하지 말고 OCR 원문과 요약만 기준으로 판단하세요.\n"
            "4. confidence는 0부터 1 사이의 숫자로 작성하세요.\n"
            "5. 출력은 JSON 객체 하나만 작성하고 설명 문장을 붙이지 마세요.\n\n"
            "출력 형식:\n"
            '{"category":"노동법","confidence":0.91}\n'
            "/no_think"
        ),
    },
    {
        "id": "20260618-0002-0001-0001-000000000003",
        "prompt_key": "QA_PROMPT",
        "name": "QA Prompt",
        "description": "문서 기반 질문 답변을 생성할 때 사용하는 시스템 프롬프트",
        "content": (
            "당신은 문서 기반 질의응답 도우미입니다. "
            "제공된 문서 컨텍스트에 근거해서만 한국어로 답변하세요. "
            "문서에서 확인할 수 없는 내용은 확인할 수 없다고 말하세요. "
            "추측하지 말고, 답변은 간결하되 필요한 근거를 포함하세요. "
            "최종 답변만 출력하세요. /no_think"
        ),
    },
]


def upgrade() -> None:
    prompts_table = op.create_table(
        "prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prompt_key", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prompt_key", name="uq_prompts_prompt_key"),
    )
    op.create_index(op.f("ix_prompts_prompt_key"), "prompts", ["prompt_key"], unique=False)
    op.bulk_insert(prompts_table, PROMPTS)


def downgrade() -> None:
    op.drop_index(op.f("ix_prompts_prompt_key"), table_name="prompts")
    op.drop_table("prompts")
