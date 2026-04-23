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


def _claim_row(cid: str = "00000000-0000-4000-8000-0000000000cc") -> dict:
    return {
        "id": cid,
        "claim_text": "Hello",
        "category": "Test",
        "official_id": "00000000-0000-4000-8000-0000000000bb",
        "source_url": None,
        "pipeline_stage": "writer_sonar",
        "published": False,
        "requires_human_review": True,
        "groundedness_score": 0.5,
        "metadata": {"critique_json": '{"issues":[],"unsupported_claims":[],"severity":"low"}'},
        "review_note": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }


class _Exec:
    __slots__ = ("data", "count")

    def __init__(self, data: list | None, count: int | None = None) -> None:
        self.data = data
        self.count = count


def _queue_chain(rows: list, total: int) -> MagicMock:
    m = MagicMock()
    m.select.return_value = m
    m.eq.return_value = m
    m.or_.return_value = m
    m.order.return_value = m
    term = MagicMock()
    term.execute.return_value = _Exec(rows, total)
    m.range.return_value = term
    return m


@patch("briefing.api.routes.admin.dossiers.write_audit_via_service_role")
@patch("supabase.create_client")
def test_queue(mock_create: MagicMock, _audit: MagicMock) -> None:
    row = {
        **_claim_row(),
        "officials": {"full_name": "Gov X", "slug": "gov-x"},
    }
    sb = MagicMock()
    sb.table.return_value = _queue_chain([row], 1)
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="a1", role="admin", org_id="o1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/dossiers/queue", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["critique"]["severity"] == "low"


@patch("supabase.create_client")
def test_queue_forbidden(mock_create: MagicMock) -> None:
    mock_create.return_value = MagicMock()
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="v1", role="viewer", org_id=None
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/dossiers/queue", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 403


@patch("briefing.api.routes.admin.dossiers.write_audit_via_service_role")
@patch("supabase.create_client")
def test_publish(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "dossier_claims":
            sel = MagicMock()
            sel.eq.return_value.limit.return_value.execute.return_value = _Exec([_claim_row()])
            upd = MagicMock()
            upd.eq.return_value.select.return_value.execute.return_value = _Exec(
                [
                    {
                        **_claim_row(),
                        "published": True,
                        "requires_human_review": False,
                        "reviewed_by": "a1",
                        "reviewed_at": "2026-04-21T13:00:00+00:00",
                    }
                ]
            )
            t.select.return_value = sel
            t.update.return_value = upd
        elif name == "officials":
            t.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = _Exec(
                [{"id": "x", "slug": "s", "full_name": "N"}]
            )
        return t

    sb.table.side_effect = table_side
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="a1", role="admin", org_id="o1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/dossiers/publish",
                headers={"Authorization": "Bearer x"},
                json={"claim_ids": ["00000000-0000-4000-8000-0000000000cc"]},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()[0]["published"] is True
    _audit.assert_called_once()


@patch("briefing.api.routes.admin.dossiers.write_audit_via_service_role")
@patch("supabase.create_client")
def test_reject(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    t = MagicMock()
    t.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Exec([_claim_row()])
    t.update.return_value.eq.return_value.select.return_value.execute.return_value = _Exec(
        [
            {
                **_claim_row(),
                "published": False,
                "review_note": "Needs better sourcing",
                "requires_human_review": False,
            }
        ]
    )
    sb.table.return_value = t
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="a1", role="admin", org_id="o1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/dossiers/claim/00000000-0000-4000-8000-0000000000cc/reject",
                headers={"Authorization": "Bearer x"},
                json={"review_note": "Needs better sourcing"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["review_note"] == "Needs better sourcing"
    _audit.assert_called_once()
