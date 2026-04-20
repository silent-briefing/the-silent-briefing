#!/usr/bin/env bash
# Repair Directus after Supabase db reset. See plans/04_foundation_supabase_directus.md.
# macOS / Linux. (Windows: use sync-directus-after-supabase-reset.ps1)
#
# Optional env:
#   SKIP_BOOTSTRAP=1  SKIP_SCHEMA_APPLY=1  SKIP_REGISTER=1  NO_STOP=1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE="$ROOT/docker-compose.yml"
cd "$ROOT"

if [[ ! -f "$COMPOSE" ]]; then
  echo "docker-compose.yml not found at $COMPOSE" >&2
  exit 1
fi

if [[ -f cms/.env ]] && ! grep -qE '^[[:space:]]*KEY[[:space:]]*=' cms/.env; then
  echo "WARNING: cms/.env has no KEY= — Directus 10+ requires KEY. See cms/.env.example" >&2
fi

wait_health() {
  local max="${1:-150}"
  local i=0
  while [[ "$i" -lt "$max" ]]; do
    if curl -sf "http://127.0.0.1:8055/server/health" >/dev/null; then
      return 0
    fi
    sleep 2
    i=$((i + 2))
  done
  echo "Directus /server/health timeout. Try: docker compose logs directus --tail 80" >&2
  exit 1
}

echo "==> Directus repair: $ROOT"

if [[ "${NO_STOP:-}" != "1" ]]; then
  echo "==> docker compose stop directus"
  docker compose -f "$COMPOSE" stop directus || true
fi

echo "==> docker compose up -d directus"
docker compose -f "$COMPOSE" up -d directus

echo "==> Waiting for /server/health (migrations can take ~60s)..."
wait_health 150

if [[ "${SKIP_BOOTSTRAP:-}" != "1" ]]; then
  echo "==> directus bootstrap"
  docker compose -f "$COMPOSE" exec -T directus npx directus bootstrap || \
    echo "WARNING: bootstrap non-zero exit (often OK if DB already initialized)" >&2
fi

if [[ "${SKIP_SCHEMA_APPLY:-}" != "1" ]]; then
  echo "==> directus schema apply snapshot-baseline.yaml -y"
  if docker compose -f "$COMPOSE" exec -T directus npx directus schema apply /directus/schema/snapshot-baseline.yaml -y; then
    echo "==> schema apply OK"
  else
    echo "WARNING: schema apply failed — on existing metadata use register-app-collections.*" >&2
  fi
fi

if [[ "${SKIP_REGISTER:-}" != "1" ]]; then
  echo "==> register app collections (from cms/.env ADMIN_* if DIRECTUS_* unset)"
  export REPO_ROOT="$ROOT"
  python3 <<'PY'
import os, pathlib, subprocess
root = pathlib.Path(os.environ["REPO_ROOT"])
env_path = root / "cms" / ".env"
env = os.environ.copy()
if env_path.is_file():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k == "ADMIN_EMAIL" and "DIRECTUS_EMAIL" not in env:
            env["DIRECTUS_EMAIL"] = v
        if k == "ADMIN_PASSWORD" and "DIRECTUS_PASSWORD" not in env:
            env["DIRECTUS_PASSWORD"] = v
script = root / "cms" / "scripts" / "register-app-collections.sh"
if env.get("DIRECTUS_EMAIL") and env.get("DIRECTUS_PASSWORD"):
    subprocess.run(["/bin/bash", str(script)], env=env, cwd=str(root), check=False)
else:
    print("Skipping register: set DIRECTUS_EMAIL/PASSWORD or ADMIN_* in cms/.env")
PY
fi

echo ""
echo "Done. http://127.0.0.1:8055/admin — use a private window if the UI cached bad state."
