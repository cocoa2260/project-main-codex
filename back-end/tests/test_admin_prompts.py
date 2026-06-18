from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from core.security import create_access_token
from db.database import SessionLocal
from main import app
from models.audit_log import AuditAction
from models.audit_log import AuditLog
from models.audit_log import AuditTargetType
from models.prompt import Prompt
from models.user import User
from models.user import UserRole
from models.user import UserStatus
from services.prompt_defaults import CATEGORY_PROMPT_KEY
from services.prompt_defaults import QA_PROMPT_KEY
from services.prompt_defaults import SUMMARY_PROMPT_KEY
from services.prompt_service import ensure_prompt_seed_rows


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        ensure_prompt_seed_rows(session)
        session.commit()
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def prompt_users(db):
    suffix = uuid4().hex
    admin = User(
        email=f"admin-prompts-admin-{suffix}@example.com",
        password="not-used",
        name="Admin Prompts Admin",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    user = User(
        email=f"admin-prompts-user-{suffix}@example.com",
        password="not-used",
        name="Admin Prompts User",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db.add_all([admin, user])
    db.commit()
    db.refresh(admin)
    db.refresh(user)

    try:
        yield admin, user
    finally:
        db.query(AuditLog).filter(AuditLog.actor_user_id.in_([admin.id, user.id])).delete(
            synchronize_session=False
        )
        db.query(User).filter(User.id.in_([admin.id, user.id])).delete(
            synchronize_session=False
        )
        db.commit()


@pytest.fixture()
def original_summary_prompt(db):
    prompt = db.query(Prompt).filter(Prompt.prompt_key == SUMMARY_PROMPT_KEY).one()
    original_content = prompt.content
    try:
        yield prompt, original_content
    finally:
        prompt = db.query(Prompt).filter(Prompt.prompt_key == SUMMARY_PROMPT_KEY).one()
        prompt.content = original_content
        db.commit()


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"Authorization": f"Bearer {token}"}


def test_admin_prompts_seed_and_list(client, prompt_users):
    admin, _ = prompt_users

    response = client.get("/api/admin/prompts", headers=_auth_headers(admin))

    assert response.status_code == 200
    prompt_keys = {item["prompt_key"] for item in response.json()}
    assert {SUMMARY_PROMPT_KEY, CATEGORY_PROMPT_KEY, QA_PROMPT_KEY}.issubset(prompt_keys)


def test_admin_prompt_detail(client, prompt_users):
    admin, _ = prompt_users

    response = client.get(
        f"/api/admin/prompts/{CATEGORY_PROMPT_KEY}",
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["prompt_key"] == CATEGORY_PROMPT_KEY
    assert response.json()["content"]
    assert response.json()["updated_at"]


def test_admin_prompt_update_requery_and_audit_log(
    client,
    db,
    prompt_users,
    original_summary_prompt,
):
    admin, _ = prompt_users
    prompt, _ = original_summary_prompt
    updated_content = f"Updated summary prompt {uuid4().hex}"

    response = client.put(
        f"/api/admin/prompts/{SUMMARY_PROMPT_KEY}",
        json={"content": updated_content},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["prompt_key"] == SUMMARY_PROMPT_KEY
    assert response.json()["content"] == updated_content

    detail_response = client.get(
        f"/api/admin/prompts/{SUMMARY_PROMPT_KEY}",
        headers=_auth_headers(admin),
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["content"] == updated_content

    audit_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.actor_user_id == admin.id,
            AuditLog.action == AuditAction.PROMPT_UPDATED,
            AuditLog.target_type == AuditTargetType.PROMPT,
            AuditLog.target_id == prompt.id,
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit_log is not None
    assert audit_log.metadata_json["prompt_key"] == SUMMARY_PROMPT_KEY
    assert audit_log.metadata_json["updated_by"] == str(admin.id)


def test_admin_prompt_user_forbidden(client, prompt_users):
    _, user = prompt_users

    response = client.get("/api/admin/prompts", headers=_auth_headers(user))

    assert response.status_code == 403


def test_admin_prompt_unauthenticated(client):
    response = client.get("/api/admin/prompts")

    assert response.status_code == 401
