from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from briefing.config import Settings
from briefing.services.llm.adversarial_pipeline import (
    persist_pipeline_runs,
    run_adversarial_dossier_pipeline,
)


class _SeqLLM:
    """Deterministic LLM for four-stage pipeline (no HTTP)."""

    def __init__(self, responses: list[str]) -> None:
        self._q = list(responses)

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
        if not self._q:
            raise RuntimeError("no mocked responses left")
        return self._q.pop(0)


def test_run_adversarial_pipeline_four_stages_groundedness() -> None:
    evidence = (
        '{"evidence_items":[{"claim":"Justice Example served from 2020.",'
        '"source_url":"https://example.org/bio","notes":""}],"summary":"Short"}'
    )
    draft = "## Draft\n\nJustice Example served from 2020 per court bio."
    critique = '{"issues":[],"unsupported_claims":[],"severity":"low"}'
    synthesis = (
        '{"final_dossier":"## Final\\n\\nJustice Example served from 2020 (verified).",'
        '"groundedness_score":0.88,"requires_human_review":false}'
    )
    llm = _SeqLLM([evidence, draft, critique, synthesis])
    settings = Settings(perplexity_api_key="x")
    result = run_adversarial_dossier_pipeline(
        llm,
        subject_brief="Utah Supreme Court Justice Example — tenure summary.",
        settings=settings,
        dry_run=True,
    )
    assert result.groundedness_score >= 0.7
    assert not result.requires_human_review
    assert "Final" in result.final_dossier
    assert len(result.stage_summaries) == 4


def test_persist_pipeline_runs_four_inserts() -> None:
    settings = Settings(
        perplexity_api_key="x",
        correlation_model="sonar",
        writer_model="sonar-pro",
        adversarial_model="sonar-reasoning-pro",
    )
    table = MagicMock()
    exec_result = MagicMock()
    exec_result.data = [{"id": "11111111-1111-1111-1111-111111111111"}]
    table.insert.return_value.execute.return_value = exec_result
    client = MagicMock()
    client.table.return_value = table

    ids = persist_pipeline_runs(
        client,
        official_id="22222222-2222-2222-2222-222222222222",
        base_key="test-key",
        evidence_json="{}",
        primary_draft="draft",
        critique_json="{}",
        final_dossier="final",
        groundedness_score=0.81,
        requires_human_review=False,
        settings=settings,
    )
    assert len(ids) == 4
    assert table.insert.call_count == 4
    last_call = table.insert.call_args_list[-1][0][0]
    assert last_call["groundedness_score"] == 0.81
    assert last_call["requires_human_review"] is False
    assert last_call["raw_response"]["stage"] == "synthesize"


def test_persist_requires_official_id() -> None:
    llm = _SeqLLM(
        [
            '{"evidence_items":[],"summary":""}',
            "draft",
            '{"issues":[],"unsupported_claims":[],"severity":"low"}',
            '{"final_dossier":"x","groundedness_score":0.9,"requires_human_review":false}',
        ]
    )
    settings = Settings(perplexity_api_key="x", supabase_url="http://x", supabase_service_role_key="k")
    with pytest.raises(ValueError, match="official_id"):
        run_adversarial_dossier_pipeline(
            llm,
            subject_brief="test",
            persist=True,
            dry_run=False,
            settings=settings,
        )
