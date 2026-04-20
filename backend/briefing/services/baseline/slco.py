from __future__ import annotations

import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from briefing.config import Settings
from briefing.services.baseline.fetcher import maybe_write_artifact
from briefing.services.baseline.models import NormalizedCandidate

_PARTY = re.compile(
    r"(Democratic|Republican|Unaffiliated|Constitution|Forward|Libertarian|Independent|"
    r"United Utah Party|Legalize Marijuana|Better United)\s*-\s*Filed",
    re.IGNORECASE,
)


def _split_candidates_blob(blob: str) -> list[tuple[str, str]]:
    """Parse SLCo race div: repeated 'Name … Party - Filed' blobs."""
    found: list[tuple[str, str]] = []
    last_end = 0
    for m in _PARTY.finditer(blob):
        name_part = blob[last_end : m.start()].strip()
        party = m.group(1)
        last_end = m.end()
        if not name_part:
            continue
        name = re.sub(r"\s+", " ", name_part).strip(" ,.-")
        if len(name) < 2:
            continue
        if name.isupper():
            name = name.title()
        found.append((name, party))
    return found


def fetch_slco_candidates(settings: Settings) -> list[NormalizedCandidate]:
    if not settings.slco_playwright_enabled:
        return []
    out: list[NormalizedCandidate] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(user_agent=settings.http_user_agent)
            page.goto(
                settings.slco_candidate_list_url,
                wait_until="networkidle",
                timeout=90_000,
            )
            try:
                page.locator("select").first.select_option(label="All")
            except Exception:
                pass
            page.wait_for_timeout(3000)
            html = page.content()
        finally:
            browser.close()
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    maybe_write_artifact(
        settings.extraction_artifacts_dir or None,
        f"slco_candidates_{ts}.html",
        html,
    )
    soup = BeautifulSoup(html, "lxml")
    for h3 in soup.find_all("h3"):
        office = h3.get_text(" ", strip=True)
        if not office or office.lower().startswith("filter"):
            continue
        sib = h3.find_next_sibling()
        if not sib or sib.name != "div":
            continue
        blob = sib.get_text(" ", strip=True)
        for name, party in _split_candidates_blob(blob):
            out.append(
                NormalizedCandidate(
                    full_name=name,
                    office_sought=office,
                    party=party,
                    incumbency="",
                    jurisdiction="Salt Lake County",
                    provenance={"source": "slco_clerk_candidate_list"},
                )
            )
    return out
