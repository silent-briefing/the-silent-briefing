"""Registry of admin-editable `settings` keys (sources + operator feeds)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from briefing.defaults import source_urls as _urls

SettingKind = Literal["url"]


@dataclass(frozen=True)
class SourceUrlDescriptor:
    """One URL-backed field mirrored in `public.settings` and `Settings`."""

    key: str
    kind: SettingKind
    label: str
    description: str
    default: str


# Keys must match `briefing.config.Settings` field names for env + `model_copy` overrides.
SOURCE_URL_DESCRIPTORS: tuple[SourceUrlDescriptor, ...] = (
    SourceUrlDescriptor(
        key="vote_utah_filings_url",
        kind="url",
        label="vote.utah.gov candidate filings",
        description="HTML table of Utah candidate filings (baseline ETL).",
        default=_urls.VOTE_UTAH_FILINGS_PAGE,
    ),
    SourceUrlDescriptor(
        key="slco_candidate_list_url",
        kind="url",
        label="Salt Lake County candidate list",
        description="SLCO elections current candidate list page.",
        default=_urls.SLCO_CANDIDATE_LIST_PAGE,
    ),
    SourceUrlDescriptor(
        key="utcourts_supreme_roster_url",
        kind="url",
        label="UTCourts supreme roster HTML",
        description="Utah Supreme Court judges bios index page.",
        default=_urls.UTCOURTS_SUPREME_ROSTER_HTML,
    ),
    SourceUrlDescriptor(
        key="utcourts_site_origin",
        kind="url",
        label="UTCourts site origin",
        description="Base origin for relative links when parsing court HTML.",
        default=_urls.UTCOURTS_SITE_ORIGIN,
    ),
    SourceUrlDescriptor(
        key="ut_legacy_opinion_index_url",
        kind="url",
        label="Legacy UT supreme opinion index",
        description="Opinion PDF index used by opinion ingestion.",
        default=_urls.UT_LEGACY_SUPREME_OPINION_INDEX,
    ),
    SourceUrlDescriptor(
        key="ballotpedia_base_url",
        kind="url",
        label="Ballotpedia origin",
        description="Base URL for Ballotpedia pages (retention extraction).",
        default=_urls.BALLOTPEDIA_ORIGIN,
    ),
    SourceUrlDescriptor(
        key="google_civic_elections_url",
        kind="url",
        label="Google Civic elections endpoint",
        description="Civic Information API elections URL.",
        default=_urls.GOOGLE_CIVIC_ELECTIONS,
    ),
    SourceUrlDescriptor(
        key="google_civic_divisions_by_address_url",
        kind="url",
        label="Google Civic divisionsByAddress",
        description="Civic Information API divisionsByAddress URL.",
        default=_urls.GOOGLE_CIVIC_DIVISIONS_BY_ADDRESS,
    ),
    SourceUrlDescriptor(
        key="google_civic_voterinfo_url",
        kind="url",
        label="Google Civic voterInfo",
        description="Civic Information API voterInfo URL.",
        default=_urls.GOOGLE_CIVIC_VOTERINFO,
    ),
)

SOURCE_URL_KEYS: frozenset[str] = frozenset(d.key for d in SOURCE_URL_DESCRIPTORS)

OPERATOR_FEEDS_SETTINGS_KEY = "operator_feeds"


def default_operator_feeds_blob(settings: Any) -> dict[str, Any]:
    """Shape stored in `settings.value` for `operator_feeds` (jsonb object)."""
    return {
        "cache_seconds": int(getattr(settings, "feed_cache_seconds", 600)),
        "x_enabled": True,
        "perplexity_enabled": True,
        "opt_out_official_ids": [],
    }
