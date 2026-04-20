from __future__ import annotations

import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup

from briefing.config import Settings
from briefing.services.baseline.fetcher import maybe_write_artifact, resilient_get_text
from briefing.services.baseline.models import NormalizedCandidate

_STATUS_SKIP = re.compile(r"^(withdrawn|rejected|declined)\b", re.IGNORECASE)


def parse_vote_utah_filings_html(html: str) -> list[NormalizedCandidate]:
    soup = BeautifulSoup(html, "lxml")
    out: list[NormalizedCandidate] = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        header_cells = [c.get_text(strip=True).lower() for c in rows[0].find_all(["th", "td"])]
        if header_cells[:4] != ["candidate", "office", "party", "status"]:
            continue
        for tr in rows[1:]:
            cells = [c.get_text(strip=True) for c in tr.find_all("td")]
            if len(cells) < 4:
                continue
            name, office, party, status = cells[0], cells[1], cells[2], cells[3]
            if not name or not office:
                continue
            if _STATUS_SKIP.search(status or ""):
                continue
            out.append(
                NormalizedCandidate(
                    full_name=re.sub(r"\s+", " ", name).strip(),
                    office_sought=re.sub(r"\s+", " ", office).strip(),
                    party=party.strip() if party else None,
                    incumbency="",
                    jurisdiction="UT",
                    provenance={
                        "source": "vote_utah_filings",
                        "status": status,
                    },
                )
            )
    return out


def fetch_vote_utah_candidates(settings: Settings) -> list[NormalizedCandidate]:
    html = resilient_get_text(settings.vote_utah_filings_url, user_agent=settings.http_user_agent)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    maybe_write_artifact(
        settings.extraction_artifacts_dir or None,
        f"vote_utah_filings_{ts}.html",
        html,
    )
    return parse_vote_utah_filings_html(html)
