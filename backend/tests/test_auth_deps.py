import pytest
from fastapi.testclient import TestClient

from briefing.api.deps_auth import ClerkUser, require_clerk_user, role_at_least
from briefing.api.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_role_at_least() -> None:
    assert role_at_least("admin", "operator")
    assert role_at_least("operator", "operator")
    assert not role_at_least("viewer", "admin")
    assert not role_at_least(None, "viewer")


def test_admin_health_403_viewer(client: TestClient) -> None:
    async def viewer() -> ClerkUser:
        return ClerkUser(sub="u1", role="viewer", org_id=None)

    app.dependency_overrides[require_clerk_user] = viewer
    try:
        r = client.get("/v1/admin/health")
        assert r.status_code == 403
        assert r.json()["detail"] == "Insufficient role"
    finally:
        app.dependency_overrides.clear()


def test_admin_health_200_admin(client: TestClient) -> None:
    async def admin() -> ClerkUser:
        return ClerkUser(sub="u1", role="admin", org_id="org_x")

    app.dependency_overrides[require_clerk_user] = admin
    try:
        r = client.get("/v1/admin/health")
        assert r.status_code == 200
        assert r.json() == {"user_id": "u1", "role": "admin"}
    finally:
        app.dependency_overrides.clear()
