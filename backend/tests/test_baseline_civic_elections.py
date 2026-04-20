from __future__ import annotations

import httpx
import respx

from briefing.config import Settings
from briefing.services.baseline.civic import (
    fetch_google_civic_divisions_by_address,
    fetch_google_civic_elections,
)


@respx.mock
def test_fetch_google_civic_elections() -> None:
    s = Settings(google_civic_api_key="k")
    respx.get(s.google_civic_elections_url).mock(
        return_value=httpx.Response(
            200,
            json={"kind": "civicinfo#electionsQueryResponse", "elections": []},
        )
    )
    out = fetch_google_civic_elections(s)
    assert out.get("kind") == "civicinfo#electionsQueryResponse"


@respx.mock
def test_fetch_google_civic_divisions_by_address() -> None:
    s = Settings(
        google_civic_api_key="k",
        google_civic_voter_address="123 Main St, SLC UT",
    )
    respx.get(s.google_civic_divisions_by_address_url).mock(
        return_value=httpx.Response(
            200,
            json={"kind": "civicinfo#divisionsByAddressResponse", "divisions": {}},
        )
    )
    out = fetch_google_civic_divisions_by_address(s)
    assert out.get("kind") == "civicinfo#divisionsByAddressResponse"


def test_civic_helpers_empty_without_key() -> None:
    s = Settings(google_civic_api_key="")
    assert fetch_google_civic_elections(s) == {}
    assert fetch_google_civic_divisions_by_address(s) == {}
