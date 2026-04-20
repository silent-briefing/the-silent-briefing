from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

from briefing.config import Settings
from briefing.services.intelligence.dossier_writer import (
    fetch_retrieval_bundles_for_official,
    merge_bundles_for_prompt,
    run_dossier_write_from_claims,
)
from briefing.services.intelligence.evidence_bundle import EvidenceBundle, EvidenceItem


def _bundle_a(*, summary: str = "Sum") -> dict[str, Any]:
    b = EvidenceBundle(
        retrieval_stage="A",
        executive_summary=summary,
        evidence_items=[EvidenceItem(claim="c1", source_url="https://z", notes="")],
        entity_mentions=[],
    )
    return b.model_dump(mode="json")


def test_fetch_retrieval_bundles_orders_abc_and_dedupes() -> None:
    # API returns newest first; first Stage A row wins (newer "Sum" over "Older").
    rows = [
        {"metadata": {"evidence_bundle": _bundle_a(summary="Sum")}, "created_at": "2026-01-02"},
        {
            "metadata": {"evidence_bundle": _bundle_a(summary="Older")},
            "created_at": "2026-01-01",
        },
        {
            "metadata": {
                "evidence_bundle": EvidenceBundle(
                    retrieval_stage="B",
                    executive_summary="B sum",
                    evidence_items=[],
                    entity_mentions=[],
                ).model_dump(mode="json")
            },
            "created_at": "2026-01-01",
        },
    ]
    order_final = MagicMock()
    order_final.execute.return_value = MagicMock(data=rows)
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.in_.return_value.order.return_value = (
        order_final
    )

    out = fetch_retrieval_bundles_for_official(client, "uuid")
    assert [b.retrieval_stage for b in out] == ["A", "B"]
    assert out[0].executive_summary == "Sum"


def test_merge_bundles_includes_rag() -> None:
    b = EvidenceBundle(
        retrieval_stage="A",
        executive_summary="S",
        evidence_items=[],
        entity_mentions=[],
    )
    text = merge_bundles_for_prompt([b], "snippet body")
    assert "Stage A" in text
    assert "snippet body" in text


@patch("supabase.create_client")
def test_run_dossier_write_from_claims_dry_run(mock_create: MagicMock) -> None:
    rows = [{"metadata": {"evidence_bundle": _bundle_a()}, "created_at": "2026-01-01"}]
    order_final = MagicMock()
    order_final.execute.return_value = MagicMock(data=rows)
    client = MagicMock()
    mock_create.return_value = client
    client.table.return_value.select.return_value.eq.return_value.in_.return_value.order.return_value = (
        order_final
    )

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
            return "## Draft\n\nHello"

    text = run_dossier_write_from_claims(
        _LLM(),
        Settings(
            perplexity_api_key="k",
            supabase_url="http://127.0.0.1:54321",
            supabase_service_role_key="srk",
        ),
        official_id="44444444-4444-4444-4444-444444444444",
        dry_run=True,
        persist=False,
    )

    assert "Draft" in text
    assert not client.table.return_value.insert.called
