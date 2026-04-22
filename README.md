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

## Configuration

1. **Supabase + backend (repo root)**
  Copy or create `**.env.local`** with values from `supabase start` / `supabase status` (`SUPABASE_*`, `DATABASE_URL`, API keys you use). See `[CLAUDE.md](CLAUDE.md)` for the full variable list.
2. **Directus (Docker)**
  Copy `**cms/.env.example`** → `**cms/.env**`. Set `**KEY**` and `**SECRET**` to long random strings (e.g. `openssl rand -base64 32` each). Set `**ADMIN_EMAIL**` / `**ADMIN_PASSWORD**` for first bootstrap.  
   **Important:** Directus reads `**cms/.env` only** (via `docker-compose.yml`). Do not put Directus `**KEY`** in `.env.local` — the container will not see it.
3. **Postgres host from Directus**
  Local Supabase DB is `127.0.0.1:54322`. Inside Docker, use `**DB_HOST=host.docker.internal`** (as in the example) so Directus reaches the host Postgres.

## Operator console (Next.js)

The app lives in **`console/`** (package name `silent-briefing-console`). `create-next-app` cannot use the folder name `console` as the npm package name (reserved), so the **directory** is `console/` and the **package** is named `silent-briefing-console`.

```bash
cd console
cp .env.local.example .env.local   # add Clerk + Supabase keys from Clerk dashboard and supabase status
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

## Deployment (production outline)

This is a **pattern**, not a single recipe — adjust for your host (Fly, Railway, AWS, etc.).

1. **Supabase (hosted)**
  Create a project, set secrets in CI/CD, run `**supabase db push`** or link migrations to your pipeline. Never expose `**service_role**` to browsers.
2. **Postgres access**
  Directus needs a **direct Postgres** connection string to the **same** database Supabase uses (or a read replica if you split later). Store `KEY`, `SECRET`, and DB credentials in your platform’s secret manager.
3. **Directus**
  Run the official image (same as local) with `**cms/.env`**-equivalent env vars, persistent volumes for `**cms/uploads**`, and extensions mounted or baked into an image. Set `**PUBLIC_URL**` to your HTTPS admin URL.
4. **Backend**
  Container or managed Python with `**uv sync`**, process manager, and env mirroring `.env.local` (Supabase URL/keys, `PERPLEXITY_API_KEY`, etc.). Run Playwright/browser deps only on workers that need scraping.
5. **Frontend / console**
  Deploy Next.js (or static) with Clerk keys and public Supabase anon key; enforce RLS.
6. **Operational rule**
  After any migration that recreates or wipes the DB in a shared Directus environment, run the **same repair sequence** as local (`bootstrap` → `schema apply` → collection registration) or restore from backup — see `**plans/04_foundation_supabase_directus.md`**.

## Continuous integration (GUI)

Workflow **[`.github/workflows/gui-ci.yml`](.github/workflows/gui-ci.yml)** runs on pushes and pull requests that touch `console/`, `backend/`, or the workflow itself.

| Job | What it runs |
|-----|----------------|
| **console-typecheck-lint** | `bun install`, `bun run typecheck`, `bun run lint` |
| **console-unit** | `bun run test` (Vitest), `bun run check:secrets` (no `service_role` in `console/src`) |
| **console-build** | `bun run build` (production bundle) |
| **console-e2e-a11y** | `bun run build`, Playwright (shell smoke + axe on `/`, `/judicial/supreme-court`, `/admin`; `next start` via Playwright `webServer` when `CI=true`) |
| **console-lighthouse** | Build, `next start`, **Lighthouse CI** (`console/lighthouserc.cjs`) — `continue-on-error: true` until budgets are baselined |
| **backend-pytest** | `uv sync`, `uv run pytest` |

**Secrets (optional):** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the repo for CI that matches your Clerk test instance. If unset, the workflow uses **non-secret fallbacks** so forks still compile; E2E may still hit Clerk sign-in for unauthenticated flows.

Use **Bun** via `oven-sh/setup-bun` and **uv** via `astral-sh/setup-uv` (no Node matrix).

## Docs

- `[CLAUDE.md](CLAUDE.md)` — standards, env split, automation rules for agents.
- `[docs/plans/04_foundation_supabase_directus.md](docs/plans/04_foundation_supabase_directus.md)` — Directus + Supabase pitfalls (`KEY`, `INTERNAL_SERVER_ERROR`, reset flow).

