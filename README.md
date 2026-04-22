# The Silent Briefing

Palantir-style political intelligence for Utah: Supabase (Postgres + RLS + pgvector), Directus CMS, FastAPI workers, and a future Next.js operator console. Canonical engineering standards live in `[CLAUDE.md](CLAUDE.md)`.

## Prerequisites


| Tool                                                      | Notes                                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Docker**                                                | Supabase local stack + Directus container. On **macOS**, Docker Desktop or Colima is typical.       |
| **Supabase CLI**                                          | `brew install supabase/tap/supabase` (Mac) or [install docs](https://supabase.com/docs/guides/cli). |
| **Python 3.12+** and **[uv](https://docs.astral.sh/uv/)** | Backend only: `curl -LsSf https://astral.sh/uv/install.sh | sh` (Mac/Linux).                        |
| **bun**                                                 | Operator console (`console/`) — install from [bun.sh](https://bun.sh)                                |


First-time **macOS/Linux**: make scripts executable once:

```bash
chmod +x scripts/*.sh cms/scripts/*.sh
```

## Configuration (local development)

Repo defaults are wired so **local Supabase** uses a **fixed JWT secret** (see `supabase/config.toml` → `[auth].jwt_secret`). You still complete **Clerk** in the dashboard once per Clerk application (integration cannot be committed to git).

### 1) Supabase CLI

```bash
supabase start
# Optional: supabase status -o env   # ANON_KEY / JWT_SECRET should match console defaults & config.toml
```

Apply migrations (day-to-day):

```bash
./scripts/dev-db-migrate.sh          # macOS/Linux
.\scripts\dev-db-migrate.ps1       # Windows
```

### 2) Clerk ↔ Supabase (required for browser RLS)

Do this in **[Clerk Dashboard](https://dashboard.clerk.com)** for the app that owns your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`:

1. **Integrations → Supabase** — set **JWT secret** to the same value as local Supabase:
   - **`super-secret-jwt-token-with-at-least-32-characters-long`**  
   - (Must match `JWT_SECRET` from `supabase status -o env` and `[auth].jwt_secret` in `supabase/config.toml`.)
2. **JWT Templates** — create template named **`supabase`** with claims from **[`config/clerk-supabase-jwt-template.md`](config/clerk-supabase-jwt-template.md)** (`role: authenticated`, `app_role` from `public_metadata`, `org_id`, `sub`, `aud`).
3. Enable **Organizations** if you use org-scoped data (e.g. `alerts`).
4. Set each user’s **`public_metadata.role`** to `admin`, `operator`, or `viewer`.

If you skip step 1–2, the console still runs but Clerk will 404 on `/tokens/supabase` and PostgREST sees **anon** only until the template exists.

### 3) Directus (Docker)

Copy **`cms/.env.example`** → **`cms/.env`**. Set **`KEY`** and **`SECRET`** to long random strings (e.g. `openssl rand -base64 32` each). Set **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD`** for first bootstrap.  
**Important:** Directus reads **`cms/.env` only** (via `docker-compose.yml`). Do not put Directus **`KEY`** in `.env.local` — the container will not see it.

### 4) Postgres host from Directus

Local Supabase DB is `127.0.0.1:54322`. Inside Docker, use **`DB_HOST=host.docker.internal`** (as in the example) so Directus reaches the host Postgres.

### 5) Backend env

See **[`CLAUDE.md`](CLAUDE.md)** for `Settings` / worker variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`, etc.). Never put **`service_role`** in the Next.js bundle.

## Operator console (Next.js)

The app lives in **`console/`** (package name `silent-briefing-console`). `create-next-app` cannot use the folder name `console` as the npm package name (reserved), so the **directory** is `console/` and the **package** is named `silent-briefing-console`.

```bash
cd console
# `next dev` loads committed `.env.development` (Clerk test keys + local Supabase defaults).
# Copy `.env.local.example` → `.env.local` only when you need overrides.
bun install
bun run dev                        # http://localhost:3000
```

- **Typecheck:** `bun run typecheck` (`tsc --noEmit`, strict).
- **Tests:** `bun run test` (Vitest). **Lint:** `bun run lint` (ESLint 9 + `eslint-config-next`). **Production build:** `bun run build` (run before `bun run start` or before CI-style E2E).
- **E2E:** `bun run test:e2e` (Playwright — shell smoke, axe on `/`, `/judicial/supreme-court`, `/admin`). **Local:** start the app on `http://127.0.0.1:3000` (`bun run dev` or `bun run build && bun run start`), then run `bun run test:e2e`. **CI:** sets `CI=true` so Playwright starts `bun run start` after `build` (port **3000** must be free on the runner).
- **Dev server** uses **webpack** (`bun run dev`) by default to avoid Turbopack instability with Clerk on some Windows hosts; use `bun run dev:turbo` if you prefer Turbopack.
- **Public routes:** `/sign-in`, `/sign-up`, `GET /api/health`. All other routes require Clerk; `/admin/*` requires `public_metadata.role === "admin"` (see `CLAUDE.md` § Authentication).
- **CI:** see [Continuous integration (GUI)](#continuous-integration-gui) (`gui-ci.yml`).

## Local development

From the **repository root**:

```bash
# 1) Start local Supabase (Postgres, API, Studio, etc.)
supabase start

# 2) Start Directus against the same Postgres
docker compose up -d directus
```

**Apply new migrations (default for day-to-day)** — pending SQL only; **does not** wipe Postgres or Directus:

```bash
# macOS / Linux (after one-time chmod +x from Prerequisites)
./scripts/dev-db-migrate.sh

# Windows (PowerShell)
.\scripts\dev-db-migrate.ps1
```

Optional: `SKIP_DIRECTUS=1 ./scripts/dev-db-migrate.sh` to skip collection metadata PATCHes. If Directus is stopped, start it with `docker compose up -d directus` and run `cms/scripts/register-app-collections.*`.

**Full database reset** (destructive — replays everything; use when you truly need a clean slate or migrations are broken):

```bash
# macOS / Linux
./scripts/dev-db-reset.sh

# Windows (PowerShell)
.\scripts\dev-db-reset.ps1
```

To reset only Supabase and skip Directus repair: `SKIP_DIRECTUS=1 ./scripts/dev-db-reset.sh`.

### Backend API

```bash
cd backend
uv sync
uv run playwright install chromium   # needed for HTML extraction paths
uv run uvicorn briefing.api.main:app --reload --host 0.0.0.0 --port 8000
```

**API surface (Step 0):** `GET /health`, `GET /version`, secured trigger routes under `/v1/…`. Responses echo or assign `**X-Request-ID`** for correlation. Long-running scrape / LLM / embed work runs in the `**python -m briefing.worker**` CLI (or future queue — ARQ/Redis not wired yet).

**Workers (CLI):** `**python -m briefing.worker --dry-run**` prints a **schedule catalog** (cron-style recipes; no ARQ in-repo yet). Subcommands include `judicial-extraction`, `retention-extraction`, `opinion-ingestion` (UT Supreme PDFs → chunks; `--persist` also runs correlation on each opinion unless `--no-correlate`; add `PERPLEXITY_API_KEY` and omit `--dry-run` to embed), `correlation-pass` (text → proposed `entity_edges`), `correlation-recent-chunks` (recent `rag_chunks` → same correlation pass; needs Supabase to read chunks), `baseline-extraction` (vote.utah / optional SLCO / Civic), `adversarial-dossier` (four-stage Sonar pipeline; `--persist` needs `--official-id` + Supabase). Run `**uv run pytest tests/`** for unit tests.

Point `**BACKEND_WORKER_URL**` in `cms/.env` at this host (the example uses `http://host.docker.internal:8000`).

### Directus

- UI: `**http://localhost:8055**` (or `PUBLIC_URL` in `cms/.env`).
- After a reset, scripts run `**directus bootstrap**`, `**schema apply**`, and **register app collections** using `**ADMIN_*`** from `cms/.env` when `DIRECTUS_*` login env vars are not set.

## Moving from Windows to Mac

- Use the `**.sh**` scripts instead of `**.ps1**`.
- Re-copy secrets into `**cms/.env**` and `**.env.local**` on the new machine (do not rely on Windows-only paths).
- Run `**chmod +x**` on shell scripts once.
- Install Supabase CLI and Docker for Mac; `**supabase start**` will print new local keys — update `.env.local` if keys change.

## Production deployment

Adjust for your host (Vercel, Fly, Railway, AWS, etc.). **Never** ship `service_role` or the Supabase **JWT secret** to the browser.

### Supabase (hosted)

| Step | Action |
|------|--------|
| 1 | Create a project; run **`supabase db push`** / linked migrations from CI. |
| 2 | **Project Settings → API → JWT Secret** — use this in Clerk **Integrations → Supabase** (not the local demo string). |
| 3 | **Project URL** + **anon key** → `NEXT_PUBLIC_SUPABASE_*` on the console. |
| 4 | **`service_role`** only in backend / workers / CI — never in the browser bundle. |

### Clerk (production)

| Step | Action |
|------|--------|
| 1 | Paste hosted **JWT secret** into Clerk **Integrations → Supabase**. |
| 2 | JWT template **`supabase`** — claims in [`config/clerk-supabase-jwt-template.md`](config/clerk-supabase-jwt-template.md). |
| 3 | **Redirect / allowed URLs** → your HTTPS origin. |
| 4 | **`public_metadata.role`** + orgs for real users. |

### Console env (example)

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BFF_BASE_URL`; omit `NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE` unless you rename the template.

### Backend, Directus, ops

- **Backend:** hosted URLs + **`SUPABASE_SERVICE_ROLE_KEY`** per [`backend/briefing/config.py`](backend/briefing/config.py).
- **Directus:** Postgres URL to the same DB; **`cms/.env`** secrets in a vault; **`PUBLIC_URL`** HTTPS.
- **DB wipe:** repair flow or backup — [`docs/plans/04_foundation_supabase_directus.md`](docs/plans/04_foundation_supabase_directus.md).

## Continuous integration (GUI)

Workflow **[`.github/workflows/gui-ci.yml`](.github/workflows/gui-ci.yml)** runs on pushes and pull requests that touch `console/`, `backend/`, or the workflow itself.

| Job | What it runs |
|-----|----------------|
| **console-typecheck-lint** | `bun install`, `bun run typecheck`, `bun run lint` |
| **console-unit** | `bun run test` (Vitest), `bun run check:secrets` (no `service_role` in `console/src`) |
| **console-build** | `bun run build` (production bundle) |
| **console-e2e-a11y** | `bun run build`, Playwright (shell smoke + axe on `/`, `/judicial/supreme-court`, `/admin`; `next start` via Playwright `webServer` when `CI=true`) |
| **console-lighthouse** | Build, `next start`, **Lighthouse CI** (`console/lighthouserc.cjs`) — asserts accessibility / soft perf budgets |
| **backend-pytest** | `uv sync`, `uv run pytest` |

**Secrets (optional):** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the repo for CI that matches your Clerk test instance. If unset, the workflow uses **non-secret fallbacks** so forks still compile; E2E may still hit Clerk sign-in for unauthenticated flows.

Use **Bun** via `oven-sh/setup-bun` and **uv** via `astral-sh/setup-uv` (no Node matrix).

## Docs

- [`CLAUDE.md`](CLAUDE.md) — standards, env split, automation rules for agents.
- [`docs/plans/04_foundation_supabase_directus.md`](docs/plans/04_foundation_supabase_directus.md) — Directus + Supabase pitfalls (`KEY`, `INTERNAL_SERVER_ERROR`, reset flow).
- [`config/clerk-supabase-jwt-template.md`](config/clerk-supabase-jwt-template.md) — Clerk **supabase** JWT claims + local JWT secret value.
- [`dev.supabase.env`](dev.supabase.env) — documents local `JWT_SECRET` (same as `supabase status`); optional copy to `.env` if you switch config to `env()`.

