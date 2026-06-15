from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from core.security import create_access_token
from db.database import SessionLocal
from main import app
from models.audit_log import AuditAction
from models.audit_log import AuditLog
from models.audit_log import AuditTargetType
from models.user import User
from models.user import UserRole
from models.user import UserStatus
from services.audit_service import record_admin_action
from services.audit_service import record_failed_task_retry


SUPPORTED_AUDIT_ACTIONS = [
    AuditAction.USER_ROLE_CHANGED,
    AuditAction.USER_STATUS_CHANGED,
    AuditAction.FAILED_TASK_RETRY,
    AuditAction.DOCUMENT_REPROCESS_REQUESTED,
    AuditAction.DOCUMENT_DELETED,
    AuditAction.DOCUMENT_EXPORTED,
]

SUPPORTED_AUDIT_TARGET_TYPES = [
    AuditTargetType.USER,
    AuditTargetType.DOCUMENT,
    AuditTargetType.TASK,
]


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def audit_users(db):
    suffix = uuid4().hex
    admin = User(
        email=f"be-admin-021-admin-{suffix}@example.com",
        password="not-used",
        name="BE ADMIN 021 Admin",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    user = User(
        email=f"be-admin-021-user-{suffix}@example.com",
        password="not-used",
        name="BE ADMIN 021 User",
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
        db.query(AuditLog).filter(AuditLog.actor_email_snapshot.in_([admin.email, user.email])).delete(
            synchronize_session=False
        )
        db.query(User).filter(User.id.in_([admin.id, user.id])).delete(
            synchronize_session=False
        )
        db.commit()


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("action", SUPPORTED_AUDIT_ACTIONS)
def test_admin_audit_logs_accept_supported_action_filters(client, audit_users, action):
    admin, _ = audit_users

    response = client.get(
        "/api/admin/audit-logs",
        params={"action": action},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    assert "items" in response.json()


@pytest.mark.parametrize("target_type", SUPPORTED_AUDIT_TARGET_TYPES)
def test_admin_audit_logs_accept_supported_target_type_filters(
    client,
    audit_users,
    target_type,
):
    admin, _ = audit_users

    response = client.get(
        "/api/admin/audit-logs",
        params={"target_type": target_type},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    assert "items" in response.json()


def test_admin_audit_logs_reject_invalid_action_filter(client, audit_users):
    admin, _ = audit_users

    response = client.get(
        "/api/admin/audit-logs",
        params={"action": "INVALID"},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 400


def test_admin_audit_logs_reject_invalid_target_type_filter(client, audit_users):
    admin, _ = audit_users

    response = client.get(
        "/api/admin/audit-logs",
        params={"target_type": "INVALID"},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 400


def test_admin_audit_logs_require_admin_access(client, audit_users):
    _, user = audit_users

    user_response = client.get(
        "/api/admin/audit-logs",
        headers=_auth_headers(user),
    )
    unauthenticated_response = client.get("/api/admin/audit-logs")

    assert user_response.status_code == 403
    assert unauthenticated_response.status_code == 401


def test_failed_task_retry_audit_row_is_filterable_by_action_and_target_type(
    client,
    db,
    audit_users,
):
    admin, _ = audit_users
    failed_task_id = uuid4()
    retry_task_id = uuid4()
    document_id = uuid4()

    audit_log = record_failed_task_retry(
        db=db,
        actor=admin,
        target_task_id=failed_task_id,
        retry_task_id=retry_task_id,
        document_id=document_id,
        task_type="OCR",
        ip_address="127.0.0.1",
        user_agent="be-admin-021-test",
    )
    db.commit()
    db.refresh(audit_log)

    action_response = client.get(
        "/api/admin/audit-logs",
        params={"action": AuditAction.FAILED_TASK_RETRY},
        headers=_auth_headers(admin),
    )
    target_type_response = client.get(
        "/api/admin/audit-logs",
        params={"target_type": AuditTargetType.TASK},
        headers=_auth_headers(admin),
    )

    assert action_response.status_code == 200
    assert target_type_response.status_code == 200
    assert any(
        item["id"] == str(audit_log.id)
        and item["action"] == AuditAction.FAILED_TASK_RETRY
        for item in action_response.json()["items"]
    )
    assert any(
        item["id"] == str(audit_log.id)
        and item["target_type"] == AuditTargetType.TASK
        for item in target_type_response.json()["items"]
    )


def test_audit_log_values_mask_sensitive_keys(client, db, audit_users):
    admin, user = audit_users

    audit_log = record_admin_action(
        db=db,
        actor_user=admin,
        action=AuditAction.USER_ROLE_CHANGED,
        target_type=AuditTargetType.USER,
        target_id=user.id,
        old_value={
            "role": UserRole.USER,
            "storage_path": "/storage/private/original.pdf",
        },
        new_value={
            "role": UserRole.ADMIN,
            "password": "plain-secret",
        },
        metadata={
            "token": "secret-token",
            "safe_note": "kept",
        },
    )
    db.commit()
    db.refresh(audit_log)

    response = client.get(
        "/api/admin/audit-logs",
        params={"action": AuditAction.USER_ROLE_CHANGED},
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    item = next(
        item for item in response.json()["items"] if item["id"] == str(audit_log.id)
    )
    assert item["old_value"]["storage_path"] == "***MASKED***"
    assert item["new_value"]["password"] == "***MASKED***"
    assert item["metadata"]["token"] == "***MASKED***"
    assert item["metadata"]["safe_note"] == "kept"
