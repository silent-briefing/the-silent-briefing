# Apply pending Supabase migrations locally WITHOUT wiping the database.
# Directus admin users, metadata, and KEY/SECRET stay valid — use this for day-to-day dev.
#
# For a full destructive replay of all migrations (rare): .\scripts\dev-db-reset.ps1
#
# Usage (repo root):
#   .\scripts\dev-db-migrate.ps1
#
# Optional:
#   .\scripts\dev-db-migrate.ps1 -SkipDirectus    # only SQL, no collection PATCHes
#
#Requires -Version 5.1
param(
    [switch] $SkipDirectus
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

Write-Host "==> supabase migration up (non-destructive)"
supabase migration up
if ($LASTEXITCODE -ne 0) {
    throw "supabase migration up failed with exit $LASTEXITCODE"
}

if (-not $SkipDirectus) {
    $sync = Join-Path $RepoRoot "cms\scripts\sync-directus-after-migration.ps1"
    & $sync
}

Write-Host "Done."
