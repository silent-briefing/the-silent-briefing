# The Silent Briefing

Palantir-style political intelligence for Utah: Supabase (Postgres + RLS + pgvector), Directus CMS, FastAPI workers, and a future Next.js operator console. Canonical engineering standards live in [`CLAUDE.md`](CLAUDE.md).

## Prerequisites

| Tool | Notes |
|------|--------|
| **Docker** | Supabase local stack + Directus container. On **macOS**, Docker Desktop or Colima is typical. |
| **Supabase CLI** | `brew install supabase/tap/supabase` (Mac) or [install docs](https://supabase.com/docs/guides/cli). |
| **Python 3.12+** and **[uv](https://docs.astral.sh/uv/)** | Backend only: `curl -LsSf https://astral.sh/uv/install.sh \| sh` (Mac/Linux). |
| **bun** (optional, for future console) | [bun.sh](https://bun.sh) |

First-time **macOS/Linux**: make scripts executable once:

```bash
chmod +x scripts/*.sh cms/scripts/*.sh
```

## Configuration

1. **Supabase + backend (repo root)**  
   Copy or create **`.env.local`** with values from `supabase start` / `supabase status` (`SUPABASE_*`, `DATABASE_URL`, API keys you use). See [`CLAUDE.md`](CLAUDE.md) for the full variable list.

2. **Directus (Docker)**  
   Copy **`cms/.env.example`** → **`cms/.env`**. Set **`KEY`** and **`SECRET`** to long random strings (e.g. `openssl rand -base64 32` each). Set **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD`** for first bootstrap.  
   **Important:** Directus reads **`cms/.env` only** (via `docker-compose.yml`). Do not put Directus **`KEY`** in `.env.local` — the container will not see it.

3. **Postgres host from Directus**  
   Local Supabase DB is `127.0.0.1:54322`. Inside Docker, use **`DB_HOST=host.docker.internal`** (as in the example) so Directus reaches the host Postgres.

## Local development

From the **repository root**:

```bash
# 1) Start local Supabase (Postgres, API, Studio, etc.)
supabase start

# 2) Start Directus against the same Postgres
docker compose up -d directus
```

**Full database reset** (applies migrations **and** repairs Directus — prefer this over `supabase db reset` alone):

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

Point **`BACKEND_WORKER_URL`** in `cms/.env` at this host (the example uses `http://host.docker.internal:8000`).

### Directus

- UI: **`http://localhost:8055`** (or `PUBLIC_URL` in `cms/.env`).
- After a reset, scripts run **`directus bootstrap`**, **`schema apply`**, and **register app collections** using **`ADMIN_*`** from `cms/.env` when `DIRECTUS_*` login env vars are not set.

## Moving from Windows to Mac

- Use the **`.sh`** scripts instead of **`.ps1`**.
- Re-copy secrets into **`cms/.env`** and **`.env.local`** on the new machine (do not rely on Windows-only paths).
- Run **`chmod +x`** on shell scripts once.
- Install Supabase CLI and Docker for Mac; **`supabase start`** will print new local keys — update `.env.local` if keys change.

## Deployment (production outline)

This is a **pattern**, not a single recipe — adjust for your host (Fly, Railway, AWS, etc.).

1. **Supabase (hosted)**  
   Create a project, set secrets in CI/CD, run **`supabase db push`** or link migrations to your pipeline. Never expose **`service_role`** to browsers.

2. **Postgres access**  
   Directus needs a **direct Postgres** connection string to the **same** database Supabase uses (or a read replica if you split later). Store `KEY`, `SECRET`, and DB credentials in your platform’s secret manager.

3. **Directus**  
   Run the official image (same as local) with **`cms/.env`**-equivalent env vars, persistent volumes for **`cms/uploads`**, and extensions mounted or baked into an image. Set **`PUBLIC_URL`** to your HTTPS admin URL.

4. **Backend**  
   Container or managed Python with **`uv sync`**, process manager, and env mirroring `.env.local` (Supabase URL/keys, `PERPLEXITY_API_KEY`, etc.). Run Playwright/browser deps only on workers that need scraping.

5. **Frontend / console**  
   Deploy Next.js (or static) with Clerk keys and public Supabase anon key; enforce RLS.

6. **Operational rule**  
   After any migration that recreates or wipes the DB in a shared Directus environment, run the **same repair sequence** as local (`bootstrap` → `schema apply` → collection registration) or restore from backup — see **`plans/04_foundation_supabase_directus.md`**.

## Docs

- [`CLAUDE.md`](CLAUDE.md) — standards, env split, automation rules for agents.
- [`plans/04_foundation_supabase_directus.md`](plans/04_foundation_supabase_directus.md) — Directus + Supabase pitfalls (`KEY`, `INTERNAL_SERVER_ERROR`, reset flow).
