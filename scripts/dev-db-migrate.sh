#!/usr/bin/env bash
# Apply pending Supabase migrations locally WITHOUT wiping the database.
# Directus survives — prefer this for day-to-day dev.
#
# Destructive full replay (rare): ./scripts/dev-db-reset.sh
#
# Optional: SKIP_DIRECTUS=1

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> supabase migration up (non-destructive)"
supabase migration up

if [[ "${SKIP_DIRECTUS:-}" == "1" ]]; then
  echo "SKIP_DIRECTUS=1 — not syncing Directus collection metadata"
  exit 0
fi

exec bash "$ROOT/cms/scripts/sync-directus-after-migration.sh"
