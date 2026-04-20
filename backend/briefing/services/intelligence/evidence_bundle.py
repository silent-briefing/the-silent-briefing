"""Structured Stage 1 (A/B/C retrieval) artifacts for Step 3 dossier pipeline."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

RetrievalStageCode = Literal["A", "B", "C"]


class EvidenceItem(BaseModel):
    """One atomic, source-grounded line suitable for Stage 2 and critique."""

    claim: str = Field(..., min_length=1)
    source_url: str | None = None
    notes: str = ""

    @field_validator("claim")
    @classmethod
    def strip_claim(cls, v: str) -> str:
        return v.strip()


class EvidenceBundle(BaseModel):
    """Single retrieval pass (bio / record / vetting). `retrieval_stage` is set by the runner, not the model."""

    retrieval_stage: RetrievalStageCode
    executive_summary: str = Field(..., min_length=1)
    evidence_items: list[EvidenceItem] = Field(default_factory=list)
    entity_mentions: list[str] = Field(default_factory=list)

    @field_validator("executive_summary")
    @classmethod
    def strip_summary(cls, v: str) -> str:
        return v.strip()

    def to_prompt_block(self) -> str:
        """Compact text for Stage 2 writer prompts."""
        lines = [f"## Stage {self.retrieval_stage}", "", self.executive_summary, ""]
        for i, it in enumerate(self.evidence_items, start=1):
            src = it.source_url or "(no URL)"
            lines.append(f"{i}. {it.claim} — source: {src}")
            if it.notes:
                lines.append(f"   notes: {it.notes}")
        if self.entity_mentions:
            lines.append("")
            lines.append("Entity mentions: " + ", ".join(self.entity_mentions))
        return "\n".join(lines)


def category_for_stage(stage: RetrievalStageCode) -> str:
    return {
        "A": "Research / Stage A",
        "B": "Research / Stage B",
        "C": "Research / Stage C",
    }[stage]


def evidence_bundle_response_schema() -> dict[str, Any]:
    """`response_format` for LLM JSON (stage omitted — caller sets it)."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "evidence_bundle_payload",
            "schema": {
                "type": "object",
                "properties": {
                    "executive_summary": {"type": "string"},
                    "evidence_items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "claim": {"type": "string"},
                                "source_url": {"type": ["string", "null"]},
                                "notes": {"type": "string"},
                            },
                            "required": ["claim", "source_url", "notes"],
                            "additionalProperties": False,
                        },
                    },
                    "entity_mentions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["executive_summary", "evidence_items", "entity_mentions"],
                "additionalProperties": False,
            },
        },
    }
