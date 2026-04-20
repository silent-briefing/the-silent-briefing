from __future__ import annotations

import argparse
import sys


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

    args = parser.parse_args()
    handler = getattr(args, "_handler", None)
    if handler is None:
        return 1
    return int(handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
