from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from models.audit_log import AuditAction
from models.audit_log import AuditTargetType
from models.prompt import Prompt
from models.user import User
from schemas.prompt import AdminPromptResponse
from services.audit_service import record_admin_action
from services.prompt_defaults import PROMPT_SEEDS


def ensure_prompt_seed_rows(db: Session) -> None:
    existing_keys = {
        row.prompt_key
        for row in db.query(Prompt.prompt_key)
        .filter(Prompt.prompt_key.in_([seed["prompt_key"] for seed in PROMPT_SEEDS]))
        .all()
    }
    for seed in PROMPT_SEEDS:
        if seed["prompt_key"] in existing_keys:
            continue
        db.add(
            Prompt(
                prompt_key=seed["prompt_key"],
                name=seed["name"],
                description=seed["description"],
                content=seed["content"],
                is_active=True,
            )
        )
    db.flush()


def _prompt_response(prompt: Prompt) -> AdminPromptResponse:
    return AdminPromptResponse(
        prompt_key=prompt.prompt_key,
        name=prompt.name,
        description=prompt.description,
        content=prompt.content,
        updated_at=prompt.updated_at,
    )


def list_admin_prompts(db: Session) -> list[AdminPromptResponse]:
    ensure_prompt_seed_rows(db)
    prompts = (
        db.query(Prompt)
        .filter(Prompt.prompt_key.in_([seed["prompt_key"] for seed in PROMPT_SEEDS]))
        .order_by(Prompt.prompt_key.asc())
        .all()
    )
    db.commit()
    return [_prompt_response(prompt) for prompt in prompts]


def get_admin_prompt(db: Session, prompt_key: str) -> AdminPromptResponse | None:
    ensure_prompt_seed_rows(db)
    prompt = (
        db.query(Prompt)
        .filter(Prompt.prompt_key == prompt_key)
        .first()
    )
    db.commit()
    return _prompt_response(prompt) if prompt else None


def update_admin_prompt(
    db: Session,
    prompt_key: str,
    content: str,
    actor: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AdminPromptResponse | None:
    ensure_prompt_seed_rows(db)
    prompt = (
        db.query(Prompt)
        .filter(Prompt.prompt_key == prompt_key)
        .first()
    )
    if prompt is None:
        db.rollback()
        return None

    old_content = prompt.content
    prompt.content = content

    record_admin_action(
        db=db,
        actor_user=actor,
        action=AuditAction.PROMPT_UPDATED,
        target_type=AuditTargetType.PROMPT,
        target_id=prompt.id,
        old_value={"content": old_content},
        new_value={"content": content},
        reason="Admin updated prompt content.",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={
            "prompt_key": prompt.prompt_key,
            "updated_by": str(actor.id),
        },
    )

    db.commit()
    db.refresh(prompt)
    return _prompt_response(prompt)


def get_active_prompt_content(db: Session, prompt_key: str) -> str | None:
    try:
        prompt = (
            db.query(Prompt)
            .filter(
                Prompt.prompt_key == prompt_key,
                Prompt.is_active.is_(True),
            )
            .first()
        )
    except SQLAlchemyError:
        db.rollback()
        return None

    if prompt is None:
        return None

    content = (prompt.content or "").strip()
    return content or None
