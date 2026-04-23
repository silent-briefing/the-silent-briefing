from __future__ import annotations

from subprocess import CompletedProcess
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


def _run_row(rid: str = "00000000-0000-4000-8000-000000000099") -> dict:
    return {
        "id": rid,
        "candidate_id": None,
        "official_id": None,
        "model_id": "admin_trigger",
        "pipeline_stage": "retrieval-pass",
        "status": "running",
        "error_message": None,
        "tokens_input": None,
        "tokens_output": None,
        "cost_usd": None,
        "raw_response": None,
        "idempotency_key": "k1",
        "groundedness_score": None,
        "requires_human_review": False,
        "metadata": {},
        "created_at": "2026-04-21T12:00:00+00:00",
        "updated_at": "2026-04-21T12:00:00+00:00",
    }


@patch("supabase.create_client")
def test_list_runs_admin(mock_create: MagicMock) -> None:
    sb = MagicMock()
    tail = MagicMock()
    tail.execute.return_value = MagicMock(data=[_run_row()], count=1)
    sb.table.return_value.select.return_value.order.return_value.range.return_value = tail
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/runs", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


@patch("supabase.create_client")
def test_get_run_not_found(mock_create: MagicMock) -> None:
    sb = MagicMock()
    tail = MagicMock()
    tail.execute.return_value = MagicMock(data=[])
    sb.table.return_value.select.return_value.eq.return_value.limit.return_value = tail
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(
                "/v1/admin/runs/00000000-0000-4000-8000-0000000000aa",
                headers={"Authorization": "Bearer x"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 404


@patch("supabase.create_client")
def test_catalog(mock_create: MagicMock) -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/runs/catalog", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    jobs = r.json()["jobs"]
    ids = {j["job_id"] for j in jobs}
    assert "retrieval-pass" in ids
    assert "adversarial-dossier" in ids
    mock_create.assert_not_called()


@patch("briefing.api.routes.admin.runs.subprocess_run")
@patch("briefing.api.routes.admin.runs.write_audit_via_service_role")
@patch("supabase.create_client")
def test_trigger_inserts_and_runs_worker(
    mock_create: MagicMock, _audit: MagicMock, mock_subproc: MagicMock
) -> None:
    mock_subproc.return_value = CompletedProcess(args=[], returncode=0, stdout="ok", stderr="")

    sb = MagicMock()
    table_mock = MagicMock()
    n = {"i": 0}

    def exec_side() -> MagicMock:
        i = n["i"]
        n["i"] += 1
        if i == 0:
            return MagicMock(data=[])
        if i == 1:
            return MagicMock(data=[{"id": "00000000-0000-4000-8000-000000000099"}])
        return MagicMock(data=[])

    chain_idem = MagicMock()
    chain_idem.execute.side_effect = exec_side
    chain_ins = MagicMock()
    chain_ins.execute.side_effect = exec_side

    def select_chain(*_a, **_k):
        return chain_idem

    def insert_chain(_row):
        return chain_ins

    table_mock.select.return_value.eq.return_value.limit.return_value = chain_idem
    table_mock.insert.side_effect = insert_chain
    upd = MagicMock()
    upd.eq.return_value.execute.return_value = MagicMock(data=[])
    table_mock.update.return_value = upd
    sb.table.return_value = table_mock
    mock_create.return_value = sb

    import briefing.api.routes.admin.runs as runs_mod

    class SyncThread:
        def __init__(self, target=None, args=(), kwargs=None, daemon=None):
            self._t = target
            self._a = args

        def start(self) -> None:
            if self._t:
                self._t(*self._a)

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with patch.object(runs_mod.threading, "Thread", SyncThread):
            with TestClient(app) as tc:
                r = tc.post(
                    "/v1/admin/runs/trigger",
                    headers={"Authorization": "Bearer x"},
                    json={
                        "job": "retrieval-pass",
                        "official_id": "00000000-0000-4000-8000-0000000000aa",
                        "idempotency_key": "idem-1",
                    },
                )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["status"] == "running"
    mock_subproc.assert_called_once()
    table_mock.update.assert_called_once()


@patch("supabase.create_client")
def test_trigger_invalid_job(mock_create: MagicMock) -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/runs/trigger",
                headers={"Authorization": "Bearer x"},
                json={"job": "not-a-real-job", "official_id": "00000000-0000-4000-8000-0000000000aa"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 422
    mock_create.assert_not_called()


@patch("supabase.create_client")
def test_trigger_idempotency_conflict(mock_create: MagicMock) -> None:
    sb = MagicMock()
    chain = MagicMock()
    chain.execute.return_value = MagicMock(
        data=[{"id": "existing", "status": "running"}]
    )
    sb.table.return_value.select.return_value.eq.return_value.limit.return_value = chain
    mock_create.return_value = sb

    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/runs/trigger",
                headers={"Authorization": "Bearer x"},
                json={
                    "job": "retrieval-pass",
                    "official_id": "00000000-0000-4000-8000-0000000000aa",
                    "idempotency_key": "same-key",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 409
    sb.table.return_value.insert.assert_not_called()


@patch("supabase.create_client")
def test_trigger_forbidden(mock_create: MagicMock) -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="v1", role="viewer", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/admin/runs/trigger",
                headers={"Authorization": "Bearer x"},
                json={"job": "retrieval-pass", "official_id": "00000000-0000-4000-8000-0000000000aa"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 403
    mock_create.assert_not_called()
