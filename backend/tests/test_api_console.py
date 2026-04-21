from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from briefing.api.main import app
from briefing.config import Settings, get_settings


def _ok(data: list[dict]) -> MagicMock:
    q = MagicMock()
    q.execute.return_value = MagicMock(data=data)
    return q


def _fake_settings() -> Settings:
    return Settings(
        perplexity_api_key="x",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
    )


@patch("supabase.create_client")
def test_console_supreme_court_list(mock_create: MagicMock) -> None:
    client_sb = MagicMock()

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "jurisdictions":
            t.select.return_value.eq.return_value.limit.return_value = _ok([{"id": "ut-uuid"}])
        elif name == "officials":
            t.select.return_value.eq.return_value.eq.return_value.is_.return_value.eq.return_value.order.return_value = _ok(
                [
                    {
                        "id": "o1",
                        "slug": "justice-a",
                        "full_name": "Justice A",
                        "office_type": "state_supreme_justice",
                        "bio_summary": None,
                        "retention_year": 2026,
                        "subject_alignment": "nonpartisan",
                    }
                ]
            )
        return t

    client_sb.table.side_effect = table_side
    mock_create.return_value = client_sb

    app.dependency_overrides[get_settings] = _fake_settings
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/console/judicial/supreme-court")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["slug"] == "justice-a"


@patch("supabase.create_client")
def test_console_official_404(mock_create: MagicMock) -> None:
    client_sb = MagicMock()
    client_sb.table.return_value.select.return_value.eq.return_value.is_.return_value.limit.return_value = _ok([])
    mock_create.return_value = client_sb

    app.dependency_overrides[get_settings] = _fake_settings
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/console/officials/nope")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 404


@patch("supabase.create_client")
def test_console_official_detail(mock_create: MagicMock) -> None:
    client_sb = MagicMock()

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "officials":
            t.select.return_value.eq.return_value.is_.return_value.limit.return_value = _ok(
                [
                    {
                        "id": "o1",
                        "slug": "j",
                        "full_name": "J",
                        "office_type": "state_supreme_justice",
                        "bio_summary": "x",
                        "retention_year": None,
                        "subject_alignment": "nonpartisan",
                        "jurisdiction_id": "jid",
                    }
                ]
            )
        elif name == "jurisdictions":
            t.select.return_value.eq.return_value.limit.return_value = _ok(
                [{"id": "jid", "name": "Utah", "slug": "ut"}]
            )
        return t

    client_sb.table.side_effect = table_side
    mock_create.return_value = client_sb

    app.dependency_overrides[get_settings] = _fake_settings
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/console/officials/j")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["jurisdiction"]["slug"] == "ut"
