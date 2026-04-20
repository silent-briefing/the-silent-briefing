# Full local database reset: replays ALL migrations on a wiped DB, then repairs Directus.
# Day-to-day dev: use .\scripts\dev-db-migrate.ps1 instead (applies pending migrations only; keeps Directus).
#
# Prefer this script over running `supabase db reset` alone — the latter wipes Directus without repair.
#
# Usage (from repo root):
#   .\scripts\dev-db-reset.ps1
#
# Optional:
#   .\scripts\dev-db-reset.ps1 -SkipDirectus
#
#Requires -Version 5.1
param(
    [switch] $SkipDirectus
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

Write-Host "==> supabase db reset"
supabase db reset
if ($LASTEXITCODE -ne 0) {
    throw "supabase db reset failed with exit $LASTEXITCODE"
}

if (-not $SkipDirectus) {
    $sync = Join-Path $RepoRoot "cms\scripts\sync-directus-after-supabase-reset.ps1"
    & $sync
}

Write-Host "All done."
