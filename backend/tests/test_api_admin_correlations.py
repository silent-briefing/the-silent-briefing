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


def _edge_row(eid: str = "10000000-0000-4000-8000-000000000001") -> dict:
    return {
        "id": eid,
        "source_entity_id": "20000000-0000-4000-8000-000000000002",
        "target_entity_id": "20000000-0000-4000-8000-000000000003",
        "relation": "related_to",
        "confidence": 0.85,
        "weight": None,
        "valid_from": None,
        "provenance": {"source": "test"},
        "status": "proposed",
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }


@patch("briefing.api.routes.admin.correlations.write_audit_via_service_role")
@patch("supabase.create_client")
def test_list_proposed(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    t_edge = MagicMock()
    t_edge.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = (
        MagicMock(data=[_edge_row()], count=1)
    )
    t_ent = MagicMock()
    t_ent.select.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "20000000-0000-4000-8000-000000000002", "canonical_name": "A", "type": "person"},
            {"id": "20000000-0000-4000-8000-000000000003", "canonical_name": "B", "type": "person"},
        ]
    )

    def tbl(name: str) -> MagicMock:
        if name == "entity_edges":
            return t_edge
        if name == "entities":
            return t_ent
        return MagicMock()

    sb.table.side_effect = tbl
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/correlations/proposed", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["source"]["canonical_name"] == "A"
    assert body["items"][0]["target"]["canonical_name"] == "B"


@patch("briefing.api.routes.admin.correlations.write_audit_via_service_role")
@patch("supabase.create_client")
def test_accept_edge(mock_create: MagicMock, _audit: MagicMock) -> None:
    row = _edge_row()
    sb = MagicMock()
    fetch = MagicMock()
    fetch.execute.return_value = MagicMock(data=[row])
    upd = MagicMock()
    upd.eq.return_value.execute.return_value = MagicMock(data=[row])

    def tbl(name: str) -> MagicMock:
        t = MagicMock()
        if name == "entity_edges":
            t.select.return_value.eq.return_value.limit.return_value = fetch
            t.update.return_value = upd
        return t

    sb.table.side_effect = tbl
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/correlations/10000000-0000-4000-8000-000000000001/accept",
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["status"] == "accepted"


@patch("briefing.api.routes.admin.correlations.write_audit_via_service_role")
@patch("supabase.create_client")
def test_batch_accept(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    sel = MagicMock()
    sel.execute.return_value = MagicMock(
        data=[
            {"id": "10000000-0000-4000-8000-000000000001"},
            {"id": "10000000-0000-4000-8000-000000000002"},
        ]
    )
    upd = MagicMock()
    upd.in_.return_value.execute.return_value = MagicMock(data=[{}, {}])

    def tbl(name: str) -> MagicMock:
        t = MagicMock()
        if name == "entity_edges":
            t.select.return_value.eq.return_value.gte.return_value = sel
            t.update.return_value = upd
        return t

    sb.table.side_effect = tbl
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/correlations/batch-accept",
                headers={"Authorization": "Bearer x"},
                json={"min_confidence": 0.8},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["updated"] == 2


@patch("supabase.create_client")
def test_list_forbidden(mock_create: MagicMock) -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="v1", role="viewer", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/correlations/proposed", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403
    mock_create.assert_not_called()
