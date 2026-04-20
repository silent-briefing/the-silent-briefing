from __future__ import annotations

from briefing.services.baseline.civic import parse_voter_info_response


def test_parse_voter_info_maps_contests() -> None:
    payload = {
        "kind": "civicinfo#voterInfoResponse",
        "normalizedInput": {"state": "UT"},
        "contests": [
            {
                "office": "US House",
                "level": "country",
                "district": {"name": "Utah Congressional District 1"},
                "candidates": [
                    {"name": "Pat Citizen", "party": "DEM", "candidateUrl": "https://example.org"},
                ],
            }
        ],
    }
    rows = parse_voter_info_response(payload)
    assert len(rows) == 1
    r = rows[0]
    assert r.full_name == "Pat Citizen"
    assert r.party == "DEM"
    assert r.office_sought == "US House"
    assert r.district_for_race == "1"
    assert r.jurisdiction == "UT"
    assert r.provenance.get("source") == "google_civic_voterinfo"
