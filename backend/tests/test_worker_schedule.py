from __future__ import annotations

import sys

import pytest

from briefing.services.schedule_catalog import SCHEDULED_JOBS, format_schedule_catalog


def test_schedule_catalog_lists_core_jobs() -> None:
    ids = {j.job_id for j in SCHEDULED_JOBS}
    assert "judicial-weekly" in ids
    assert "opinion-daily" in ids
    assert "correlation-recent" in ids


def test_format_schedule_catalog_includes_cli_examples() -> None:
    text = format_schedule_catalog()
    assert "judicial-extraction" in text
    assert "opinion-ingestion" in text
    assert "correlation-recent-chunks" in text
    assert "ARQ" in text or "queue" in text.lower()


def test_worker_argv_dry_run_prints_catalog(capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "argv", ["briefing.worker", "--dry-run"])
    from briefing.worker.__main__ import main

    assert main() == 0
    out = capsys.readouterr().out
    assert "judicial-weekly" in out
    assert "opinion-daily" in out
    assert "correlation-recent" in out
