# Registers Supabase app tables in Directus so they appear under Content / Data Model.
#
# Auth (pick one):
#   A) Recommended: log in with your Directus admin email + password (same as the web UI).
#   B) Static token: full token from Directus → your avatar → your user → Token field (one long value).
#      If you get 401, use (A) — some token UIs copy the wrong value, or the token was rotated.
#
# Usage:
#   .\register-app-collections.ps1 -Email you@example.com -Password 'your-ui-password'
#   .\register-app-collections.ps1 -Token 'paste-full-static-token'
#   $env:DIRECTUS_URL = 'http://127.0.0.1:8055'   # optional

param(
    [string] $BaseUrl = $(if ($env:DIRECTUS_URL) { $env:DIRECTUS_URL.TrimEnd('/') } else { "http://127.0.0.1:8055" }),
    [string] $Email = $env:DIRECTUS_EMAIL,
    [string] $Password = $env:DIRECTUS_PASSWORD,
    [string] $Token = $env:DIRECTUS_ADMIN_TOKEN
)

# Auto-fill from cms/.env ADMIN_* when not using a static token (same as Directus bootstrap).
$cmsEnv = Join-Path $PSScriptRoot "..\.env"
if (-not $Token -and ((-not $Email) -or (-not $Password)) -and (Test-Path $cmsEnv)) {
    $adm = @{}
    Get-Content $cmsEnv | ForEach-Object {
        if ($_ -match '^\s*ADMIN_EMAIL=(.+)$') { $adm.Email = $matches[1].Trim().Trim('"').Trim("'") }
        if ($_ -match '^\s*ADMIN_PASSWORD=(.+)$') { $adm.Password = $matches[1].Trim().Trim('"').Trim("'") }
    }
    if (-not $Email -and $adm.Email) { $Email = $adm.Email }
    if (-not $Password -and $adm.Password) { $Password = $adm.Password }
}

function Get-AccessToken {
    if ($Email -and $Password) {
        $loginBody = @{
            email    = $Email
            password = $Password
            mode     = "json"
        } | ConvertTo-Json
        try {
            $resp = Invoke-RestMethod `
                -Uri "$BaseUrl/auth/login" `
                -Method Post `
                -ContentType "application/json; charset=utf-8" `
                -Body $loginBody
        } catch {
            Write-Error "POST /auth/login failed: $($_.Exception.Message). Check email/password (same as Directus web login)."
            exit 1
        }
        if (-not $resp.data.access_token) {
            Write-Error "Login response missing data.access_token."
            exit 1
        }
        return $resp.data.access_token
    }

    if (-not $Token) {
        Write-Error @"
Provide either:
  -Email and -Password (or set DIRECTUS_EMAIL / DIRECTUS_PASSWORD), or
  -Token (or DIRECTUS_ADMIN_TOKEN) with your full static token from Directus user settings.
"@
        exit 1
    }

    $t = $Token.Trim()
    if ($t.StartsWith("Bearer ", [StringComparison]::OrdinalIgnoreCase)) {
        $t = $t.Substring(7).Trim()
    }
    return $t
}

$accessToken = Get-AccessToken
$headers = @{
    Authorization = "Bearer $accessToken"
}

try {
    $me = Invoke-RestMethod -Uri "$BaseUrl/users/me" -Headers $headers -Method Get
    Write-Host "Authenticated as: $($me.data.email)"
} catch {
    Write-Error @"
Auth check GET /users/me failed: $($_.Exception.Message)

If you used -Token: regenerate a static token in Directus (user menu → your account → Token), paste the entire value, and try again. Do not use a Project API key unless it maps to an admin user.

If you used -Email/-Password: use the same credentials as http://127.0.0.1:8055 (not cms/.env ADMIN_PASSWORD unless you never completed web registration).
"@
    exit 1
}

$collections = @(
    @{ name = "races"; icon = "how_to_vote"; note = "Supabase public.races" },
    @{ name = "candidates"; icon = "person"; note = "Supabase public.candidates" },
    @{ name = "entities"; icon = "hub"; note = "Supabase public.entities" },
    @{ name = "jurisdictions"; icon = "account_tree"; note = "Supabase public.jurisdictions" },
    @{ name = "officials"; icon = "badge"; note = "Supabase public.officials" },
    @{ name = "entity_edges"; icon = "share"; note = "Supabase public.entity_edges" },
    @{ name = "dossier_claims"; icon = "article"; note = "Supabase public.dossier_claims" },
    @{ name = "rag_chunks"; icon = "sticky_note_2"; note = "Supabase public.rag_chunks" },
    @{ name = "intelligence_runs"; icon = "psychology"; note = "Supabase public.intelligence_runs" }
)

foreach ($c in $collections) {
    $body = @{
        meta = @{
            icon      = $c.icon
            note      = $c.note
            hidden    = $false
            singleton = $false
        }
    } | ConvertTo-Json -Compress -Depth 5

    try {
        Invoke-RestMethod `
            -Uri "$BaseUrl/collections/$($c.name)" `
            -Method Patch `
            -Headers $headers `
            -ContentType "application/json; charset=utf-8" `
            -Body $body | Out-Null
        Write-Host "OK: $($c.name)"
    } catch {
        Write-Warning "PATCH $($c.name) failed: $($_.Exception.Message). Ensure Supabase migrations created the table, then re-run."
    }
}

Write-Host "Done. Refresh Directus — Content should list these collections (same Postgres as Supabase Studio)."
