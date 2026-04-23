from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings


def _settings() -> Settings:
    return Settings(
        perplexity_api_key="x",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
    )


@patch("supabase.create_client")
def test_admin_sources_list(mock_create: MagicMock) -> None:
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(data=[])
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/sources", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 9
    keys = {it["key"] for it in items}
    assert "vote_utah_filings_url" in keys


@patch("briefing.api.routes.admin.sources.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_sources_patch(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    sel = MagicMock()
    sel.execute.return_value = MagicMock(data=[])
    ups = MagicMock()
    ups.execute.return_value = MagicMock(data=[])
    t = MagicMock()
    t.select.return_value.eq.return_value.limit.return_value = sel
    t.upsert.return_value = ups
    sb.table.return_value = t
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.patch(
                "/v1/admin/sources/vote_utah_filings_url",
                headers={"Authorization": "Bearer x"},
                json={"url": "https://vote.example/new-path/"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    t.upsert.assert_called_once()


@patch("supabase.create_client")
def test_admin_feeds_get(mock_create: MagicMock) -> None:
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[]
    )
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/feeds", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert "stored" in body and "effective" in body
    assert body["stored"]["x_enabled"] is True


@patch("briefing.api.routes.admin.feeds.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_feeds_patch(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    load = MagicMock()
    load.execute.return_value = MagicMock(data=[])
    ups = MagicMock()
    ups.execute.return_value = MagicMock(data=[])
    t = MagicMock()
    t.select.return_value.eq.return_value.limit.return_value = load
    t.upsert.return_value = ups
    sb.table.return_value = t
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.patch(
                "/v1/admin/feeds",
                headers={"Authorization": "Bearer x"},
                json={"cache_seconds": 120, "x_enabled": False},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["stored"]["cache_seconds"] == 120
    assert r.json()["stored"]["x_enabled"] is False
