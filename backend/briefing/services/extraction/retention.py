"""Ballotpedia judicial retention elections → structured rows → dossier_claims."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

from briefing.config import Settings, get_settings

RETENTION_CATEGORY = "Retention Voting"
METADATA_SOURCE = "ballotpedia_retention"

# Rare slug → Ballotpedia page title (underscore form) when heuristics fail.
BALLOTPEDIA_PAGE_OVERRIDES: dict[str, str] = {}

_PCT = re.compile(r"^\d+(?:\.\d+)?$")
_DIGITS = re.compile(r"^[\d,]+$")


@dataclass(frozen=True)
class RetentionEvent:
    election_year: int
    office: str
    summary: str
    yes_pct: float
    no_pct: float
    yes_votes: int | None
    no_votes: int | None
    total_votes: int | None
    source_url: str | None


def ballotpedia_title_from_official_slug(slug: str) -> str:
    parts = [p for p in slug.strip().lower().split("-") if p]
    parts = [p for p in parts if not (len(p) == 1 and p.isalpha())]
    if not parts:
        msg = f"Cannot derive Ballotpedia title from slug {slug!r}"
        raise ValueError(msg)
    return "_".join(p.title() for p in parts)


def fetch_ballotpedia_html(title: str, user_agent: str, ballotpedia_base: str) -> str:
    url = f"{ballotpedia_base.rstrip('/')}/{title}"
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    with httpx.Client(timeout=60.0, follow_redirects=True, headers=headers) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _parse_int_maybe(s: str) -> int | None:
    s = s.strip().replace(",", "")
    if not s or not _DIGITS.match(s):
        return None
    return int(s)


def _parse_pct_from_cell(td: Tag) -> float | None:
    num = td.select_one(".percentage_number")
    if num and num.get_text(strip=True):
        t = num.get_text(strip=True)
        if _PCT.match(t):
            return float(t)
    return None


def _parse_votes_from_row(row: Tag) -> tuple[float | None, int | None]:
    tds = row.find_all("td", recursive=False)
    pct: float | None = None
    votes: int | None = None
    for td in tds:
        if td.select_one(".outer_percentage"):
            pct = _parse_pct_from_cell(td)
        else:
            raw = td.get_text(strip=True).replace(",", "")
            if raw and _DIGITS.match(raw.replace(",", "")):
                v = _parse_int_maybe(raw)
                if v is not None:
                    votes = v
    return pct, votes


def _parse_retention_votebox(
    votebox: Tag,
    election_year: int,
    page_url: str,
    *,
    ballotpedia_base: str,
) -> RetentionEvent | None:
    header = votebox.select_one(".race_header h5")
    office = header.get_text(" ", strip=True) if header else "Unknown court"

    blurb = votebox.select_one("p.results_text")
    summary = blurb.get_text(" ", strip=True) if blurb else ""

    table = votebox.select_one("table.results_table")
    if table is None:
        return None
    body = " ".join(table.get_text(" ", strip=True).lower().split())
    if "retention" not in body and "retain" not in summary.lower():
        return None

    yes_pct = no_pct = None
    yes_votes = no_votes = total_votes = None
    for tr in table.select("tr.results_row"):
        label_td = None
        for td in tr.find_all("td", recursive=False):
            divs = td.find_all("div", recursive=False)
            if divs and divs[0].get_text(strip=True) in ("Yes", "No"):
                label_td = divs[0].get_text(strip=True)
                break
        if label_td not in ("Yes", "No"):
            continue
        pct, votes = _parse_votes_from_row(tr)
        if label_td == "Yes":
            yes_pct, yes_votes = pct, votes
        else:
            no_pct, no_votes = pct, votes

    for tr in table.select("tr.results_row"):
        t = tr.get_text(" ", strip=True).lower()
        if "total" in t:
            tds = tr.find_all("td", recursive=False)
            if tds:
                last = tds[-1].get_text(strip=True)
                total_votes = _parse_int_maybe(last)

    if yes_pct is None or no_pct is None:
        return None

    canvass = votebox.select_one("a[href*='voteinfo.utah.gov'], a[href*='.pdf']")
    source_url = canvass.get("href") if canvass else page_url
    if source_url and not source_url.startswith("http"):
        source_url = urljoin(f"{ballotpedia_base.rstrip('/')}/", source_url)

    return RetentionEvent(
        election_year=election_year,
        office=office,
        summary=summary,
        yes_pct=yes_pct,
        no_pct=no_pct,
        yes_votes=yes_votes,
        no_votes=no_votes,
        total_votes=total_votes,
        source_url=source_url,
    )


def _elections_section_h2(soup: BeautifulSoup) -> Tag | None:
    """MediaWiki puts mw-headline id on a span inside h2, not on h2 itself."""
    span = soup.select_one("span.mw-headline#Elections")
    if span and isinstance(span, Tag):
        parent = span.find_parent("h2")
        if parent and isinstance(parent, Tag):
            return parent
    h2 = soup.find("h2", id="Elections")
    return h2 if isinstance(h2, Tag) else None


def parse_retention_from_ballotpedia_html(
    html: str,
    page_url: str,
    *,
    ballotpedia_base: str,
) -> list[RetentionEvent]:
    soup = BeautifulSoup(html, "lxml")
    elections = _elections_section_h2(soup)
    if elections is None:
        return []

    events: list[RetentionEvent] = []
    current_year: int | None = None
    for sib in elections.find_next_siblings():
        if not isinstance(sib, Tag):
            continue
        if sib.name == "h2":
            break
        if sib.name == "h3":
            hid = sib.find(class_="mw-headline")
            raw = (hid.get("id") if hid and hid.get("id") else "") or (
                hid.get_text(strip=True) if hid else sib.get_text(strip=True)
            )
            m = re.match(r"^(\d{4})", (raw or "").strip())
            if m:
                current_year = int(m.group(1))
        if sib.name == "div" and "votebox" in (sib.get("class") or []):
            if current_year is None:
                continue
            ev = _parse_retention_votebox(
                sib, current_year, page_url, ballotpedia_base=ballotpedia_base
            )
            if ev:
                events.append(ev)
    return events


def validate_golden_retention_hagen_pohlman(
    by_slug: dict[str, list[RetentionEvent]],
) -> None:
    for need in ("diana-hagen", "jill-m-pohlman"):
        if need not in by_slug or not by_slug[need]:
            msg = f"Golden retention: expected events for slug {need!r}"
            raise RuntimeError(msg)
        y2020 = [e for e in by_slug[need] if e.election_year == 2020]
        if not y2020:
            msg = f"Golden retention: expected 2020 retention for {need!r}"
            raise RuntimeError(msg)
        e = y2020[0]
        if e.yes_pct < 80 or e.yes_pct > 86:
            msg = f"Golden retention: yes_pct out of band for {need!r}: {e.yes_pct}"
            raise RuntimeError(msg)


def _claim_payload(official_id: str, slug: str, ev: RetentionEvent) -> dict[str, Any]:
    votes = []
    if ev.yes_votes is not None:
        votes.append(f"Yes votes: {ev.yes_votes:,}")
    if ev.no_votes is not None:
        votes.append(f"No votes: {ev.no_votes:,}")
    if ev.total_votes is not None:
        votes.append(f"Total: {ev.total_votes:,}")
    vote_line = "; ".join(votes) if votes else ""
    claim = (
        f"{ev.election_year} retention — {ev.office}. "
        f"Yes {ev.yes_pct:.1f}%, No {ev.no_pct:.1f}%. {vote_line} {ev.summary}".strip()
    )
    meta = {
        "source": METADATA_SOURCE,
        "official_slug": slug,
        "election_year": ev.election_year,
        "office": ev.office,
        "yes_pct": ev.yes_pct,
        "no_pct": ev.no_pct,
        "yes_votes": ev.yes_votes,
        "no_votes": ev.no_votes,
        "total_votes": ev.total_votes,
    }
    return {
        "official_id": official_id,
        "claim_text": claim[:20000],
        "category": RETENTION_CATEGORY,
        "source_url": ev.source_url,
        "pipeline_stage": "retrieval_sonar",
        "metadata": meta,
    }


def _delete_prior_ballotpedia_claims(client: Any, official_id: str) -> None:
    res = (
        client.table("dossier_claims")
        .select("id,metadata")
        .eq("official_id", official_id)
        .eq("category", RETENTION_CATEGORY)
        .execute()
    )
    for row in res.data or []:
        if (row.get("metadata") or {}).get("source") == METADATA_SOURCE:
            client.table("dossier_claims").delete().eq("id", row["id"]).execute()


def persist_retention_for_ut_supreme(
    rows_by_slug: dict[str, list[RetentionEvent]],
    settings: Settings,
) -> int:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --persist"
        raise RuntimeError(msg)
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    jur = client.table("jurisdictions").select("id").eq("slug", "ut").limit(1).execute()
    if not jur.data:
        msg = "No jurisdiction with slug 'ut'"
        raise RuntimeError(msg)
    ut_id = jur.data[0]["id"]

    off = (
        client.table("officials")
        .select("id,slug")
        .eq("jurisdiction_id", ut_id)
        .eq("office_type", "state_supreme_justice")
        .execute()
    )
    by_slug_db = {r["slug"]: r["id"] for r in (off.data or [])}
    inserted = 0
    for slug, events in rows_by_slug.items():
        oid = by_slug_db.get(slug)
        if not oid or not events:
            continue
        _delete_prior_ballotpedia_claims(client, oid)
        for ev in events:
            client.table("dossier_claims").insert(_claim_payload(oid, slug, ev)).execute()
            inserted += 1
    return inserted


def run_retention_extraction(
    *,
    settings: Settings | None = None,
    slugs: list[str] | None = None,
    persist: bool = False,
    dry_run: bool = False,
) -> tuple[dict[str, list[RetentionEvent]], int]:
    cfg = settings or get_settings()
    from briefing.services.extraction.judicial import run_ut_supreme_extraction

    roster = run_ut_supreme_extraction(fetch_bios=False, dry_run=True, settings=cfg)
    target_slugs = {r.slug for r in roster}
    if slugs:
        target_slugs = target_slugs & set(slugs)

    bp = cfg.ballotpedia_base_url
    out: dict[str, list[RetentionEvent]] = {}
    for slug in sorted(target_slugs):
        title = BALLOTPEDIA_PAGE_OVERRIDES.get(slug) or ballotpedia_title_from_official_slug(slug)
        html = fetch_ballotpedia_html(title, cfg.http_user_agent, bp)
        page_url = f"{bp.rstrip('/')}/{title}"
        events = parse_retention_from_ballotpedia_html(
            html, page_url, ballotpedia_base=bp
        )
        out[slug] = events

    validate_golden_retention_hagen_pohlman(out)

    if dry_run:
        return out, 0
    if persist:
        return out, persist_retention_for_ut_supreme(out, cfg)
    return out, 0
