from __future__ import annotations

from briefing.services.baseline.vote_utah import parse_vote_utah_filings_html


def test_parse_vote_utah_skips_withdrawn_and_maps_rows() -> None:
    html = """
    <html><body>
    <table>
      <tr><th>Candidate</th><th>Office</th><th>Party</th><th>Status</th></tr>
      <tr><td>Jane Q. Doe</td><td>State Senate B</td><td>Republican</td><td>Filed</td></tr>
      <tr><td>Former Person</td><td>State House 1</td><td>Democratic</td><td>Withdrawn</td></tr>
    </table>
    <table><tr><th>Other</th></tr></table>
    </body></html>
    """
    rows = parse_vote_utah_filings_html(html)
    assert len(rows) == 1
    r = rows[0]
    assert r.full_name == "Jane Q. Doe"
    assert r.office_sought == "State Senate B"
    assert r.party == "Republican"
    assert r.jurisdiction == "UT"
    assert r.provenance.get("source") == "vote_utah_filings"
    assert r.district_for_race == ""
