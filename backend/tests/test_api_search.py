from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings


def _fake_settings_no_pplx() -> Settings:
    return Settings(
        perplexity_api_key="",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
    )


def _fake_settings_with_pplx() -> Settings:
    return Settings(
        perplexity_api_key="test-key",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
    )


def test_semantic_search_unauthorized() -> None:
    with TestClient(app) as tc:
        r = tc.post("/v1/search/semantic", json={"query": "utah supreme court"})
    assert r.status_code == 401


def test_semantic_search_no_perplexity_returns_empty() -> None:
    app.dependency_overrides[get_settings] = _fake_settings_no_pplx
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="u1",
        role="operator",
        org_id="org1",
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/search/semantic",
                json={"query": "climate"},
                headers={"Authorization": "Bearer unused"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["results"] == []
    assert body["semantic_available"] is False


@patch("supabase.create_client")
@patch("briefing.services.llm.perplexity.PerplexityLLMService")
def test_semantic_search_with_embedding_and_rpc(mock_llm_cls: MagicMock, mock_create: MagicMock) -> None:
    mock_llm = MagicMock()
    mock_llm.embed_texts.return_value = [[0.01] * 1024]
    mock_llm_cls.return_value = mock_llm

    rpc_q = MagicMock()
    rpc_q.execute.return_value = MagicMock(
        data=[
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "content": "A" * 200,
                "source_url": "https://example.com/opinion",
                "source_type": "opinion",
                "chunk_index": 0,
                "similarity": 0.91,
            }
        ]
    )

    client_sb = MagicMock()
    client_sb.rpc.return_value = rpc_q
    mock_create.return_value = client_sb

    app.dependency_overrides[get_settings] = _fake_settings_with_pplx
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="u1",
        role="operator",
        org_id="org1",
    )
    try:
        with TestClient(app) as tc:
            r = tc.post(
                "/v1/search/semantic",
                json={"query": "water rights", "match_count": 4},
                headers={"Authorization": "Bearer unused"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["semantic_available"] is True
    assert len(body["results"]) == 1
    hit = body["results"][0]
    assert hit["id"] == "550e8400-e29b-41d4-a716-446655440000"
    assert hit["score"] == 0.91
    assert hit["source_url"] == "https://example.com/opinion"
    assert hit["source_type"] == "opinion"
    assert len(hit["title"]) <= 160
    mock_llm.embed_texts.assert_called_once()
    client_sb.rpc.assert_called_once()
    call_kw = client_sb.rpc.call_args[0][1]
    assert call_kw["match_count"] == 4
    assert len(call_kw["query_embedding"]) == 1024
