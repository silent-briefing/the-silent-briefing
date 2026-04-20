from __future__ import annotations

from typing import Any

from briefing.config import Settings
from briefing.services.baseline.models import NormalizedCandidate


def _race_natural_key(c: NormalizedCandidate) -> tuple[str, str, str]:
    dist = c.district_for_race
    return (c.office_sought.strip(), dist or "", c.jurisdiction.strip())


def _ensure_race_id(client: Any, office_label: str, district: str, jurisdiction: str) -> str:
    payload = {
        "office_label": office_label,
        "district": district,
        "jurisdiction": jurisdiction,
        "metadata": {},
    }
    res = client.table("races").upsert(
        payload,
        on_conflict="office_label,district,jurisdiction",
    ).execute()
    if res.data and len(res.data) > 0 and res.data[0].get("id"):
        return str(res.data[0]["id"])
    sel = (
        client.table("races")
        .select("id")
        .eq("office_label", office_label)
        .eq("district", district)
        .eq("jurisdiction", jurisdiction)
        .limit(1)
        .execute()
    )
    if not sel.data:
        msg = f"race upsert/select failed for {office_label!r} {district!r} {jurisdiction!r}"
        raise RuntimeError(msg)
    return str(sel.data[0]["id"])


def persist_baseline_extraction(candidates: list[NormalizedCandidate], settings: Settings) -> int:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persist"
        raise RuntimeError(msg)
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    written = 0
    race_cache: dict[tuple[str, str, str], str] = {}
    for c in candidates:
        ok = _race_natural_key(c)
        if ok not in race_cache:
            race_cache[ok] = _ensure_race_id(client, ok[0], ok[1], ok[2])
        race_id = race_cache[ok]
        dist = ok[1]
        row = {
            "race_id": race_id,
            "dedupe_key": c.dedupe_key,
            "full_name": c.full_name,
            "party": c.party,
            "office_sought": c.office_sought,
            "incumbency": c.incumbency or "",
            "district": dist,
            "provenance": c.provenance,
            "metadata": c.metadata,
        }
        client.table("candidates").upsert(row, on_conflict="dedupe_key").execute()
        written += 1
    return written
