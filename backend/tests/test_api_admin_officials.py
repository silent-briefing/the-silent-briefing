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


def _official_row(oid: str = "00000000-0000-4000-8000-0000000000aa") -> dict:
    return {
        "id": oid,
        "full_name": "Test Official",
        "slug": "test-official",
        "jurisdiction_id": "00000000-0000-4000-8000-0000000000bb",
        "office_type": "governor",
        "party": "Independent",
        "subject_alignment": "neutral",
        "term_start": None,
        "term_end": None,
        "retention_year": None,
        "is_current": True,
        "photo_url": None,
        "bio_summary": "x",
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
        "deleted_at": None,
        "jurisdictions": {"name": "Utah", "slug": "ut"},
    }


class _Exec:
    __slots__ = ("data", "count")

    def __init__(self, data: list | None, count: int | None = None) -> None:
        self.data = data
        self.count = count


def _list_chain(rows: list, total: int) -> MagicMock:
    m = MagicMock()
    m.select.return_value = m
    m.is_.return_value = m
    m.eq.return_value = m
    m.or_.return_value = m
    m.order.return_value = m
    term = MagicMock()
    term.execute.return_value = _Exec(rows, total)
    m.range.return_value = term
    return m


@patch("briefing.api.routes.admin.officials.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_list_officials(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    sb.table.return_value = _list_chain([_official_row()], 1)
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/officials", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["slug"] == "test-official"


@patch("supabase.create_client")
def test_list_forbidden_operator(mock_create: MagicMock) -> None:
    sb = MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="op1", role="operator", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/officials", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403


@patch("briefing.api.routes.admin.officials.write_audit_via_service_role")
@patch("supabase.create_client")
def test_create_judge_party_rejected(mock_create: MagicMock, _audit: MagicMock) -> None:
    mock_create.return_value = MagicMock()

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/officials",
                headers={"Authorization": "Bearer x"},
                json={
                    "full_name": "Judge X",
                    "slug": "judge-x",
                    "jurisdiction_id": "00000000-0000-4000-8000-0000000000bb",
                    "office_type": "state_supreme_justice",
                    "party": "Republican",
                    "is_current": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 422


@patch("briefing.api.routes.admin.officials.write_audit_via_service_role")
@patch("supabase.create_client")
def test_create_official_ok(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    row = _official_row()
    ins = MagicMock()
    ins.execute.return_value = _Exec([row])
    sb.table.return_value.insert.return_value.select.return_value = ins
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/officials",
                headers={"Authorization": "Bearer x"},
                json={
                    "full_name": "Test Official",
                    "slug": "test-official",
                    "jurisdiction_id": "00000000-0000-4000-8000-0000000000bb",
                    "office_type": "governor",
                    "party": "Independent",
                    "is_current": True,
                    "bio_summary": "x",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["id"] == row["id"]
    _audit.assert_called_once()


@patch("supabase.create_client")
def test_get_official_forbidden_viewer(mock_create: MagicMock) -> None:
    mock_create.return_value = MagicMock()
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="v1", role="viewer", org_id=None
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(
                "/v1/admin/officials/00000000-0000-4000-8000-0000000000aa",
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403


@patch("supabase.create_client")
def test_patch_official_forbidden_viewer(mock_create: MagicMock) -> None:
    mock_create.return_value = MagicMock()
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="v1", role="viewer", org_id=None
    )
    try:
        with TestClient(app) as tc:
            r = tc.patch(
                "/v1/admin/officials/00000000-0000-4000-8000-0000000000aa",
                headers={"Authorization": "Bearer x"},
                json={"bio_summary": "y"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403


@patch("supabase.create_client")
def test_delete_official_forbidden_operator(mock_create: MagicMock) -> None:
    mock_create.return_value = MagicMock()
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="op1", role="operator", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.delete(
                "/v1/admin/officials/00000000-0000-4000-8000-0000000000aa",
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403
