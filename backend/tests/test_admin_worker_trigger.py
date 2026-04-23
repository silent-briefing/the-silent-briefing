from __future__ import annotations

from briefing.services.admin_worker_trigger import build_worker_argv, get_trigger_catalog
from briefing.services.schedule_catalog import get_catalog


def test_get_trigger_catalog_covers_phase_c_jobs() -> None:
    ids = {j["job_id"] for j in get_trigger_catalog()}
    assert ids >= {
        "retrieval-pass",
        "dossier-write",
        "adversarial-dossier",
        "correlation-pass",
        "retention-extraction",
        "opinion-ingestion",
    }


def test_schedule_catalog_delegates() -> None:
    assert get_catalog() == get_trigger_catalog()


def test_build_argv_retrieval() -> None:
    argv = build_worker_argv(
        job_id="retrieval-pass",
        payload={"official_id": "00000000-0000-4000-8000-0000000000aa", "correlate": True},
    )
    assert argv[0] == "retrieval-pass"
    assert "--official-id" in argv
    assert "--persist" in argv
    assert "--correlate" in argv


def test_build_argv_opinion_ingestion_upload_scoped() -> None:
    argv = build_worker_argv(
        job_id="opinion-ingestion",
        payload={"opinion_id": "11111111-1111-4111-8111-111111111111", "opinion_limit": 99},
    )
    assert argv[0] == "opinion-ingestion"
    assert argv == [
        "opinion-ingestion",
        "--opinion-id",
        "11111111-1111-4111-8111-111111111111",
        "--persist",
    ]


def test_build_argv_opinion_ingestion_index_limit() -> None:
    argv = build_worker_argv(job_id="opinion-ingestion", payload={"opinion_limit": 7})
    assert "--limit" in argv
    assert "7" in argv
    assert "--opinion-id" not in argv
