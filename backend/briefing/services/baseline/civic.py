from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from briefing.config import Settings
from briefing.services.baseline.fetcher import maybe_write_artifact
from briefing.services.baseline.models import NormalizedCandidate


def _district_bits(contest: dict[str, Any]) -> str:
    d = contest.get("district")
    if not d or not isinstance(d, dict):
        return ""
    name = d.get("name")
    if isinstance(name, str) and name.strip():
        m = re.search(r"(\d+)", name)
        return m.group(1) if m else ""
    return ""


def parse_voter_info_response(payload: dict[str, Any]) -> list[NormalizedCandidate]:
    out: list[NormalizedCandidate] = []
    state = ""
    ni = payload.get("normalizedInput")
    if isinstance(ni, dict):
        state = (ni.get("state") or "") if isinstance(ni.get("state"), str) else ""

    for contest in payload.get("contests") or []:
        if not isinstance(contest, dict):
            continue
        office = (contest.get("office") or contest.get("ballotTitle") or "").strip()
        if not office:
            continue
        level = contest.get("level")
        dist = _district_bits(contest)
        for cand in contest.get("candidates") or []:
            if not isinstance(cand, dict):
                continue
            name = (cand.get("name") or "").strip()
            if not name:
                continue
            party = cand.get("party")
            party_s = party.strip() if isinstance(party, str) and party.strip() else None
            juris = state or "UT"
            out.append(
                NormalizedCandidate(
                    full_name=name,
                    office_sought=office,
                    party=party_s,
                    incumbency="",
                    district=dist,
                    jurisdiction=juris,
                    provenance={
                        "source": "google_civic_voterinfo",
                        "candidate_url": cand.get("candidateUrl"),
                        "contest_level": level,
                    },
                )
            )
    return out


def fetch_google_civic_candidates(settings: Settings) -> list[NormalizedCandidate]:
    if not settings.google_civic_api_key or not settings.google_civic_voter_address:
        return []
    url = "https://www.googleapis.com/civicinfo/v2/voterinfo"
    params: dict[str, str] = {
        "address": settings.google_civic_voter_address,
        "key": settings.google_civic_api_key,
    }
    if settings.google_civic_election_id.strip():
        params["electionId"] = settings.google_civic_election_id.strip()
    headers = {"User-Agent": settings.http_user_agent}
    with httpx.Client(timeout=60.0, headers=headers) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        payload = resp.json()
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    maybe_write_artifact(
        settings.extraction_artifacts_dir or None,
        f"google_civic_voterinfo_{ts}.json",
        json.dumps(payload, indent=2),
    )
    return parse_voter_info_response(payload)
