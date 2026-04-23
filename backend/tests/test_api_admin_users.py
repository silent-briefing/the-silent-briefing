from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from clerk_backend_api.models import (
    OrganizationMembership,
    OrganizationMembershipObject,
    OrganizationMembershipOrganization,
    OrganizationMembershipOrganizationObject,
    OrganizationMembershipPublicUserData,
    OrganizationMemberships,
)

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings


def _settings() -> Settings:
    return Settings(
        perplexity_api_key="x",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
        clerk_secret_key="sk_test_dummy",
    )


def _sample_membership() -> OrganizationMembership:
    org = OrganizationMembershipOrganization(
        object=OrganizationMembershipOrganizationObject.ORGANIZATION,
        id="org_1",
        name="T",
        slug="t",
        has_image=False,
        max_allowed_memberships=100,
        admin_delete_enabled=True,
        public_metadata={},
        created_at=0,
        updated_at=0,
    )
    pud = OrganizationMembershipPublicUserData(
        user_id="user_2",
        first_name="Pat",
        last_name="Lee",
        profile_image_url=None,
        image_url="",
        has_image=False,
        identifier="pat@example.com",
    )
    return OrganizationMembership(
        id="mem1",
        object=OrganizationMembershipObject.ORGANIZATION_MEMBERSHIP,
        role="org:member",
        permissions=[],
        public_metadata={},
        organization=org,
        created_at=0,
        updated_at=0,
        public_user_data=pud,
    )


@patch("briefing.api.routes.admin.users.get_clerk_backend")
def test_admin_users_members_list(mock_clerk_factory: MagicMock) -> None:
    m = _sample_membership()
    clerk = MagicMock()
    clerk.organization_memberships.list.return_value = OrganizationMemberships(data=[m], total_count=1)
    u = MagicMock()
    u.primary_email_address_id = "ea1"
    em = MagicMock()
    em.id = "ea1"
    em.email_address = "pat@example.com"
    u.email_addresses = [em]
    u.public_metadata = {"role": "operator"}
    clerk.users.get.return_value = u
    mock_clerk_factory.return_value = clerk

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org_1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/users/members", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total_count"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["user_id"] == "user_2"
    assert body["items"][0]["app_role"] == "operator"


def test_admin_users_members_requires_org() -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id=None
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/users/members", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 400


@patch("briefing.api.routes.admin.users.write_audit_via_service_role")
@patch("briefing.api.routes.admin.users.get_clerk_backend")
def test_admin_users_invite(mock_clerk_factory: MagicMock, _audit: MagicMock) -> None:
    clerk = MagicMock()
    inv = MagicMock()
    inv.id = "inv_1"
    clerk.organization_invitations.create.return_value = inv
    mock_clerk_factory.return_value = clerk

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org_1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/users/invitations",
                headers={"Authorization": "Bearer x"},
                json={"email": "new@example.com", "app_role": "viewer"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    clerk.organization_invitations.create.assert_called_once()
    kw = clerk.organization_invitations.create.call_args.kwargs
    assert kw["organization_id"] == "org_1"
    assert kw["email_address"] == "new@example.com"
    assert kw["role"] == "org:member"


@patch("briefing.api.routes.admin.users.get_clerk_backend")
def test_admin_users_invite_admin_requires_confirm(mock_clerk_factory: MagicMock) -> None:
    mock_clerk_factory.return_value = MagicMock()
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org_1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/users/invitations",
                headers={"Authorization": "Bearer x"},
                json={"email": "boss@example.com", "app_role": "admin"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422


@patch("briefing.api.routes.admin.users.write_audit_via_service_role")
@patch("briefing.api.routes.admin.users.get_clerk_backend")
def test_admin_users_patch_admin_requires_email_confirm(
    mock_clerk_factory: MagicMock,
    _audit: MagicMock,
) -> None:
    clerk = MagicMock()
    target = MagicMock()
    target.primary_email_address_id = "ea1"
    em = MagicMock()
    em.id = "ea1"
    em.email_address = "target@example.com"
    target.email_addresses = [em]
    target.public_metadata = {"role": "viewer"}
    clerk.users.get.return_value = target
    mock_clerk_factory.return_value = clerk

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org_1"
    )
    try:
        with TestClient(app) as tc:
            r_bad = tc.patch(
                "/v1/admin/users/members/user_2",
                headers={"Authorization": "Bearer x"},
                json={"app_role": "admin"},
            )
            r_ok = tc.patch(
                "/v1/admin/users/members/user_2",
                headers={"Authorization": "Bearer x"},
                json={"app_role": "admin", "confirm_target_email": "target@example.com"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r_bad.status_code == 422
    assert r_ok.status_code == 200
    clerk.organization_memberships.update.assert_called_once()
    clerk.users.update_metadata.assert_called_once()


def test_admin_users_remove_self_forbidden() -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="user_1", role="admin", org_id="org_1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.delete(
                "/v1/admin/users/members/user_1",
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 400
