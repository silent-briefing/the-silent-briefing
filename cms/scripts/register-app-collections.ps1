# Registers Supabase app tables in Directus so they appear under Content / Data Model.
# Prereq: static token with admin access — Directus → user menu → your account → Token → generate.
# Usage:
#   $env:DIRECTUS_ADMIN_TOKEN = "your-token"
#   ./cms/scripts/register-app-collections.ps1
# Optional: -BaseUrl "http://127.0.0.1:8055"

param(
    [string] $BaseUrl = $(if ($env:DIRECTUS_URL) { $env:DIRECTUS_URL } else { "http://127.0.0.1:8055" }),
    [string] $Token = $env:DIRECTUS_ADMIN_TOKEN
)

if (-not $Token) {
    Write-Error "Set DIRECTUS_ADMIN_TOKEN or pass -Token (create in Directus: Account Settings → Admin Options → Token)."
    exit 1
}

$headers = @{
    Authorization = "Bearer $Token"
}

$collections = @(
    @{ name = "races"; icon = "how_to_vote"; note = "Supabase public.races" },
    @{ name = "candidates"; icon = "person"; note = "Supabase public.candidates" },
    @{ name = "entities"; icon = "hub"; note = "Supabase public.entities" },
    @{ name = "jurisdictions"; icon = "account_tree"; note = "Supabase public.jurisdictions" },
    @{ name = "officials"; icon = "badge"; note = "Supabase public.officials" }
)

foreach ($c in $collections) {
    $body = @{
        meta = @{
            icon     = $c.icon
            note     = $c.note
            hidden   = $false
            singleton = $false
        }
    } | ConvertTo-Json -Compress -Depth 5

    try {
        Invoke-RestMethod `
            -Uri "$BaseUrl/collections/$($c.name)" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $body | Out-Null
        Write-Host "OK: $($c.name)"
    } catch {
        Write-Warning "PATCH $($c.name) failed: $($_.Exception.Message). If this is a fresh DB, create tables via Supabase migrations first, then re-run."
    }
}

Write-Host "Done. Refresh Directus — open Content to browse rows (same Postgres as Supabase Studio)."
