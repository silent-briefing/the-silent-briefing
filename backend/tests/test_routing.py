from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from briefing.config import Settings
from briefing.services.intelligence.routing import (
    fetch_subject_alignment,
    is_retrieval_stale,
    latest_retrieval_sonar_claim_at,
    normalize_subject_alignment,
    retrieval_stages_and_c_intensity,
)


def test_normalize_subject_alignment_defaults_and_unknown() -> None:
    assert normalize_subject_alignment(None) == "neutral"
    assert normalize_subject_alignment("") == "neutral"
    assert normalize_subject_alignment("GOP") == "gop"
    assert normalize_subject_alignment("not-a-real-value") == "neutral"


def test_retrieval_stages_gop_vs_default() -> None:
    s = Settings(
        perplexity_api_key="x",
        retrieval_stage_spec_gop="A,C",
        retrieval_stage_spec_default="A,B,C",
    )
    st_gop, int_gop = retrieval_stages_and_c_intensity("gop", s)
    assert [x for x in st_gop] == ["A", "C"]
    assert int_gop == "light"
    st_opp, int_opp = retrieval_stages_and_c_intensity("opposition", s)
    assert st_opp == ["A", "B", "C"]
    assert int_opp == "full"


def test_fetch_subject_alignment() -> None:
    q = MagicMock()
    q.execute.return_value = MagicMock(data=[{"subject_alignment": "gop"}])
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.limit.return_value = q
    assert fetch_subject_alignment(client, "uuid") == "gop"


def test_is_retrieval_stale_respects_window() -> None:
    s = Settings(perplexity_api_key="x", retrieval_stale_days=30)
    q = MagicMock()
    q.execute.return_value = MagicMock(
        data=[{"created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()}]
    )
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value = q
    assert not is_retrieval_stale(client, "oid", s)

    q2 = MagicMock()
    q2.execute.return_value = MagicMock(
        data=[{"created_at": (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()}]
    )
    client2 = MagicMock()
    client2.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value = q2
    assert is_retrieval_stale(client2, "oid", s)


def test_latest_retrieval_sonar_claim_at_none() -> None:
    q = MagicMock()
    q.execute.return_value = MagicMock(data=[])
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value = q
    assert latest_retrieval_sonar_claim_at(client, "x") is None
