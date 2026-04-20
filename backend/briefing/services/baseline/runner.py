from __future__ import annotations

from typing import Literal

from briefing.config import Settings, get_settings
from briefing.services.baseline.models import NormalizedCandidate
from briefing.services.baseline.civic import fetch_google_civic_candidates
from briefing.services.baseline.slco import fetch_slco_candidates
from briefing.services.baseline.vote_utah import fetch_vote_utah_candidates

SourceName = Literal["vote_utah", "slco", "civic"]


def _merge_by_dedupe_key(rows: list[NormalizedCandidate]) -> list[NormalizedCandidate]:
    by_key: dict[str, NormalizedCandidate] = {}
    for c in rows:
        k = c.dedupe_key
        if k not in by_key:
            by_key[k] = c
            continue
        prev = by_key[k]
        merged_prov = {**prev.provenance, **c.provenance}
        merged_meta = {**prev.metadata, **c.metadata}
        by_key[k] = NormalizedCandidate(
            full_name=prev.full_name,
            office_sought=prev.office_sought,
            party=prev.party or c.party,
            incumbency=prev.incumbency or c.incumbency,
            district=prev.district or c.district,
            jurisdiction=prev.jurisdiction,
            provenance=merged_prov,
            metadata=merged_meta,
        )
    return list(by_key.values())


def run_baseline_extraction(
    *,
    persist: bool = False,
    dry_run: bool = False,
    sources: list[SourceName] | None = None,
    settings: Settings | None = None,
) -> tuple[list[NormalizedCandidate], int]:
    s = settings or get_settings()
    want: list[SourceName] = list(sources) if sources else ["vote_utah", "slco", "civic"]
    collected: list[NormalizedCandidate] = []
    if "vote_utah" in want:
        collected.extend(fetch_vote_utah_candidates(s))
    if "slco" in want:
        collected.extend(fetch_slco_candidates(s))
    if "civic" in want:
        collected.extend(fetch_google_civic_candidates(s))
    merged = _merge_by_dedupe_key(collected)
    n_persisted = 0
    if persist and not dry_run:
        from briefing.services.persistence.baseline_upsert import persist_baseline_extraction as do_persist

        n_persisted = do_persist(merged, s)
    return merged, n_persisted
