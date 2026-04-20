from __future__ import annotations

from typing import Any

import pytest

from briefing.services.llm.correlation import CorrelationResult
from briefing.services.pipeline.recent_rag_correlation import (
    fetch_recent_rag_text,
    run_correlation_on_recent_rag_chunks,
)


class _Query:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def select(self, *_a: Any, **_k: Any) -> _Query:
        return self

    def gte(self, *_a: Any, **_k: Any) -> _Query:
        return self

    def order(self, *_a: Any, **_k: Any) -> _Query:
        return self

    def limit(self, *_a: Any, **_k: Any) -> _Query:
        return self

    def execute(self) -> Any:
        return type("R", (), {"data": self._rows})()


class _FakeClient:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def table(self, _name: str) -> _Query:
        return _Query(self._rows)


def test_fetch_recent_rag_text_orders_chronologically_and_truncates() -> None:
    rows = [
        {"content": "z-newer", "created_at": "2026-01-03T00:00:00Z"},
        {"content": "a-older", "created_at": "2026-01-01T00:00:00Z"},
    ]
    text, n = fetch_recent_rag_text(
        _FakeClient(rows),
        hours=24,
        max_chunks=10,
        max_chars=100,
    )
    assert n == 2
    assert text.index("a-older") < text.index("z-newer")


def test_fetch_recent_rag_text_empty() -> None:
    text, n = fetch_recent_rag_text(_FakeClient([]), hours=1, max_chunks=5, max_chars=1000)
    assert text == ""
    assert n == 0


def test_run_correlation_on_recent_skips_llm_when_no_chunks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import briefing.services.pipeline.recent_rag_correlation as mod

    monkeypatch.setattr("supabase.create_client", lambda *_a, **_k: _FakeClient([]))

    def _no_pass(*_a: Any, **_k: Any) -> CorrelationResult:
        raise AssertionError("run_correlation_pass should not run when no chunk text")

    monkeypatch.setattr(mod, "run_correlation_pass", _no_pass)

    class _LLM:
        pass

    out = run_correlation_on_recent_rag_chunks(
        _LLM(),  # type: ignore[arg-type]
        hours=1,
        persist=False,
        dry_run=True,
        settings=__import__("briefing.config", fromlist=["Settings"]).Settings(
            supabase_url="http://example.test",
            supabase_service_role_key="key",
        ),
    )
    assert out.result is None
    assert out.chunks_in_window == 0


def test_run_correlation_on_recent_calls_pass_when_text_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import briefing.services.pipeline.recent_rag_correlation as mod

    monkeypatch.setattr("supabase.create_client", lambda *_a, **_k: object())
    monkeypatch.setattr(
        mod,
        "fetch_recent_rag_text",
        lambda *_a, **_k: ("substantive chunk about justice and bill", 2),
    )

    def _fake_pass(_llm: Any, **kw: Any) -> CorrelationResult:
        assert "substantive" in kw.get("text", "")
        return CorrelationResult(edges=[{"source_name": "A", "target_name": "B"}])

    monkeypatch.setattr(mod, "run_correlation_pass", _fake_pass)

    class _LLM:
        pass

    out = run_correlation_on_recent_rag_chunks(
        _LLM(),  # type: ignore[arg-type]
        persist=False,
        dry_run=True,
        settings=__import__("briefing.config", fromlist=["Settings"]).Settings(
            supabase_url="http://example.test",
            supabase_service_role_key="key",
        ),
    )
    assert out.result is not None
    assert len(out.result.edges) == 1
