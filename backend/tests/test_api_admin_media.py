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


class _Exec:
    __slots__ = ("data", "count")

    def __init__(self, data: list | None, count: int | None = None) -> None:
        self.data = data
        self.count = count


def _media_list_chain(rows: list, total: int) -> MagicMock:
    m = MagicMock()
    m.select.return_value = m
    m.order.return_value = m
    m.eq.return_value = m
    m.contains.return_value = m
    term = MagicMock()
    term.execute.return_value = _Exec(rows, total)
    m.range.return_value = term
    return m


def _media_row(**over: object) -> dict:
    base = {
        "id": "m1",
        "headline": "H",
        "outlet": "News",
        "source_url": "https://ex.test/a",
        "summary": None,
        "published": False,
        "published_at": None,
        "fetched_at": None,
        "created_by": "clerk1",
        "official_ids": ["00000000-0000-4000-8000-0000000000aa"],
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }
    base.update(over)
    return base


@patch("supabase.create_client")
def test_admin_list_media(mock_create: MagicMock) -> None:
    row = _media_row()
    sb = MagicMock()
    sb.table.side_effect = lambda name: _media_list_chain([row], 1) if name == "media_coverage" else MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/media", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["headline"] == "H"
    assert body["items"][0]["official_ids"] == ["00000000-0000-4000-8000-0000000000aa"]


@patch("supabase.create_client")
def test_admin_list_media_filter_official_contains(mock_create: MagicMock) -> None:
    sb = MagicMock()
    chain = _media_list_chain([], 0)
    sb.table.side_effect = lambda name: chain if name == "media_coverage" else MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(
                "/v1/admin/media",
                params={"official_id": "00000000-0000-4000-8000-0000000000aa"},
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    chain.contains.assert_called_once_with("official_ids", ["00000000-0000-4000-8000-0000000000aa"])


@patch("briefing.api.routes.admin.media.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_create_media(mock_create: MagicMock, _audit: MagicMock) -> None:
    oid = "00000000-0000-4000-8000-0000000000aa"
    sb = MagicMock()
    off_m = MagicMock()
    off_m.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = _Exec(
        [{"id": oid}]
    )
    media_m = MagicMock()
    media_m.insert.return_value.execute.return_value = _Exec(
        [_media_row(id="new-id", headline="Story", outlet="Tribune", official_ids=[oid])]
    )

    def table_side(name: str) -> MagicMock:
        if name == "officials":
            return off_m
        if name == "media_coverage":
            return media_m
        return MagicMock()

    sb.table.side_effect = table_side
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/media",
                json={
                    "headline": "Story",
                    "outlet": "Tribune",
                    "source_url": "https://ex.test/x",
                    "official_ids": [oid],
                },
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["headline"] == "Story"
    ins = media_m.insert.call_args[0][0]
    assert ins["created_by"] == "admin1"
    assert ins["official_ids"] == [oid]


@patch("supabase.create_client")
def test_admin_create_media_unknown_official(mock_create: MagicMock) -> None:
    sb = MagicMock()
    off_m = MagicMock()
    off_m.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = _Exec([])
    sb.table.side_effect = lambda name: off_m if name == "officials" else MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/media",
                json={"headline": "S", "official_ids": ["00000000-0000-4000-8000-000000000099"]},
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 422


@patch("supabase.create_client")
def test_admin_list_media_forbidden_operator(mock_create: MagicMock) -> None:
    sb = MagicMock()
    mock_create.return_value = sb
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="op1", role="operator", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/media", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 403
