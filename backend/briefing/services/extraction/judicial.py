"""Utah Supreme Court roster extraction from utcourts.gov judges bios."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from briefing.config import Settings, get_settings
from briefing.services.settings import merge_source_urls_from_db


@dataclass(frozen=True)
class JusticeRow:
    full_name: str
    slug: str
    bio_url: str | None
    retention_year: int | None
    bio_summary: str | None


_ROSTER_PREFIX = re.compile(
    r"^(associate\s+chief\s+justice|chief\s+justice|justice)\s+",
    re.IGNORECASE,
)
_RETENTION_IN_BIO = re.compile(
    r"retention[^.]{0,120}?\b(20[2-3]\d)\b",
    re.IGNORECASE,
)


def fetch_sup_html(url: str, user_agent: str) -> str:
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    with httpx.Client(timeout=45.0, follow_redirects=True, headers=headers) as client:
        resp = client.get(url)
        if resp.status_code == 200 and len(resp.text) > 500:
            return resp.text

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(user_agent=user_agent)
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_timeout(1500)
            return page.content()
        finally:
            browser.close()


def _title_case_name(raw_label: str) -> str:
    t = _ROSTER_PREFIX.sub("", raw_label.strip())
    return t.title()


def parse_ut_supreme_roster(html: str, *, site_origin: str) -> list[JusticeRow]:
    """Parse the supreme-court.html roster: one row per biography link."""
    soup = BeautifulSoup(html, "lxml")
    base = site_origin.rstrip("/")
    by_href: dict[str, JusticeRow] = {}

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if "/judges-bios/appellate-courts/supreme-court/" not in href:
            continue
        if not href.endswith(".html"):
            continue
        leaf = href.rstrip("/").split("/")[-1].lower()
        if leaf == "supreme-court.html":
            continue

        label = a.get_text(" ", strip=True)
        if not label or label.lower() == "biography":
            continue
        if not _ROSTER_PREFIX.match(label):
            continue

        abs_url = urljoin(base, href)
        slug = urlparse(abs_url).path.rstrip("/").split("/")[-1].replace(".html", "")
        name = _title_case_name(label)
        by_href[abs_url] = JusticeRow(
            full_name=name,
            slug=slug,
            bio_url=abs_url,
            retention_year=None,
            bio_summary=None,
        )

    rows = list(by_href.values())
    rows.sort(key=lambda r: r.full_name.lower())
    return rows


def _retention_from_bio_html(html: str) -> int | None:
    m = _RETENTION_IN_BIO.search(BeautifulSoup(html, "lxml").get_text(" ", strip=True))
    if not m:
        return None
    y = int(m.group(1))
    if 2020 <= y <= 2032:
        return y
    return None


def _fetch_bio_summary(bio_url: str, user_agent: str, limit: int = 600) -> tuple[str | None, int | None]:
    try:
        html = fetch_sup_html(bio_url, user_agent)
    except Exception:
        return None, None
    retention = _retention_from_bio_html(html)
    soup = BeautifulSoup(html, "lxml")
    for p in soup.find_all("p"):
        t = " ".join(p.get_text().split())
        if len(t) > 80:
            return t[:limit], retention
    return None, retention


def enrich_bios(rows: list[JusticeRow], user_agent: str) -> list[JusticeRow]:
    out: list[JusticeRow] = []
    for r in rows:
        bio, retention = (None, r.retention_year)
        if r.bio_url:
            bio, yr = _fetch_bio_summary(r.bio_url, user_agent)
            if yr is not None:
                retention = yr
        out.append(
            JusticeRow(
                full_name=r.full_name,
                slug=r.slug,
                bio_url=r.bio_url,
                retention_year=retention,
                bio_summary=bio,
            )
        )
    return out


def validate_golden_ut_2026(rows: list[JusticeRow]) -> None:
    blob = " ".join(r.full_name.lower() for r in rows)
    if "diana hagen" not in blob:
        msg = "Golden check failed: expected Diana Hagen in Utah Supreme Court extraction."
        raise RuntimeError(msg)
    if "pohlman" not in blob:
        msg = "Golden check failed: expected Jill Pohlman in Utah Supreme Court extraction."
        raise RuntimeError(msg)


def persist_ut_supreme_justices(
    rows: list[JusticeRow],
    settings: Settings,
) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --persist"
        raise RuntimeError(msg)
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    jur = (
        client.table("jurisdictions")
        .select("id")
        .eq("slug", "ut")
        .limit(1)
        .execute()
    )
    if not jur.data:
        msg = "No jurisdiction with slug 'ut' — run Supabase migrations/seed."
        raise RuntimeError(msg)
    ut_id = jur.data[0]["id"]

    for r in rows:
        payload: dict[str, Any] = {
            "slug": r.slug,
            "full_name": r.full_name,
            "jurisdiction_id": ut_id,
            "office_type": "state_supreme_justice",
            "party": None,
            "subject_alignment": "nonpartisan",
            "retention_year": r.retention_year,
            "is_current": True,
            "bio_summary": r.bio_summary,
            "metadata": {"source": "judicial_extraction", "bio_url": r.bio_url},
        }
        client.table("officials").upsert(payload, on_conflict="slug").execute()


def run_ut_supreme_extraction(
    *,
    persist: bool = False,
    dry_run: bool = False,
    fetch_bios: bool = True,
    settings: Settings | None = None,
) -> list[JusticeRow]:
    cfg = merge_source_urls_from_db(settings or get_settings())
    html = fetch_sup_html(cfg.utcourts_supreme_roster_url, cfg.http_user_agent)
    rows = parse_ut_supreme_roster(html, site_origin=cfg.utcourts_site_origin)
    if not rows:
        msg = (
            "No justices parsed from Utah Supreme Court roster — HTML layout may have changed."
        )
        raise RuntimeError(msg)
    if fetch_bios:
        rows = enrich_bios(rows, cfg.http_user_agent)
    validate_golden_ut_2026(rows)
    if dry_run:
        return rows
    if persist:
        persist_ut_supreme_justices(rows, cfg)
    return rows
