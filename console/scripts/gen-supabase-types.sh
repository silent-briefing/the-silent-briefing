#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/.."
supabase gen types typescript --local > "$ROOT/src/lib/supabase/types.ts"
