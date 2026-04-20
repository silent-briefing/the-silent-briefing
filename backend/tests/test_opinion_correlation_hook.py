from __future__ import annotations

from typing import Any

import pytest

from briefing.config import Settings


def test_opinion_ingestion_correlation_after_persist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import briefing.services.extraction.opinions as op

    fake_refs = [
        op.OpinionRef(
            f"Case {i}",
            f"https://legacy.example/opinions/supopin/202601{(i + 1):02d}.pdf",
            f"202601{(i + 1):02d}",
        )
        for i in range(3)
    ]
    monkeypatch.setattr(
        op,
        "list_ut_supreme_opinion_pdfs",
        lambda **kw: fake_refs,
    )
    monkeypatch.setattr(
        op,
        "download_pdf_bytes",
        lambda url, ua: b"%PDF-1.4",
    )
    monkeypatch.setattr(
        op,
        "extract_pdf_text",
        lambda data: "justice alpha cited bill beta regarding issue gamma. " * 200,
    )
    monkeypatch.setattr(op, "persist_opinion_chunks", lambda *a, **k: 2)

    corr_calls: list[dict[str, Any]] = []

    def _track_corr(_llm: Any, **kw: Any) -> Any:
        corr_calls.append(kw)
        from briefing.services.llm.correlation import CorrelationResult

        return CorrelationResult(edges=[], inserted=1)

    monkeypatch.setattr(
        "briefing.services.llm.correlation.run_correlation_pass",
        _track_corr,
    )

    class _FakeLLM:
        def embed_texts(self, texts: list[str]) -> list[list[float]]:
            return [[0.0] * 1024 for _ in texts]

    monkeypatch.setattr(op, "PerplexityLLMService", lambda cfg: _FakeLLM())

    settings = Settings(
        perplexity_api_key="test-key",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="sr",
    )
    _refs, _tc, pers, corr_ins = op.run_opinion_ingestion(
        limit=3,
        persist=True,
        dry_run=False,
        embed=True,
        correlate_after_persist=True,
        settings=settings,
    )
    assert pers == 6
    assert len(corr_calls) == 3
    assert corr_ins == 3
    assert all("ut_supreme_opinion" in (c.get("context") or "") for c in corr_calls)


def test_opinion_ingestion_skips_correlation_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import briefing.services.extraction.opinions as op

    fake_refs = [
        op.OpinionRef(
            f"Case {i}",
            f"https://legacy.example/opinions/supopin/202601{(i + 1):02d}.pdf",
            f"202601{(i + 1):02d}",
        )
        for i in range(3)
    ]
    monkeypatch.setattr(op, "list_ut_supreme_opinion_pdfs", lambda **kw: fake_refs)
    monkeypatch.setattr(op, "download_pdf_bytes", lambda url, ua: b"%PDF-1.4")
    monkeypatch.setattr(
        op,
        "extract_pdf_text",
        lambda data: "long text " * 400,
    )
    monkeypatch.setattr(op, "persist_opinion_chunks", lambda *a, **k: 1)

    def _boom(*a: Any, **k: Any) -> None:
        raise AssertionError("correlation should not run")

    monkeypatch.setattr(
        "briefing.services.llm.correlation.run_correlation_pass",
        _boom,
    )

    class _FakeLLM:
        def embed_texts(self, texts: list[str]) -> list[list[float]]:
            return [[0.0] * 1024 for _ in texts]

    monkeypatch.setattr(op, "PerplexityLLMService", lambda cfg: _FakeLLM())

    settings = Settings(perplexity_api_key="k")
    _r, _t, _p, ins = op.run_opinion_ingestion(
        limit=3,
        persist=True,
        dry_run=False,
        embed=True,
        correlate_after_persist=False,
        settings=settings,
    )
    assert ins == 0
