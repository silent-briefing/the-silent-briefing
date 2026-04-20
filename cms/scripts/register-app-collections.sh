#!/usr/bin/env bash
# Registers Supabase app tables in Directus (same behavior as register-app-collections.ps1).
# Requires: python3 (macOS / Linux).
#
# Usage:
#   export DIRECTUS_EMAIL='you@example.com' DIRECTUS_PASSWORD='...'
#   ./cms/scripts/register-app-collections.sh
#
# Optional: DIRECTUS_URL, DIRECTUS_ADMIN_TOKEN

set -euo pipefail

export DIRECTUS_URL="${DIRECTUS_URL:-http://127.0.0.1:8055}"

python3 <<'PY'
import json
import os
import urllib.error
import urllib.request

base = os.environ.get("DIRECTUS_URL", "http://127.0.0.1:8055").rstrip("/")
token = os.environ.get("DIRECTUS_ADMIN_TOKEN", "").strip()
if token.lower().startswith("bearer "):
    token = token[7:].strip()

if not token:
    email = os.environ.get("DIRECTUS_EMAIL", "")
    password = os.environ.get("DIRECTUS_PASSWORD", "")
    if not email or not password:
        raise SystemExit("Set DIRECTUS_EMAIL and DIRECTUS_PASSWORD, or DIRECTUS_ADMIN_TOKEN.")
    payload = json.dumps({"email": email, "password": password, "mode": "json"}).encode()
    req = urllib.request.Request(
        f"{base}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        token = json.load(resp)["data"]["access_token"]

def get_json(url, **kw):
    req = urllib.request.Request(url, **kw)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

me = get_json(f"{base}/users/me", headers={"Authorization": f"Bearer {token}"})
print("Authenticated as:", me["data"]["email"])

collections = [
    ("races", "how_to_vote", "Supabase public.races"),
    ("candidates", "person", "Supabase public.candidates"),
    ("entities", "hub", "Supabase public.entities"),
    ("jurisdictions", "account_tree", "Supabase public.jurisdictions"),
    ("officials", "badge", "Supabase public.officials"),
    ("entity_edges", "share", "Supabase public.entity_edges"),
    ("dossier_claims", "article", "Supabase public.dossier_claims"),
    ("rag_chunks", "sticky_note_2", "Supabase public.rag_chunks"),
    ("intelligence_runs", "psychology", "Supabase public.intelligence_runs"),
]

for name, icon, note in collections:
    body = json.dumps({"meta": {"icon": icon, "note": note, "hidden": False, "singleton": False}}).encode()
    req = urllib.request.Request(
        f"{base}/collections/{name}",
        data=body,
        method="PATCH",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req)
        print("OK:", name)
    except urllib.error.HTTPError as e:
        print("WARN:", name, e.read().decode()[:300])

print("Done. Refresh Directus Content.")
PY
