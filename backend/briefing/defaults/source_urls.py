"""Fallback URLs for scrapers and public HTTP APIs.

**Operators:** Prefer environment variables (see ``briefing.config.Settings``) so paths can change
without a deploy. Values here are the shipped defaults — update when a new election cycle or
site move makes the reference URL wrong for fresh clones.
"""

from __future__ import annotations

# --- Baseline ETL (election cycle paths change) ---
VOTE_UTAH_FILINGS_PAGE = "https://vote.utah.gov/2026-candidate-filings/"
SLCO_CANDIDATE_LIST_PAGE = (
    "https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/"
)

# --- Utah courts (layout / domain changes) ---
UTCOURTS_SUPREME_ROSTER_HTML = (
    "https://www.utcourts.gov/en/about/courts/judges-bios/appellate-courts/supreme-court.html"
)
UTCOURTS_SITE_ORIGIN = "https://www.utcourts.gov"
UT_LEGACY_SUPREME_OPINION_INDEX = "https://legacy.utcourts.gov/opinions/supopin/"

# --- Third-party ---
BALLOTPEDIA_ORIGIN = "https://ballotpedia.org"

# --- Google Civic Information API (versioned path; override if Google re-bases) ---
GOOGLE_CIVIC_ELECTIONS = "https://www.googleapis.com/civicinfo/v2/elections"
GOOGLE_CIVIC_DIVISIONS_BY_ADDRESS = (
    "https://www.googleapis.com/civicinfo/v2/divisionsByAddress"
)
GOOGLE_CIVIC_VOTERINFO = "https://www.googleapis.com/civicinfo/v2/voterinfo"
