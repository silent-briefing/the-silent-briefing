from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import briefing.api.routes.admin.ops as admin_ops
from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings


def _settings() -> Settings:
    return Settings(
        perplexity_api_key="x",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
        retrieval_stale_days=30,
    )


def test_studio_href_localhost() -> None:
    assert admin_ops._studio_href("http://127.0.0.1:54321") == "http://127.0.0.1:54323/"


def test_studio_href_hosted() -> None:
    assert admin_ops._studio_href("https://abcdefgh.supabase.co") == "https://supabase.com/dashboard"


@pytest.fixture
def patched_ops_summary(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        admin_ops,
        "_perplexity_24h_tokens",
        lambda c: admin_ops.Perplexity24hTokens(
            tokens_input=10,
            tokens_output=20,
            tokens_total=30,
            truncated_sample=False,
        ),
    )
    monkeypatch.setattr(admin_ops, "_rag_extraction_stats", lambda c: [])
    monkeypatch.setattr(admin_ops, "_recent_failures", lambda c: [])
    monkeypatch.setattr(admin_ops, "_runs_by_stage_recent", lambda c: {})
    monkeypatch.setattr(admin_ops, "_stage_latency", lambda c, since: [])
    monkeypatch.setattr(admin_ops, "_null_official_claims_count", lambda c: 1)
    monkeypatch.setattr(admin_ops, "_current_officials_count", lambda c: 5)
    monkeypatch.setattr(
        admin_ops,
        "_distinct_official_ids_from_claims",
        lambda client, page=1000, cap_rows=40_000: ({"00000000-0000-4000-8000-0000000000aa"}, False),
    )
    monkeypatch.setattr(admin_ops, "_stale_sample", lambda c, s, sample: (2, 200))
    monkeypatch.setattr(
        admin_ops,
        "_probe_worker_cli",
        lambda: {"ok": True, "exit_code": 0, "detail": None},
    )
    monkeypatch.setattr(admin_ops, "_sb_client", lambda s: MagicMock())


@patch.dict("os.environ", {"SENTRY_ORG_SLUG": "acme", "SENTRY_PROJECT_SLUG": "briefing"}, clear=False)
def test_ops_summary_admin_ok(patched_ops_summary: None, monkeypatch: pytest.MonkeyPatch) -> None:
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="admin1", role="admin", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/ops/summary", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["api_status"] == "ok"
    assert body["worker_cli"]["ok"] is True
    assert body["links"]["supabase_studio"] == "http://127.0.0.1:54323/"
    assert "acme" in (body["links"]["sentry_issues"] or "")
    assert body["perplexity_last_24h"]["tokens_total"] == 30
    dq = body["data_quality"]
    assert dq["dossier_claims_without_official"] == 1
    assert dq["current_officials_total"] == 5
    assert dq["distinct_officials_with_claims"] == 1
    assert dq["stale_officials_in_sample"] == 2


def test_ops_summary_forbidden_operator(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(admin_ops, "_sb_client", lambda s: MagicMock())
    app.dependency_overrides[get_settings] = _settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="op1", role="operator", org_id="org1"
    )
    try:
        with TestClient(app) as tc:
            r = tc.get("/v1/admin/ops/summary", headers={"Authorization": "Bearer x"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 403
