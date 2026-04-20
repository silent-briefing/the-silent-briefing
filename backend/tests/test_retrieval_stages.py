from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import httpx
import respx

from briefing.config import Settings
from briefing.services.intelligence.retrieval_stages import (
    parse_stage_list,
    persist_retrieval_bundle,
    run_retrieval_stage,
    run_retrieval_stages_for_official,
)
from briefing.services.llm.perplexity import PerplexityLLMService

_VALID_PAYLOAD = (
    '{"executive_summary":"Bio summary.","evidence_items":['
    '{"claim":"C1","source_url":"https://a.test","notes":""}],'
    '"entity_mentions":["X"]}'
)


@respx.mock
def test_run_retrieval_stage_parses_sonar_json() -> None:
    respx.post("https://api.perplexity.ai/v1/sonar").mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": _VALID_PAYLOAD}}]})
    )
    settings = Settings(perplexity_api_key="k", perplexity_base_url="https://api.perplexity.ai")
    llm = PerplexityLLMService(settings)
    b = run_retrieval_stage(
        llm,
        settings,
        stage="B",
        official_id="11111111-1111-1111-1111-111111111111",
        subject_seed="Judge Test",
    )
    assert b.retrieval_stage == "B"
    assert b.evidence_items[0].claim == "C1"


def test_parse_stage_list_order_and_dedupe() -> None:
    assert parse_stage_list("C,A,B") == ["C", "A", "B"]
    assert parse_stage_list("A,A") == ["A"]


def test_persist_retrieval_bundle_insert_shape() -> None:
    from briefing.services.intelligence.evidence_bundle import EvidenceBundle, EvidenceItem

    bundle = EvidenceBundle(
        retrieval_stage="A",
        executive_summary="S",
        evidence_items=[EvidenceItem(claim="c", source_url=None, notes="")],
        entity_mentions=[],
    )
    table = MagicMock()
    client = MagicMock()
    client.table.return_value = table
    persist_retrieval_bundle(client, "22222222-2222-2222-2222-222222222222", bundle)
    client.table.assert_called_with("dossier_claims")
    kwargs = table.insert.call_args[0][0]
    assert kwargs["official_id"] == "22222222-2222-2222-2222-222222222222"
    assert kwargs["pipeline_stage"] == "retrieval_sonar"
    assert kwargs["metadata"]["retrieval_stage"] == "A"


def test_run_retrieval_stages_resolves_subject_without_db_when_subject_given() -> None:
    class _LLM:
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
            return _VALID_PAYLOAD

    settings = Settings(perplexity_api_key="x")
    bundles = run_retrieval_stages_for_official(
        _LLM(),
        settings,
        official_id="33333333-3333-3333-3333-333333333333",
        stages=["A"],
        subject="Explicit seed line",
        persist=False,
        dry_run=True,
        correlate=False,
    )
    assert len(bundles) == 1
    assert bundles[0].retrieval_stage == "A"
