from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import UUID

from fastapi.testclient import TestClient

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings
from briefing.services.extraction.opinions import briefing_opinion_source_url


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


def test_briefing_opinion_source_url_stable() -> None:
    oid = "22222222-2222-4222-8222-222222222222"
    assert briefing_opinion_source_url(oid) == f"briefing://opinions/{oid}/document.pdf"


def _opinion_list_chain(rows: list, total: int) -> MagicMock:
    m = MagicMock()
    m.select.return_value = m
    m.order.return_value = m
    term = MagicMock()
    term.execute.return_value = _Exec(rows, total)
    m.range.return_value = term
    return m


@patch("supabase.create_client")
def test_admin_list_opinions(mock_create: MagicMock) -> None:
    row = {
        "id": "o1",
        "slug": "s",
        "title": "T",
        "court": "ut_supreme",
        "published": False,
        "pdf_storage_path": "o1/source.pdf",
        "ingestion_status": "ready",
        "entity_id": "e1",
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }
    sb = MagicMock()

    def table_side(name: str) -> MagicMock:
        if name == "opinions":
            return _opinion_list_chain([row], 1)
        return MagicMock()

    sb.table.side_effect = table_side
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/opinions", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["slug"] == "s"
    assert body["items"][0]["ingestion_status"] == "ready"


@patch("supabase.create_client")
def test_admin_list_opinions_forbidden_operator(mock_create: MagicMock) -> None:
    sb = MagicMock()
    mock_create.return_value = sb
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="op1", role="operator", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/opinions", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 403


@patch("briefing.api.routes.admin.opinions.threading.Thread")
@patch("briefing.api.routes.admin.opinions.write_audit_via_service_role")
@patch(
    "briefing.api.routes.admin.opinions.uuid.uuid4",
    return_value=UUID("33333333-3333-4333-8333-333333333333"),
)
@patch("supabase.create_client")
def test_admin_create_opinion_multipart_enqueue(
    mock_create: MagicMock,
    _uuid: MagicMock,
    _audit: MagicMock,
    _thread: MagicMock,
) -> None:
    fixed_id = "33333333-3333-4333-8333-333333333333"
    sb = MagicMock()
    ent = MagicMock()
    ent.insert.return_value.execute.return_value = _Exec(
        [{"id": "00000000-0000-4000-8000-0000000000e1"}]
    )
    op = MagicMock()
    op.insert.return_value.execute.return_value = _Exec(
        [
            {
                "id": fixed_id,
                "slug": "test-title-abc",
                "title": "Test Title",
                "court": "ut_supreme",
                "published": False,
                "pdf_storage_path": None,
                "ingestion_status": "pending",
                "entity_id": "00000000-0000-4000-8000-0000000000e1",
                "metadata": {},
                "created_at": "2026-04-21T12:00:00+00:00",
                "updated_at": "2026-04-21T12:00:00+00:00",
            },
        ]
    )
    op.update.return_value.eq.return_value.execute.return_value = _Exec(
        [
            {
                "id": fixed_id,
                "slug": "test-title-abc",
                "title": "Test Title",
                "court": "ut_supreme",
                "published": False,
                "pdf_storage_path": f"{fixed_id}/source.pdf",
                "ingestion_status": "pending",
                "entity_id": "00000000-0000-4000-8000-0000000000e1",
                "metadata": {},
                "created_at": "2026-04-21T12:00:00+00:00",
                "updated_at": "2026-04-21T12:00:00+00:00",
            },
        ]
    )
    runs = MagicMock()
    runs.insert.return_value.execute.return_value = _Exec([{"id": "run-zz"}])
    bucket = MagicMock()

    def table_side(name: str) -> MagicMock:
        if name == "entities":
            return ent
        if name == "opinions":
            return op
        if name == "intelligence_runs":
            return runs
        return MagicMock()

    sb.table.side_effect = table_side
    sb.storage.from_.return_value = bucket
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/opinions",
                data={"title": "Test Title"},
                files={"file": ("x.pdf", b"%PDF-1.4 minimal", "application/pdf")},
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["id"] == fixed_id
    assert body["run_id"] == "run-zz"
    bucket.upload.assert_called_once()
    meta = runs.insert.call_args[0][0]
    assert meta["pipeline_stage"] == "opinion-ingestion"
    assert meta["metadata"]["request"]["opinion_id"] == fixed_id


@patch("supabase.create_client")
def test_admin_get_opinion_detail_chunks(mock_create: MagicMock) -> None:
    oid = "44444444-4444-4444-8444-444444444444"
    src = briefing_opinion_source_url(oid)
    opinion_row = {
        "id": oid,
        "slug": "s",
        "title": "T",
        "court": None,
        "published": False,
        "pdf_storage_path": f"{oid}/source.pdf",
        "ingestion_status": "ready",
        "entity_id": "e1",
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }
    chunk_row = {
        "id": "c1",
        "chunk_index": 0,
        "content": "hello",
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
    }
    sb = MagicMock()
    op_m = MagicMock()
    op_m.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Exec(
        [opinion_row]
    )
    ch_m = MagicMock()
    ch_m.select.return_value.eq.return_value.order.return_value.execute.return_value = _Exec(
        [chunk_row]
    )

    def table_side(name: str) -> MagicMock:
        if name == "opinions":
            return op_m
        if name == "rag_chunks":
            return ch_m
        return MagicMock()

    sb.table.side_effect = table_side
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(f"/v1/admin/opinions/{oid}", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["opinion"]["id"] == oid
    assert len(body["chunks"]) == 1
    assert body["chunks"][0]["content"] == "hello"
    ch_m.select.return_value.eq.assert_called()
    assert ch_m.select.return_value.eq.call_args[0][1] == src


@patch("briefing.api.routes.admin.opinions.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_opinion_create_edge(mock_create: MagicMock, _audit: MagicMock) -> None:
    oid = "55555555-5555-4555-8555-555555555555"
    src_e = "66666666-6666-4666-8666-666666666666"
    tgt_e = "77777777-7777-4777-8777-777777777777"
    op_m = MagicMock()
    op_m.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Exec(
        [{"entity_id": src_e}]
    )
    ent_m = MagicMock()
    ent_m.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Exec(
        [{"id": src_e}]
    )
    ent_m2 = MagicMock()
    ent_m2.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Exec(
        [{"id": tgt_e}]
    )
    edge_m = MagicMock()
    edge_m.insert.return_value.execute.return_value = _Exec([{"id": "edge-1"}])

    call_count = {"entities": 0}

    def table_side(name: str) -> MagicMock:
        if name == "opinions":
            return op_m
        if name == "entities":
            call_count["entities"] += 1
            return ent_m if call_count["entities"] == 1 else ent_m2
        if name == "entity_edges":
            return edge_m
        return MagicMock()

    sb = MagicMock()
    sb.table.side_effect = table_side
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                f"/v1/admin/opinions/{oid}/edges",
                json={"target_entity_id": tgt_e, "relation": "cites"},
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["edge_id"] == "edge-1"
    ins = edge_m.insert.call_args[0][0]
    assert ins["status"] == "accepted"
    assert ins["source_entity_id"] == src_e
    assert ins["target_entity_id"] == tgt_e


def _bills_list_chain(rows: list, total: int) -> MagicMock:
    m = MagicMock()
    m.select.return_value = m
    m.order.return_value = m
    term = MagicMock()
    term.execute.return_value = _Exec(rows, total)
    m.range.return_value = term
    return m


@patch("briefing.api.routes.admin.bills.write_audit_via_service_role")
@patch("supabase.create_client")
def test_admin_create_bill(mock_create: MagicMock, _audit: MagicMock) -> None:
    sb = MagicMock()
    bill_m = MagicMock()
    bill_m.insert.return_value.execute.return_value = _Exec(
        [
            {
                "id": "b1",
                "bill_number": "HB1",
                "title": "An Act",
                "published": False,
                "metadata": {},
                "created_at": "2026-04-21T12:00:00+00:00",
                "updated_at": "2026-04-21T12:00:00+00:00",
            },
        ]
    )
    sb.table.side_effect = lambda name: bill_m if name == "bills" else MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/bills",
                json={"bill_number": "HB1", "title": "An Act"},
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["bill_number"] == "HB1"


@patch("supabase.create_client")
def test_admin_list_bills(mock_create: MagicMock) -> None:
    row = {
        "id": "b1",
        "bill_number": "HB1",
        "title": "T",
        "published": True,
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }
    sb = MagicMock()
    sb.table.side_effect = lambda name: _bills_list_chain([row], 1) if name == "bills" else MagicMock()
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/bills", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["total"] == 1
