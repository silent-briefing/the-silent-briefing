# Repair Directus after Supabase `db reset` (or any time Postgres was wiped).
#
# Why: Directus stores its system tables in the SAME database as your app. Resetting Postgres removes them.
# The running container can keep stale state; GraphQL may return INTERNAL_SERVER_ERROR until Directus is
# reinstalled and collection metadata is reapplied.
#
# Prereqs: `cms/.env` with DB_* pointing at Supabase, stable KEY + SECRET (see cms/.env.example), ADMIN_* for bootstrap.
#
# Usage (repo root optional):
#   .\cms\scripts\sync-directus-after-supabase-reset.ps1
#
# Optional: set DIRECTUS_EMAIL / DIRECTUS_PASSWORD to auto-run register-app-collections.ps1 afterward.

#Requires -Version 5.1
param(
    [string] $RepoRoot = "",
    [switch] $SkipBootstrap,
    [switch] $SkipSchemaApply,
    [switch] $SkipRegisterCollections,
    [switch] $NoStop
)

$ErrorActionPreference = "Stop"

if ($RepoRoot -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$ComposeFile = Join-Path $RepoRoot "docker-compose.yml"
if (-not (Test-Path $ComposeFile)) {
    Write-Error "docker-compose.yml not found at $ComposeFile"
}

Set-Location $RepoRoot

$envFile = Join-Path $RepoRoot "cms\.env"
if (Test-Path $envFile) {
    $raw = Get-Content $envFile -Raw
    if ($raw -notmatch '(?m)^KEY\s*=') {
        Write-Warning @"
cms/.env has no KEY= entry. Directus 10+ requires KEY (see cms/.env.example).
Without it, the API may return INTERNAL_SERVER_ERROR after install.
Add:  KEY=<output of: openssl rand -base64 32>
Then re-run this script.
"@
    }
}

function Wait-DirectusHealthy {
    param([int] $MaxSeconds = 150)
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:8055/server/health" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { return }
        } catch {}
        Start-Sleep -Seconds 2
    }
    throw "Directus did not respond on /server/health within ${MaxSeconds}s. Check: docker compose logs directus --tail 80"
}

Write-Host "==> Directus repair: repo $RepoRoot"

if (-not $NoStop) {
    Write-Host "==> docker compose stop directus (drop stale connections after DB recreate)"
    docker compose -f $ComposeFile stop directus
}

Write-Host "==> docker compose up -d directus"
docker compose -f $ComposeFile up -d directus
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit $LASTEXITCODE"
}
Write-Host "==> Waiting for Directus /server/health (first boot can take ~60s while migrations run)..."
Wait-DirectusHealthy

if (-not $SkipBootstrap) {
    Write-Host "==> npx directus bootstrap (install / migrate + admin from ADMIN_* in cms/.env)"
    docker compose -f $ComposeFile exec -T directus npx directus bootstrap
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "bootstrap exited $LASTEXITCODE — if the DB was already installed, this may be harmless. Check logs."
    }
}

if (-not $SkipSchemaApply) {
    Write-Host "==> npx directus schema apply snapshot-baseline.yaml -y"
    Write-Host "    (On a brand-new Directus install this seeds collection metadata. If it errors with"
    Write-Host "    'already exists', your metadata is already present — use register-app-collections.ps1.)"
    docker compose -f $ComposeFile exec -T directus npx directus schema apply /directus/schema/snapshot-baseline.yaml -y
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "schema apply exited $LASTEXITCODE — continuing. Re-run register-app-collections.ps1 to PATCH collection icons/notes."
    } else {
        Write-Host "==> schema apply finished OK"
    }
}

if (-not $SkipRegisterCollections) {
    $cmsEnvPath = Join-Path $RepoRoot "cms\.env"
    if (-not $env:DIRECTUS_EMAIL -and (Test-Path $cmsEnvPath)) {
        Get-Content $cmsEnvPath | ForEach-Object {
            if ($_ -match '^\s*ADMIN_EMAIL=(.+)$') { $env:DIRECTUS_EMAIL = $matches[1].Trim().Trim('"').Trim("'") }
            if ($_ -match '^\s*ADMIN_PASSWORD=(.+)$') { $env:DIRECTUS_PASSWORD = $matches[1].Trim().Trim('"').Trim("'") }
        }
    }
    if ($env:DIRECTUS_EMAIL -and $env:DIRECTUS_PASSWORD) {
        Write-Host "==> register-app-collections.ps1 (ADMIN_* / DIRECTUS_* from cms/.env)"
        & (Join-Path $PSScriptRoot "register-app-collections.ps1")
    } else {
        Write-Host "==> Skipping register-app-collections.ps1 — add ADMIN_EMAIL and ADMIN_PASSWORD to cms/.env"
    }
}

Write-Host ""
Write-Host "Done. Open http://127.0.0.1:8055/admin"
Write-Host "If the UI still shows errors: hard-refresh, try a private window, and confirm cms/.env has KEY + SECRET set (Directus 10+)."
Write-Host "Log in with the email/password from your cms/.env ADMIN_* after a fresh bootstrap, or the password you set in the UI previously (if you did not reset DB)."
Write-Host "If Content is missing tables, run: .\cms\scripts\register-app-collections.ps1 -Email ... -Password ... (or set DIRECTUS_EMAIL / DIRECTUS_PASSWORD and re-run this script without -SkipRegisterCollections)."
