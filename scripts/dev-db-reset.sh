#!/usr/bin/env bash
# Full local reset (destructive): wiped DB + all migrations + Directus repair.
# Day-to-day: ./scripts/dev-db-migrate.sh — applies pending migrations only; Directus stays intact.
# Windows: dev-db-reset.ps1
#
# Optional: SKIP_DIRECTUS=1

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> supabase db reset"
supabase db reset

if [[ "${SKIP_DIRECTUS:-}" == "1" ]]; then
  echo "SKIP_DIRECTUS=1 — not repairing Directus"
  exit 0
fi

exec bash "$ROOT/cms/scripts/sync-directus-after-supabase-reset.sh"
