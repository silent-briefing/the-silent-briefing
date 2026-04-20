#!/usr/bin/env bash
# Light Directus sync after `supabase migration up`. Does not bootstrap or schema-apply.
#
# Optional: SKIP_REGISTER=1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

wait_health_short() {
  local max="${1:-30}"
  local i=0
  while [[ "$i" -lt "$max" ]]; do
    if curl -sf "http://127.0.0.1:8055/server/health" >/dev/null; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

echo "==> Directus post-migration sync (non-destructive)"

if ! wait_health_short 30; then
  echo "WARNING: Directus not up on :8055 — migrations already applied." >&2
  echo "  Start: docker compose up -d directus" >&2
  echo "  Then:  ./cms/scripts/register-app-collections.sh" >&2
  exit 0
fi

if [[ "${SKIP_REGISTER:-}" == "1" ]]; then
  echo "SKIP_REGISTER=1 — done."
  exit 0
fi

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
    print("Skipping register: set ADMIN_EMAIL/ADMIN_PASSWORD in cms/.env or DIRECTUS_* env vars.")
PY

echo "Done. Refresh Directus admin if schema changed."
