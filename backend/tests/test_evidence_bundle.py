from __future__ import annotations

import json
from pathlib import Path

from briefing.services.intelligence.evidence_bundle import (
    EvidenceBundle,
    category_for_stage,
    evidence_bundle_response_schema,
)

_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "evidence_bundle_golden.json"


def test_evidence_bundle_golden_roundtrip() -> None:
    raw = _FIXTURE.read_text(encoding="utf-8")
    b = EvidenceBundle.model_validate_json(raw)
    assert b.retrieval_stage == "A"
    assert len(b.evidence_items) == 1
    assert "Example" in b.to_prompt_block()


def test_category_for_stage() -> None:
    assert category_for_stage("A") == "Research / Stage A"
    assert category_for_stage("C") == "Research / Stage C"


def test_evidence_bundle_response_schema_shape() -> None:
    schema = evidence_bundle_response_schema()
    assert schema["type"] == "json_schema"
    assert "evidence_bundle_payload" in schema["json_schema"]["name"]
