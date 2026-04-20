from __future__ import annotations

from pathlib import Path

import httpx
import pytest
import respx

from briefing.services.baseline.fetcher import ResilientFetcher


@respx.mock
def test_resilient_fetcher_uses_etag_cache(tmp_path: Path) -> None:
    url = "https://example.test/filings"
    art = tmp_path / "art"
    art.mkdir()
    route = respx.get(url).mock(
        side_effect=[
            httpx.Response(
                200,
                text="<html>one</html>",
                headers={"ETag": '"abc"'},
            ),
            httpx.Response(304),
        ]
    )
    f = ResilientFetcher(
        user_agent="SilentBriefingTest/1",
        artifacts_dir=str(art),
        max_retries=2,
    )
    first = f.get(url)
    assert "<html>one</html>" in first.text
    second = f.get(url)
    assert second.text == first.text
    assert route.call_count == 2


def test_resilient_get_text_matches_resilient_fetcher(tmp_path: Path) -> None:
    from briefing.services.baseline.fetcher import resilient_get_text

    url = "https://example.test/x"
    art = tmp_path / "a2"
    art.mkdir()
    with respx.mock:
        respx.get(url).mock(return_value=httpx.Response(200, text="ok"))
        t = resilient_get_text(
            url, user_agent="UA", artifacts_dir=str(art), max_retries=2
        )
    assert t == "ok"
