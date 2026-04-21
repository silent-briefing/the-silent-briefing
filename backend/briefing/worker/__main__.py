from __future__ import annotations

import argparse
import sys
from typing import cast


def main() -> int:
    """Entrypoint for ``python -m briefing.worker``.

    ``briefing.worker --dry-run`` (exactly two argv tokens) prints the schedule
    catalog for cron / Cloud Scheduler. Subcommands keep their own ``--dry-run``.
    """
    if len(sys.argv) == 2 and sys.argv[1] == "--dry-run":
        from briefing.services.schedule_catalog import print_schedule_catalog

        print_schedule_catalog()
        return 0

    return _dispatch_command()


def _cmd_retention_extraction(args: argparse.Namespace) -> int:
    from briefing.services.extraction.retention import run_retention_extraction

    slugs = [s.strip() for s in args.slugs.split(",")] if args.slugs else None
    try:
        by_slug, inserted = run_retention_extraction(
            slugs=slugs,
            persist=args.persist,
            dry_run=args.dry_run,
        )
    except Exception as e:
        print(f"retention-extraction failed: {e}", file=sys.stderr)
        return 1
    for slug, events in sorted(by_slug.items()):
        print(f"{slug}: {len(events)} retention event(s)")
        for ev in events:
            print(
                f"  {ev.election_year}  {ev.office}  yes={ev.yes_pct}% no={ev.no_pct}% "
                f"total_votes={ev.total_votes}"
            )
    if args.dry_run:
        print("(dry-run: no database writes)")
    elif args.persist:
        print(
            f"Inserted {inserted} dossier_claims row(s) "
            "(prior Ballotpedia retention rows replaced per matched official)."
        )
    return 0


def _cmd_opinion_ingestion(args: argparse.Namespace) -> int:
    from briefing.services.extraction.opinions import run_opinion_ingestion

    try:
        refs, n_chunks, persisted, corr_ins = run_opinion_ingestion(
            limit=args.limit,
            persist=args.persist,
            dry_run=args.dry_run,
            embed=not args.no_embed,
            correlate_after_persist=not args.no_correlate,
        )
    except Exception as e:
        print(f"opinion-ingestion failed: {e}", file=sys.stderr)
        return 1
    print(f"Listed {len(refs)} opinion PDF(s).")
    for r in refs:
        print(f"  {r.case_name}  {r.filed_yyyymmdd}  {r.pdf_url}")
    print(f"Total chunks (text extracted): {n_chunks}")
    if args.dry_run:
        print("(dry-run: no embeddings or database writes)")
    elif args.persist:
        print(f"Inserted {persisted} rag_chunks row(s).")
        if not args.no_correlate:
            print(f"Correlation: inserted {corr_ins} entity_edges row(s) (high-confidence proposals).")
    return 0


def _cmd_baseline_extraction(args: argparse.Namespace) -> int:
    from briefing.services.baseline.runner import SourceName, run_baseline_extraction

    sources: list[SourceName] | None = None
    if args.sources.strip():
        raw = [s.strip() for s in args.sources.split(",") if s.strip()]
        for s in raw:
            if s not in ("vote_utah", "slco", "civic"):
                print(f"unknown source {s!r} (use vote_utah, slco, civic)", file=sys.stderr)
                return 1
        sources = cast(list[SourceName], raw)
    try:
        candidates, n_persisted = run_baseline_extraction(
            persist=args.persist,
            dry_run=args.dry_run,
            sources=sources,
        )
    except Exception as e:
        print(f"baseline-extraction failed: {e}", file=sys.stderr)
        return 1
    print(f"Normalized {len(candidates)} candidate row(s).")
    for c in candidates[:50]:
        print(f"  {c.full_name} | {c.office_sought} | {c.jurisdiction} | {c.party or '-'}")
    if len(candidates) > 50:
        print(f"  ... {len(candidates) - 50} more")
    if args.dry_run:
        print("(dry-run: no database writes)")
    elif args.persist:
        print(f"Upserted {n_persisted} candidate row(s) (races + candidates).")
    return 0


def _cmd_correlation_recent_chunks(args: argparse.Namespace) -> int:
    from briefing.services.llm.perplexity import PerplexityLLMService
    from briefing.services.pipeline.recent_rag_correlation import (
        run_correlation_on_recent_rag_chunks,
    )

    try:
        llm = PerplexityLLMService()
    except ValueError as e:
        print(f"correlation-recent-chunks: {e}", file=sys.stderr)
        return 1
    try:
        out = run_correlation_on_recent_rag_chunks(
            llm,
            hours=args.hours,
            max_chunks=args.max_chunks,
            max_chars=args.max_chars,
            persist=args.persist,
            dry_run=args.dry_run,
            min_confidence=args.min_confidence,
        )
    except Exception as e:
        print(f"correlation-recent-chunks failed: {e}", file=sys.stderr)
        return 1
    print(
        f"rag_chunks in window={out.chunks_in_window} "
        f"text_chars={out.text_chars}"
    )
    if out.result is None:
        print("No chunk text in window — skipping LLM.")
        return 0
    r = out.result
    print(f"Proposed {len(r.edges)} edge(s).")
    for e in r.edges[:20]:
        print(
            f"  {e.get('source_name')} -[{e.get('relation')}]-> {e.get('target_name')} "
            f"(conf={e.get('confidence')})"
        )
    if len(r.edges) > 20:
        print(f"  ... {len(r.edges) - 20} more")
    if args.dry_run:
        print("(dry-run: no entity_edges writes)")
    elif args.persist:
        print(
            f"Inserted {r.inserted} edge(s); "
            f"skipped_low_conf={r.skipped_low_confidence} "
            f"dup={r.skipped_duplicate} self={r.skipped_self_loop}"
        )
    return 0


def _cmd_correlation_pass(args: argparse.Namespace) -> int:
    from pathlib import Path

    from briefing.services.llm.correlation import run_correlation_pass
    from briefing.services.llm.perplexity import PerplexityLLMService

    try:
        llm = PerplexityLLMService()
    except ValueError as e:
        print(f"correlation-pass: {e}", file=sys.stderr)
        return 1
    text = args.text
    if args.text_file:
        text = Path(args.text_file).read_text(encoding="utf-8")
    if not text.strip():
        print("correlation-pass: provide --text or --text-file", file=sys.stderr)
        return 1
    try:
        result = run_correlation_pass(
            llm,
            text=text,
            context=args.context or "",
            persist=args.persist,
            dry_run=args.dry_run,
            min_confidence=args.min_confidence,
        )
    except Exception as e:
        print(f"correlation-pass failed: {e}", file=sys.stderr)
        return 1
    print(f"Proposed {len(result.edges)} edge(s).")
    for e in result.edges[:20]:
        print(
            f"  {e.get('source_name')} -[{e.get('relation')}]-> {e.get('target_name')} "
            f"(conf={e.get('confidence')})"
        )
    if len(result.edges) > 20:
        print(f"  ... {len(result.edges) - 20} more")
    if args.dry_run:
        print("(dry-run: no entity_edges writes)")
    elif args.persist:
        print(
            f"Inserted {result.inserted} edge(s); "
            f"skipped_low_conf={result.skipped_low_confidence} "
            f"dup={result.skipped_duplicate} self={result.skipped_self_loop}"
        )
    return 0


def _cmd_retrieval_pass(args: argparse.Namespace) -> int:
    from typing import Literal

    from briefing.config import get_settings
    from briefing.services.intelligence.evidence_bundle import RetrievalStageCode
    from briefing.services.intelligence.retrieval_stages import (
        parse_stage_list,
        run_retrieval_stages_for_official,
    )
    from briefing.services.llm.perplexity import PerplexityLLMService

    try:
        llm = PerplexityLLMService()
    except ValueError as e:
        print(f"retrieval-pass: {e}", file=sys.stderr)
        return 1
    settings = get_settings()
    stages: list[RetrievalStageCode]
    stage_c_intensity: Literal["full", "light"] = "full"

    if args.use_routing or args.skip_if_fresh:
        from supabase import create_client

        from briefing.services.intelligence.routing import (
            fetch_subject_alignment,
            is_retrieval_stale,
            retrieval_stages_and_c_intensity,
        )

        if not settings.supabase_url or not settings.supabase_service_role_key:
            print(
                "retrieval-pass: --use-routing / --skip-if-fresh need SUPABASE_URL "
                "and SUPABASE_SERVICE_ROLE_KEY",
                file=sys.stderr,
            )
            return 1
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        if args.skip_if_fresh and not is_retrieval_stale(client, args.official_id, settings):
            print("retrieval-pass: skip-if-fresh — recent retrieval_sonar claims; skipping LLM.")
            return 0
        if args.use_routing:
            align = fetch_subject_alignment(client, args.official_id)
            stages, stage_c_intensity = retrieval_stages_and_c_intensity(align, settings)
        else:
            try:
                stages = parse_stage_list(args.stages)
            except ValueError as e:
                print(f"retrieval-pass: {e}", file=sys.stderr)
                return 1
    else:
        try:
            stages = parse_stage_list(args.stages)
        except ValueError as e:
            print(f"retrieval-pass: {e}", file=sys.stderr)
            return 1

    try:
        bundles = run_retrieval_stages_for_official(
            llm,
            settings,
            official_id=args.official_id,
            stages=stages,
            subject=args.subject or "",
            rag_context=args.rag_context or "",
            persist=args.persist,
            dry_run=args.dry_run,
            correlate=args.correlate,
            stage_c_intensity=stage_c_intensity,
        )
    except Exception as e:
        print(f"retrieval-pass failed: {e}", file=sys.stderr)
        return 1
    for b in bundles:
        print(f"--- Stage {b.retrieval_stage} ---")
        print(b.to_prompt_block()[:4000] + ("..." if len(b.to_prompt_block()) > 4000 else ""))
    if args.dry_run:
        print("(dry-run: no dossier_claims or entity_edges writes)")
    elif args.persist:
        print(f"Inserted {len(bundles)} retrieval dossier_claims row(s).")
        if args.correlate:
            print("(correlation pass ran on merged bundle text when --correlate)")
    return 0


def _cmd_dossier_write(args: argparse.Namespace) -> int:
    from briefing.services.intelligence.dossier_writer import run_dossier_write_from_claims
    from briefing.services.llm.perplexity import PerplexityLLMService

    try:
        llm = PerplexityLLMService()
    except ValueError as e:
        print(f"dossier-write: {e}", file=sys.stderr)
        return 1
    try:
        draft = run_dossier_write_from_claims(
            llm,
            official_id=args.official_id,
            persist=args.persist,
            dry_run=args.dry_run,
            rag_query=args.rag_query or "",
            rag_match_count=args.rag_match_count,
        )
    except Exception as e:
        print(f"dossier-write failed: {e}", file=sys.stderr)
        return 1
    print(draft[:4000] + ("..." if len(draft) > 4000 else ""))
    if args.dry_run:
        print("(dry-run: no writer_sonar claim insert)")
    elif args.persist:
        print("Inserted Dossier / Draft claim (pipeline_stage=writer_sonar).")
    return 0


def _cmd_adversarial_dossier(args: argparse.Namespace) -> int:
    from briefing.services.llm.adversarial_pipeline import run_adversarial_dossier_pipeline
    from briefing.services.llm.perplexity import PerplexityLLMService

    try:
        llm = PerplexityLLMService()
    except ValueError as e:
        print(f"adversarial-dossier: {e}", file=sys.stderr)
        return 1
    try:
        result = run_adversarial_dossier_pipeline(
            llm,
            subject_brief=args.subject,
            official_id=args.official_id or None,
            persist=args.persist,
            dry_run=args.dry_run,
        )
    except Exception as e:
        print(f"adversarial-dossier failed: {e}", file=sys.stderr)
        return 1
    print(f"groundedness_score={result.groundedness_score:.3f} review={result.requires_human_review}")
    print(result.final_dossier[:2000] + ("..." if len(result.final_dossier) > 2000 else ""))
    if args.dry_run:
        print("(dry-run: no intelligence_runs writes)")
    elif args.persist:
        print(f"Inserted {len([x for x in result.persisted_run_ids if x])} intelligence_runs row(s).")
    return 0


def _cmd_judicial_extraction(args: argparse.Namespace) -> int:
    from briefing.services.extraction.judicial import run_ut_supreme_extraction

    try:
        rows = run_ut_supreme_extraction(
            persist=args.persist,
            dry_run=args.dry_run,
            fetch_bios=not args.no_bios,
        )
    except Exception as e:
        print(f"judicial-extraction failed: {e}", file=sys.stderr)
        return 1
    for r in rows:
        yr = r.retention_year if r.retention_year is not None else "-"
        print(f"{r.full_name}  slug={r.slug}  retention={yr}")
    if args.dry_run:
        print("(dry-run: no database writes)")
    elif args.persist:
        print(f"Upserted {len(rows)} officials.")
    return 0


def _dispatch_command() -> int:
    parser = argparse.ArgumentParser(prog="briefing.worker")
    sub = parser.add_subparsers(dest="command", required=True)

    be = sub.add_parser(
        "baseline-extraction",
        help="vote.utah.gov (+ optional SLCO Playwright) → races / candidates",
    )
    be.add_argument(
        "--persist",
        action="store_true",
        help="Upsert into Supabase public.races and public.candidates",
    )
    be.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse only; no database writes",
    )
    be.add_argument(
        "--sources",
        type=str,
        default="",
        help="Comma-separated: vote_utah, slco, civic (default: all three; slco/civic no-op unless enabled/configured)",
    )
    be.set_defaults(_handler=_cmd_baseline_extraction)

    je = sub.add_parser("judicial-extraction", help="Utah Supreme Court roster → officials")
    je.add_argument(
        "--persist",
        action="store_true",
        help="Upsert into Supabase public.officials (needs service role key)",
    )
    je.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate only; no writes",
    )
    je.add_argument(
        "--no-bios",
        action="store_true",
        help="Skip per-justice bio page fetches",
    )
    je.set_defaults(_handler=_cmd_judicial_extraction)

    re_ = sub.add_parser(
        "retention-extraction",
        help="Ballotpedia retention elections → dossier_claims (Utah Supreme Court officials)",
    )
    re_.add_argument(
        "--persist",
        action="store_true",
        help="Replace prior Ballotpedia retention claims and insert fresh rows",
    )
    re_.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and validate only; no writes",
    )
    re_.add_argument(
        "--slugs",
        type=str,
        default="",
        help="Comma-separated official slugs (default: all UT supreme justices from roster)",
    )
    re_.set_defaults(_handler=_cmd_retention_extraction)

    oi = sub.add_parser(
        "opinion-ingestion",
        help="UT Supreme PDF opinions → chunked text → Perplexity embeddings → rag_chunks",
    )
    oi.add_argument(
        "--limit",
        type=int,
        default=3,
        help="Number of recent opinion PDFs from the legacy index (default: 3)",
    )
    oi.add_argument(
        "--persist",
        action="store_true",
        help="Write to Supabase rag_chunks (requires service role)",
    )
    oi.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch PDFs and chunk only; no API or DB writes",
    )
    oi.add_argument(
        "--no-embed",
        action="store_true",
        help="Skip Perplexity embeddings (stores chunks with embedding=NULL if --persist)",
    )
    oi.add_argument(
        "--no-correlate",
        action="store_true",
        help="After --persist, skip automatic correlation pass on each opinion's chunk text",
    )
    oi.set_defaults(_handler=_cmd_opinion_ingestion)

    ad = sub.add_parser(
        "adversarial-dossier",
        help="Stage 1–4 adversarial dossier pipeline → intelligence_runs (Perplexity Sonar)",
    )
    ad.add_argument(
        "--subject",
        type=str,
        required=True,
        help="Brief for Stage 1 retrieval (justice name, context, what to research)",
    )
    ad.add_argument(
        "--official-id",
        type=str,
        default="",
        help="UUID of public.officials row (required with --persist)",
    )
    ad.add_argument(
        "--persist",
        action="store_true",
        help="Insert four intelligence_runs rows (needs Supabase service role + --official-id)",
    )
    ad.add_argument(
        "--dry-run",
        action="store_true",
        help="Run LLM stages only; no intelligence_runs writes",
    )
    ad.set_defaults(_handler=_cmd_adversarial_dossier)

    rp = sub.add_parser(
        "retrieval-pass",
        help="Step 3 Stage 1: A/B/C Sonar retrieval → dossier_claims (Research / Stage *)",
    )
    rp.add_argument(
        "--official-id",
        type=str,
        required=True,
        help="UUID of public.officials row",
    )
    rp.add_argument(
        "--subject",
        type=str,
        default="",
        help="Optional seed text; if omitted, loaded from officials (needs Supabase)",
    )
    rp.add_argument(
        "--stages",
        type=str,
        default="A,B,C",
        help="Comma-separated A, B, C (default A,B,C)",
    )
    rp.add_argument(
        "--rag-context",
        type=str,
        default="",
        help="Optional short context pasted into each stage user message",
    )
    rp.add_argument(
        "--persist",
        action="store_true",
        help="Insert one dossier_claims row per stage (pipeline_stage=retrieval_sonar)",
    )
    rp.add_argument(
        "--dry-run",
        action="store_true",
        help="Run Sonar only; no database writes",
    )
    rp.add_argument(
        "--correlate",
        action="store_true",
        help="After stages, run correlation pass on merged bundle text (uses --persist for edges)",
    )
    rp.add_argument(
        "--use-routing",
        action="store_true",
        help=(
            "Derive A/B/C stages from officials.subject_alignment and config "
            "(GOP: A+C lighter vetting; else full A,B,C). Ignores --stages."
        ),
    )
    rp.add_argument(
        "--skip-if-fresh",
        action="store_true",
        help=(
            "If latest retrieval_sonar claim is newer than RETRIEVAL_STALE_DAYS, exit 0 without LLM "
            "(needs Supabase)."
        ),
    )
    rp.set_defaults(_handler=_cmd_retrieval_pass)

    dw = sub.add_parser(
        "dossier-write",
        help="Step 3 Stage 2: latest A/B/C bundles (+ optional RAG) → writer_sonar claim",
    )
    dw.add_argument("--official-id", type=str, required=True, help="UUID of public.officials row")
    dw.add_argument(
        "--persist",
        action="store_true",
        help="Insert Dossier / Draft claim (pipeline_stage=writer_sonar)",
    )
    dw.add_argument(
        "--dry-run",
        action="store_true",
        help="Print draft only; no insert",
    )
    dw.add_argument(
        "--rag-query",
        type=str,
        default="",
        help="Optional query for match_rag_chunks_public (embed + RPC)",
    )
    dw.add_argument(
        "--rag-match-count",
        type=int,
        default=8,
        help="Top-k for RAG RPC (default 8)",
    )
    dw.set_defaults(_handler=_cmd_dossier_write)

    crc = sub.add_parser(
        "correlation-recent-chunks",
        help="Recent rag_chunks (opinion text) → correlation pass (optional persist)",
    )
    crc.add_argument(
        "--hours",
        type=int,
        default=48,
        help="Look back window for rag_chunks.created_at (default: 48)",
    )
    crc.add_argument(
        "--max-chunks",
        type=int,
        default=30,
        help="Max rows to pull from rag_chunks (default: 30)",
    )
    crc.add_argument(
        "--max-chars",
        type=int,
        default=12_000,
        help="Max combined text sent to the model (default: 12000)",
    )
    crc.add_argument(
        "--min-confidence",
        type=float,
        default=0.8,
        help="Minimum confidence to write entity_edges when --persist (default: 0.8)",
    )
    crc.add_argument(
        "--persist",
        action="store_true",
        help="Insert proposed edges >= min-confidence (needs Supabase service role)",
    )
    crc.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch chunks and propose edges only; no entity_edges writes",
    )
    crc.set_defaults(_handler=_cmd_correlation_recent_chunks)

    cp = sub.add_parser(
        "correlation-pass",
        help="Cheap Sonar pass: text → proposed entity_edges (optional persist)",
    )
    cp.add_argument("--text", type=str, default="", help="Body text to analyze (e.g. opinion excerpt)")
    cp.add_argument(
        "--text-file",
        type=str,
        default="",
        help="Read text from UTF-8 file (overrides --text if set)",
    )
    cp.add_argument(
        "--context",
        type=str,
        default="",
        help="Optional short context (source label, case name, official slug)",
    )
    cp.add_argument(
        "--min-confidence",
        type=float,
        default=0.8,
        help="Minimum confidence to write entity_edges when --persist (default 0.8)",
    )
    cp.add_argument(
        "--persist",
        action="store_true",
        help="Insert proposed edges >= min-confidence (needs Supabase service role)",
    )
    cp.add_argument(
        "--dry-run",
        action="store_true",
        help="Only print proposals; no database writes",
    )
    cp.set_defaults(_handler=_cmd_correlation_pass)

    args = parser.parse_args()
    handler = getattr(args, "_handler", None)
    if handler is None:
        return 1
    return int(handler(args))


if __name__ == "__main__":
    raise SystemExit(main())  # pragma: no cover
