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

def request_json(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        if raw:
            return json.loads(raw.decode())
    return None

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

# P2.4: jurisdictions self-M2O + Tree-friendly meta (parity with .ps1)
try:
    request_json(
        "PATCH",
        f"{base}/collections/jurisdictions",
        {
            "meta": {
                "display_template": "{{name}} · {{level}}",
                "sort_field": "name",
                "note": "Supabase public.jurisdictions — hierarchical via parent_id; switch Content layout to Tree after relation exists.",
            }
        },
    )
    print("OK: jurisdictions (display/sort meta)")
    rels = get_json(f"{base}/relations", headers={"Authorization": f"Bearer {token}"})
    has = any(
        r.get("collection") == "jurisdictions" and r.get("field") == "parent_id"
        for r in rels.get("data", [])
    )
    if not has:
        request_json(
            "POST",
            f"{base}/relations",
            {
                "many_collection": "jurisdictions",
                "many_field": "parent_id",
                "one_collection": "jurisdictions",
                "one_field": None,
            },
        )
        print("OK: jurisdictions parent_id -> jurisdictions (relation created)")
    else:
        print("OK: jurisdictions parent relation already present")
    request_json(
        "PATCH",
        f"{base}/fields/jurisdictions/parent_id",
        {
            "meta": {
                "interface": "select-dropdown-m2o",
                "options": {"template": "{{name}} · {{slug}}"},
            }
        },
    )
    print("OK: fields/jurisdictions/parent_id (M2O picker)")
except urllib.error.HTTPError as e:
    print("WARN: jurisdictions hierarchy:", e.read().decode()[:400])

def patch_field(coll, field, meta):
    try:
        request_json("PATCH", f"{base}/fields/{coll}/{field}", {"meta": meta})
        print("OK:", f"{coll}.{field}")
    except urllib.error.HTTPError as e:
        print("WARN:", f"{coll}.{field}", e.read().decode()[:400])

print("==> P2.3 field meta (dossier_claims / intelligence_runs)")
for f in (
    "pipeline_stage",
    "groundedness_score",
    "llm_provider",
    "model_id",
    "api_surface",
    "prompt_id",
    "prompt_version",
    "retrieved_at",
):
    patch_field("dossier_claims", f, {"readonly": True})
patch_field(
    "dossier_claims",
    "category",
    {
        "interface": "select-dropdown",
        "options": {
            "choices": [
                {"text": "Retention Voting", "value": "Retention Voting"},
                {"text": "Bio", "value": "Bio"},
                {"text": "Record", "value": "Record"},
                {"text": "News", "value": "News"},
                {"text": "Analysis", "value": "Analysis"},
                {"text": "Vetting", "value": "Vetting"},
                {"text": "Other", "value": "Other"},
            ],
            "allowOther": True,
        },
    },
)
patch_field(
    "dossier_claims",
    "sentiment",
    {
        "interface": "select-dropdown",
        "options": {
            "choices": [
                {"text": "Positive", "value": "positive"},
                {"text": "Negative", "value": "negative"},
                {"text": "Neutral", "value": "neutral"},
                {"text": "Unknown", "value": "unknown"},
            ],
            "allowOther": True,
        },
    },
)
for f in (
    "pipeline_stage",
    "model_id",
    "status",
    "error_message",
    "tokens_input",
    "tokens_output",
    "cost_usd",
    "raw_response",
    "groundedness_score",
    "idempotency_key",
):
    patch_field("intelligence_runs", f, {"readonly": True})
patch_field("intelligence_runs", "requires_human_review", {"readonly": False})

print("Done. Refresh Directus Content.")
PY
