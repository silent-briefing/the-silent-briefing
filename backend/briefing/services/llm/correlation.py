from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from briefing.config import Settings, get_settings
from briefing.services.llm.base import LLMService

_CORRELATION_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "correlation_proposals",
        "schema": {
            "type": "object",
            "properties": {
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_name": {"type": "string"},
                            "source_entity_type": {"type": "string"},
                            "target_name": {"type": "string"},
                            "target_entity_type": {"type": "string"},
                            "relation": {"type": "string"},
                            "confidence": {"type": "number"},
                            "rationale": {"type": "string"},
                        },
                        "required": [
                            "source_name",
                            "source_entity_type",
                            "target_name",
                            "target_entity_type",
                            "relation",
                            "confidence",
                        ],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["edges"],
            "additionalProperties": False,
        },
    },
}

_ALLOWED_TYPES = frozenset({"person", "bill", "issue", "organization", "race"})


def normalize_entity_type(raw: str) -> str:
    t = raw.strip().lower()
    if t in _ALLOWED_TYPES:
        return t
    aliases = {
        "judge": "person",
        "justice": "person",
        "official": "person",
        "legislation": "bill",
        "statute": "bill",
        "law": "bill",
        "topic": "issue",
        "org": "organization",
        "election": "race",
    }
    return aliases.get(t, "person")


@dataclass
class CorrelationResult:
    edges: list[dict[str, Any]]
    inserted: int = 0
    skipped_low_confidence: int = 0
    skipped_duplicate: int = 0
    skipped_self_loop: int = 0
    errors: list[str] = field(default_factory=list)


def propose_edges_from_text(
    llm: LLMService,
    settings: Settings,
    *,
    text: str,
    context: str = "",
) -> list[dict[str, Any]]:
    """Stage 1: LLM proposes edges (cheap Sonar tier)."""
    system = (
        "You extract graph edges for a political intelligence system. "
        "Given TEXT (and optional CONTEXT), return ONLY JSON matching the schema. "
        "entity_type for each endpoint must be one of: person, bill, issue, organization, race. "
        "Relations are short snake_case verbs: mentions, cites, concerns, sponsored, related_to, etc. "
        "confidence is 0.0–1.0 based on how explicit the TEXT supports the link."
    )
    body = text.strip()[:12000]
    ctx = (context or "").strip()[:4000]
    user = f"CONTEXT:\n{ctx}\n\nTEXT:\n{body}"
    raw = llm.chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        model=settings.correlation_model,
        response_format=_CORRELATION_RESPONSE_FORMAT,
        temperature=0.1,
    )
    data = json.loads(raw)
    edges = data.get("edges") or []
    return [e for e in edges if isinstance(e, dict)]


def _find_entity_id(client: Any, *, entity_type: str, name: str) -> str | None:
    n = name.strip()
    if not n:
        return None
    r = (
        client.table("entities")
        .select("id")
        .eq("type", entity_type)
        .eq("canonical_name", n)
        .limit(1)
        .execute()
    )
    if r.data:
        return str(r.data[0]["id"])
    r2 = (
        client.table("entities")
        .select("id")
        .eq("type", entity_type)
        .ilike("canonical_name", f"%{n}%")
        .limit(1)
        .execute()
    )
    if r2.data:
        return str(r2.data[0]["id"])
    return None


def _ensure_entity_id(client: Any, *, entity_type: str, name: str) -> str:
    found = _find_entity_id(client, entity_type=entity_type, name=name)
    if found:
        return found
    ins = (
        client.table("entities")
        .insert(
            {
                "type": entity_type,
                "canonical_name": name.strip(),
                "metadata": {"source": "correlation_engine"},
            }
        )
        .execute()
    )
    if not ins.data:
        msg = f"entity insert failed for {name!r}"
        raise RuntimeError(msg)
    return str(ins.data[0]["id"])


def _edge_exists(client: Any, *, source_id: str, target_id: str, relation: str) -> bool:
    r = (
        client.table("entity_edges")
        .select("id")
        .eq("source_entity_id", source_id)
        .eq("target_entity_id", target_id)
        .eq("relation", relation.strip())
        .limit(1)
        .execute()
    )
    return bool(r.data)


def persist_proposed_edges(
    client: Any,
    edges: list[dict[str, Any]],
    *,
    min_confidence: float = 0.8,
) -> CorrelationResult:
    """Insert entity_edges for proposals at or above min_confidence; create missing entities."""
    result = CorrelationResult(edges=list(edges))
    for e in edges:
        try:
            conf = float(e.get("confidence", 0))
        except (TypeError, ValueError):
            result.errors.append(f"bad confidence: {e!r}")
            continue
        if conf < min_confidence:
            result.skipped_low_confidence += 1
            continue
        st = normalize_entity_type(str(e.get("source_entity_type", "person")))
        tt = normalize_entity_type(str(e.get("target_entity_type", "person")))
        sn = str(e.get("source_name", "")).strip()
        tn = str(e.get("target_name", "")).strip()
        rel = str(e.get("relation", "")).strip()
        if not sn or not tn or not rel:
            result.errors.append(f"missing fields: {e!r}")
            continue
        sid = _ensure_entity_id(client, entity_type=st, name=sn)
        tid = _ensure_entity_id(client, entity_type=tt, name=tn)
        if sid == tid:
            result.skipped_self_loop += 1
            continue
        if _edge_exists(client, source_id=sid, target_id=tid, relation=rel):
            result.skipped_duplicate += 1
            continue
        client.table("entity_edges").insert(
            {
                "source_entity_id": sid,
                "target_entity_id": tid,
                "relation": rel,
                "confidence": conf,
                "provenance": {
                    "source": "correlation_engine",
                    "rationale": str(e.get("rationale", "")),
                },
                "status": "proposed",
            }
        ).execute()
        result.inserted += 1
    return result


def run_correlation_pass(
    llm: LLMService,
    *,
    text: str,
    context: str = "",
    persist: bool = False,
    dry_run: bool = False,
    min_confidence: float = 0.8,
    settings: Settings | None = None,
) -> CorrelationResult:
    s = settings or get_settings()
    edges = propose_edges_from_text(llm, s, text=text, context=context)
    if not persist or dry_run:
        return CorrelationResult(edges=edges)
    if not s.supabase_url or not s.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persist"
        raise RuntimeError(msg)
    from supabase import create_client

    client = create_client(s.supabase_url, s.supabase_service_role_key)
    return persist_proposed_edges(client, edges, min_confidence=min_confidence)
