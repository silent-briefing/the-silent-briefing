$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "..")
supabase gen types typescript --local | Set-Content -Encoding utf8 (Join-Path $root "src\lib\supabase\types.ts")
