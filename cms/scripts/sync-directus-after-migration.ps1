# Light Directus sync after `supabase migration up` (non-destructive).
#
# Does NOT: stop containers, bootstrap, or schema apply (those are for empty DB / full reset).
# Does: wait for Directus health, then run register-app-collections to refresh collection meta.
#
# Usage:
#   .\cms\scripts\sync-directus-after-migration.ps1
#
# Optional:
#   -SkipRegisterCollections

#Requires -Version 5.1
param(
    [string] $RepoRoot = "",
    [switch] $SkipRegisterCollections
)

$ErrorActionPreference = "Stop"

if ($RepoRoot -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$ComposeFile = Join-Path $RepoRoot "docker-compose.yml"
Set-Location $RepoRoot

function Wait-DirectusHealthyOptional {
    param([int] $MaxSeconds = 30)
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:8055/server/health" -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host "==> Directus post-migration sync (non-destructive)"

if (-not (Wait-DirectusHealthyOptional -MaxSeconds 30)) {
    Write-Warning @"
Directus is not responding on http://127.0.0.1:8055/server/health.
Migrations are already applied. When ready, start Directus:
  docker compose up -d directus
Then run:  .\cms\scripts\register-app-collections.ps1
Or re-run: .\scripts\dev-db-migrate.ps1
"@
    exit 0
}

if ($SkipRegisterCollections) {
    Write-Host "SkipRegisterCollections: nothing else to do."
    exit 0
}

$cmsEnvPath = Join-Path $RepoRoot "cms\.env"
if (-not $env:DIRECTUS_EMAIL -and (Test-Path $cmsEnvPath)) {
    Get-Content $cmsEnvPath | ForEach-Object {
        if ($_ -match '^\s*ADMIN_EMAIL=(.+)$') { $env:DIRECTUS_EMAIL = $matches[1].Trim().Trim('"').Trim("'") }
        if ($_ -match '^\s*ADMIN_PASSWORD=(.+)$') { $env:DIRECTUS_PASSWORD = $matches[1].Trim().Trim('"').Trim("'") }
    }
}

if ($env:DIRECTUS_EMAIL -and $env:DIRECTUS_PASSWORD) {
    Write-Host "==> register-app-collections.ps1 (PATCH collection icons/notes — idempotent)"
    & (Join-Path $PSScriptRoot "register-app-collections.ps1")
} else {
    Write-Host @"
==> Skipping register-app-collections — set ADMIN_EMAIL and ADMIN_PASSWORD in cms/.env
    (or DIRECTUS_EMAIL / DIRECTUS_PASSWORD) so the script can authenticate.
"@
}

Write-Host "Done. Refresh the Directus admin UI if you added new tables or columns."
