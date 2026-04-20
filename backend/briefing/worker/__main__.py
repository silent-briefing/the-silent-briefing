from __future__ import annotations

import argparse
import sys
from typing import cast


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
        refs, n_chunks, persisted = run_opinion_ingestion(
            limit=args.limit,
            persist=args.persist,
            dry_run=args.dry_run,
            embed=not args.no_embed,
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


def main() -> int:
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
    oi.set_defaults(_handler=_cmd_opinion_ingestion)

    args = parser.parse_args()
    handler = getattr(args, "_handler", None)
    if handler is None:
        return 1
    return int(handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
