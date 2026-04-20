from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from briefing.config import Settings
from briefing.services.llm.correlation import (
    normalize_entity_type,
    persist_proposed_edges,
    propose_edges_from_text,
    run_correlation_pass,
)


class _MockLLM:
    def __init__(self, payload: str) -> None:
        self._payload = payload

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return []

    def chat_completion(
        self,
        *,
        messages: list[dict[str, Any]],
        model: str | None = None,
        response_format: dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> str:
        return self._payload


def test_normalize_entity_type_aliases() -> None:
    assert normalize_entity_type("Justice") == "person"
    assert normalize_entity_type("bill") == "bill"
    assert normalize_entity_type("STATUTE") == "bill"


def test_propose_edges_from_text_parses() -> None:
    raw = (
        '{"edges":[{"source_name":"Justice Doe","source_entity_type":"person",'
        '"target_name":"HB 123","target_entity_type":"bill","relation":"mentions",'
        '"confidence":0.9,"rationale":"Explicit"}]}'
    )
    llm = _MockLLM(raw)
    settings = Settings(perplexity_api_key="x", correlation_model="sonar")
    edges = propose_edges_from_text(llm, settings, text="The court discussed HB 123.", context="UT Supreme")
    assert len(edges) == 1
    assert edges[0]["relation"] == "mentions"
    assert edges[0]["confidence"] == 0.9


def test_persist_respects_confidence_and_inserts_high(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import briefing.services.llm.correlation as correlation_mod

    monkeypatch.setattr(
        correlation_mod,
        "_ensure_entity_id",
        lambda _client, *, entity_type, name: f"uuid-{name.strip()}",
    )
    monkeypatch.setattr(
        correlation_mod,
        "_edge_exists",
        lambda _client, **kwargs: False,
    )
    edge_table = MagicMock()
    client = MagicMock()
    client.table.return_value = edge_table

    edges = [
        {
            "source_name": "A",
            "source_entity_type": "person",
            "target_name": "B",
            "target_entity_type": "bill",
            "relation": "mentions",
            "confidence": 0.9,
            "rationale": "",
        },
        {
            "source_name": "Low",
            "source_entity_type": "person",
            "target_name": "X",
            "target_entity_type": "issue",
            "relation": "related_to",
            "confidence": 0.4,
            "rationale": "",
        },
    ]
    result = persist_proposed_edges(client, edges, min_confidence=0.8)
    assert result.inserted == 1
    assert result.skipped_low_confidence == 1
    edge_table.insert.assert_called_once()


def test_run_correlation_pass_dry_run_no_persist() -> None:
    raw = '{"edges":[]}'
    llm = _MockLLM(raw)
    settings = Settings(perplexity_api_key="x")
    r = run_correlation_pass(llm, text="x", dry_run=True, settings=settings)
    assert r.edges == []
    assert r.inserted == 0


def test_run_correlation_pass_persist_requires_supabase() -> None:
    raw = (
        '{"edges":[{"source_name":"A","source_entity_type":"person",'
        '"target_name":"B","target_entity_type":"bill","relation":"mentions",'
        '"confidence":0.95,"rationale":""}]}'
    )
    llm = _MockLLM(raw)
    settings = Settings(perplexity_api_key="x", supabase_url="", supabase_service_role_key="")
    with pytest.raises(RuntimeError, match="SUPABASE"):
        run_correlation_pass(llm, text="hello", persist=True, dry_run=False, settings=settings)
