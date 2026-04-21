# Foundation Plan: Supabase Setup + Directus CMS Integration

> **For Claude:** This is a bite-sized, TDD-style implementation plan. Execute one task at a time. Use `supabase` CLI (MCP: `plugin-supabase-supabase`), `bun`/`bunx` for JS, `uv` for Python, `npx` for Directus extensions ONLY. Read `CLAUDE.md` before starting. Nothing is manually created that can be scaffolded.
>
> **Goal:** Stand up the foundational infrastructure — Supabase (local dev) with extended official hierarchy schema + Directus CMS (self-hosted, Docker) connected to the same Postgres, with minimal grants and schema isolation. All scaffolded, nothing handwritten. Ready for backend services and Directus collections configuration.
>
> **Architecture:** Supabase CLI manages local Docker stack (API, DB, Studio). Directus (Docker) connects to the **same Postgres** as Supabase (`host.docker.internal:54322` from the container). App tables stay in `public` with RLS; Directus stores its own metadata in that database too (locally often alongside app tables — acceptable unless something breaks). A narrowed `directus_user` role remains in migrations for stricter deploys later.
>
> **Tech Stack:** Supabase CLI, Docker Compose, Directus (bunx scaffold or Docker), `uv` for Python tooling, `bun` for JS. Migrations via Supabase CLI. No manual SQL editing outside migrations.
>
> **References:** `CLAUDE.md`, `plans/00_task_plan.md` (existing schema: races, candidates, entities), `plans/01_expanded_silent_briefing_platform_plan.md`, `.cursor/rules/supabase-directus.mdc`.

---

## Current Status

- Supabase: local migrations applied (`races`/`candidates`/`entities`, `jurisdictions`/`officials`, `directus_user` + search_path); keys in `.env.local`
- Directus: Docker Compose on port **8055**; collection metadata snapshot `cms/schema/snapshot-baseline.yaml`; script `cms/scripts/register-app-collections.ps1` activates app tables in the Studio sidebar — **operator confirmed successful run** (Content shows app collections).
- Backend: `backend/` FastAPI stub with `POST /v1/intelligence/refresh` for CMS hook

### Day-to-day: apply migrations without wiping Directus

For new migration files, prefer **`scripts/dev-db-migrate.sh`** (macOS/Linux) or **`scripts/dev-db-migrate.ps1`** (Windows). That runs **`supabase migration up`**, which applies **only pending** SQL and leaves Directus admin users and system tables intact. Then **`cms/scripts/sync-directus-after-migration.*`** waits for Directus health and runs **`register-app-collections`** when `ADMIN_*` / `DIRECTUS_*` credentials are available.

Reserve **`dev-db-reset.*`** for rare cases: broken migration history, need a clean replay, or first-time bring-up after a deliberate wipe.

### After `supabase db reset` (Postgres recreated)

Directus stores **its own system tables in the same Postgres** as Supabase. A reset deletes them. The Directus container may also keep **stale connections** or a half-initialized state, which often shows up as **GraphQL / API `INTERNAL_SERVER_ERROR`** until you reinstall and reapply metadata.

**Do not** run `supabase db reset` alone in day-to-day dev unless you immediately repair Directus.

#### One-command flow (recommended)

From the repo root:

```powershell
.\scripts\dev-db-reset.ps1
```

That runs `supabase db reset`, then `cms/scripts/sync-directus-after-supabase-reset.ps1` (stop Directus → start fresh → **`npx directus bootstrap`** → **`npx directus schema apply`** `snapshot-baseline.yaml` → optional collection registration when `DIRECTUS_EMAIL` / `DIRECTUS_PASSWORD` are set).

If you already reset the DB and only need to fix Directus:

```powershell
.\cms\scripts\sync-directus-after-supabase-reset.ps1
```

#### Required env (Directus 10+)

In `cms/.env`, set stable random values for **`KEY`** and **`SECRET`** (see `cms/.env.example`). Missing **`KEY`** or changing it against an existing encrypted install is a common cause of **500 / INTERNAL_SERVER_ERROR**. After a **full** DB reset, a fresh install + stable `KEY`/`SECRET` in `.env` is correct.

#### Manual recovery checklist (legacy)

1. `supabase status` — confirm API/DB URLs (ignore transient **502** messages from the CLI if status is healthy afterward).
2. Run **`sync-directus-after-supabase-reset.ps1`** (preferred) or at minimum: `docker compose stop directus` then `docker compose up -d directus`, then bootstrap + schema apply as in the script.
3. Log in at `http://127.0.0.1:8055/admin` with **`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `cms/.env`** after a fresh bootstrap (or the password you chose in the UI if you did not re-bootstrap).
4. If the browser still shows errors: **hard refresh** or a **private window** (old JWT/local storage can confuse the SPA after a reinstall).
5. Smoke: **Content** lists app collections; PATCH an `officials` row and confirm the hook reaches `POST /v1/intelligence/refresh` (backend running with matching `BACKEND_SERVICE_KEY`).

---

## Task 1: Initialize Supabase CLI Project

**Objective:** Set up `supabase/` directory, verify Docker is available, confirm CLI version.

**Files:**

- Create: `supabase/` (via CLI)
- Create: `supabase/config.toml` (via CLI)
- Create: `.gitignore` update for Supabase secrets

**Step 1: Check prerequisites**

```bash
supabase --version        # should be >= 2.x
docker info               # Docker must be running
```

Expected: version printed, Docker running.

**Step 2: Initialize Supabase**

```bash
supabase init
```

Expected: `supabase/config.toml` created. Accept defaults. Do NOT manually edit `config.toml` yet.

**Step 3: Start local Supabase stack**

```bash
supabase start
```

Expected output contains:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJ...
service_role key: eyJ...
```

Save the anon and service_role keys to `.env.local` (never commit).

**Step 4: Verify Studio**
Open `http://127.0.0.1:54323` in browser. Table Editor should be empty (no public tables yet).

**Step 5: Copy keys to `.env.local`**

```bash
# .env.local (gitignored)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from step 3>
SUPABASE_SERVICE_ROLE_KEY=<from step 3>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Step 6: Commit**

```bash
git add supabase/config.toml .gitignore
git commit -m "feat: initialize supabase cli project"
```

- **Status:** complete

---

## Task 2: Restore Existing Migrations

**Objective:** Apply the races/candidates migration that was already written (from Phase 1 backend work) to the fresh local Supabase instance.

**Files:**

- Existing: `supabase/migrations/20260319180000_races_candidates.sql`

**Step 1: Verify migration file exists**

```bash
ls supabase/migrations/
```

Expected: `20260319180000_races_candidates.sql` (and any others from Phase 1).

**Step 2: Reset and apply all migrations**

```bash
supabase db reset
```

Expected: "Resetting local database…", then "Applying migration 20260319180000_races_candidates…", "Finished".

**Step 3: Verify in Studio**
Open Studio → Table Editor. Tables `races` and `candidates` should be visible.

**Step 4: Check RLS is enabled**
In Studio → Authentication → Policies — confirm RLS is listed as enabled for `races` and `candidates`.

- **Status:** complete

---

## Task 3: Official Hierarchy Schema Migration

**Objective:** Add `jurisdiction_level` enum, `office_type` enum, `jurisdictions` table, and `officials` table. This extends (not replaces) existing `candidates`/`entities`. All new officials/judges point to `entities` graph node.

**Files:**

- Create: `supabase/migrations/20260419000000_jurisdiction_officials.sql`

**Step 1: Create the migration file**

```bash
supabase migration new jurisdiction_officials
```

Expected: creates `supabase/migrations/20260419000000_jurisdiction_officials.sql`.

**Step 2: Write the migration**

Open the generated file and add:

```sql
-- Enable pgvector if not already (from existing plan)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for full-text similarity

-- Jurisdiction level
CREATE TYPE public.jurisdiction_level AS ENUM (
  'federal', 'state', 'county', 'city', 'district'
);

-- Office type
CREATE TYPE public.office_type AS ENUM (
  'senator', 'representative', 'governor', 'lt_governor', 'attorney_general',
  'mayor', 'city_council', 'county_commissioner', 'county_clerk', 'county_mayor',
  'state_supreme_justice', 'state_appellate_judge', 'state_district_judge',
  'federal_judge'
);

-- Jurisdictions (hierarchical)
CREATE TABLE public.jurisdictions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  level       public.jurisdiction_level NOT NULL,
  parent_id   uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL,
  state_code  text,          -- 'UT'
  fips_code   text,          -- federal FIPS for geo cross-ref
  slug        text UNIQUE NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jurisdictions_parent ON public.jurisdictions(parent_id);
CREATE INDEX idx_jurisdictions_level ON public.jurisdictions(level);
CREATE INDEX idx_jurisdictions_slug ON public.jurisdictions(slug);

-- Officials (canonical table for all elected people, judges, candidates)
CREATE TABLE public.officials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  full_name           text NOT NULL,
  slug                text UNIQUE NOT NULL,
  jurisdiction_id     uuid NOT NULL REFERENCES public.jurisdictions(id),
  office_type         public.office_type NOT NULL,
  party               text,           -- NULL for judges (non-partisan in Utah)
  subject_alignment   text CHECK (subject_alignment IN ('gop', 'opposition', 'neutral', 'nonpartisan')),
  term_start          date,
  term_end            date,
  retention_year      int,            -- for judges: year of next retention vote
  is_current          boolean NOT NULL DEFAULT true,
  photo_url           text,
  bio_summary         text,           -- short bio for cards/previews
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz     -- soft delete
);

CREATE INDEX idx_officials_jurisdiction ON public.officials(jurisdiction_id);
CREATE INDEX idx_officials_office_type ON public.officials(office_type);
CREATE INDEX idx_officials_is_current ON public.officials(is_current) WHERE deleted_at IS NULL;
CREATE INDEX idx_officials_slug ON public.officials(slug);
CREATE INDEX idx_officials_entity ON public.officials(entity_id);
-- trigram for name search
CREATE INDEX idx_officials_name_trgm ON public.officials USING gin(full_name gin_trgm_ops);

-- Seed: Utah jurisdictions (canonical)
INSERT INTO public.jurisdictions (name, level, state_code, slug) VALUES
  ('United States', 'federal', 'US', 'us'),
  ('Utah', 'state', 'UT', 'ut'),
  ('Salt Lake County', 'county', 'UT', 'ut-slco'),
  ('Salt Lake City', 'city', 'UT', 'ut-slco-slc');

-- Set parent_id FK after insert
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'us')
  WHERE slug = 'ut';
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'ut')
  WHERE slug = 'ut-slco';
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'ut-slco')
  WHERE slug = 'ut-slco-slc';

-- RLS
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;

-- service_role sees all (bypasses RLS by default, but explicit for clarity)
CREATE POLICY "service_role_all_jurisdictions" ON public.jurisdictions
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_officials" ON public.officials
  TO service_role USING (true) WITH CHECK (true);

-- anon: read published (non-deleted) only
CREATE POLICY "anon_read_jurisdictions" ON public.jurisdictions
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_officials" ON public.officials
  FOR SELECT TO anon USING (deleted_at IS NULL AND is_current = true);

-- Updated-at trigger (reuse or create a simple function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_jurisdictions
  BEFORE UPDATE ON public.jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_officials
  BEFORE UPDATE ON public.officials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Step 3: Apply migration**

```bash
# Normal dev (pending migration only; keeps Directus):
./scripts/dev-db-migrate.sh
# Or: supabase migration up

# Full replay on a wiped DB only when needed:
# supabase db reset
```

Expected: the new migration applies cleanly. Use **`supabase db reset`** only when you intentionally replay the full chain (then run **`dev-db-reset.*`** to repair Directus).

**Step 4: Verify in Studio**

- Tables `jurisdictions` (4 seed rows) and `officials` (empty) appear.
- Types `jurisdiction_level` and `office_type` appear under Database → Types.

**Step 5: Diff to confirm no drift**

```bash
supabase db diff
```

Expected: no diff (schema matches migrations).

**Step 6: Commit**

```bash
git add supabase/migrations/20260419000000_jurisdiction_officials.sql
git commit -m "feat: add jurisdiction hierarchy and officials table with RLS"
```

- **Status:** complete

---

## Task 4: Directus Postgres Role + Schema Grants Migration

**Objective:** Create a dedicated `directus_user` Postgres role with minimal grants so Directus connects safely without full superuser access. Directus system tables go in a `directus` schema to avoid polluting `public`.

**Files:**

- Create: `supabase/migrations/20260419000001_directus_role_grants.sql`

**Step 1: Create migration**

```bash
supabase migration new directus_role_grants
```

**Step 2: Write migration**

```sql
-- Directus schema for system tables (isolate from public)
CREATE SCHEMA IF NOT EXISTS directus;

-- Role for Directus to connect with (not superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'directus_user') THEN
    CREATE ROLE directus_user LOGIN PASSWORD 'changeme_in_env';
  END IF;
END $$;

-- Grant Directus access to both schemas
GRANT USAGE ON SCHEMA public TO directus_user;
GRANT USAGE ON SCHEMA directus TO directus_user;
GRANT ALL PRIVILEGES ON SCHEMA directus TO directus_user;

-- Public schema: read our tables, write via service flows
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO directus_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO directus_user;

-- Allow Directus to create its own tables in directus schema
ALTER DEFAULT PRIVILEGES IN SCHEMA directus
  GRANT ALL ON TABLES TO directus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA directus
  GRANT ALL ON SEQUENCES TO directus_user;

-- Future tables (applies to tables created after this migration)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO directus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO directus_user;
```

**Step 3: Apply**

```bash
supabase db reset
```

Expected: all 3 migrations apply cleanly.

**Step 4: Verify role exists**
In Studio → SQL Editor: `SELECT rolname FROM pg_roles WHERE rolname = 'directus_user';`
Expected: 1 row returned.

**Step 5: Commit**

```bash
git add supabase/migrations/20260419000001_directus_role_grants.sql
git commit -m "feat: create directus_user role and schema isolation"
```

- **Status:** complete

---

## Task 5: Directus Docker Compose Setup

**Objective:** Add Directus to `docker-compose.yml` alongside Supabase local stack. Directus connects to the **same Postgres** as Supabase. Self-hosted, no cloud dependency.

**Files:**

- Create: `docker-compose.yml` (project root, alongside Supabase)
- Create: `cms/.env` (gitignored, Directus env)
- Create: `cms/` directory

**Step 1: Create `cms/.env`**

```bash
mkdir cms
```

Create `cms/.env` (gitignore this file):

```ini
# Directus CMS environment
DB_CLIENT=pg
DB_HOST=127.0.0.1
DB_PORT=54322
DB_DATABASE=postgres
DB_USER=directus_user
DB_PASSWORD=changeme_in_env
DB_SCHEMA=directus

SECRET=<run: openssl rand -base64 32>
ADMIN_EMAIL=admin@silentbriefing.local
ADMIN_PASSWORD=<strong password>

CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000

PUBLIC_URL=http://localhost:8055
PORT=8055
```

**Step 2: Scaffold Directus project**

```bash
cd cms
bunx create-directus-project@latest .
```

Or, for pure Docker approach, create `docker-compose.yml` at project root:

```yaml
version: "3.8"

services:
  directus:
    image: directus/directus:latest
    ports:
      - "8055:8055"
    volumes:
      - ./cms/uploads:/directus/uploads
      - ./cms/extensions:/directus/extensions
    environment:
      SECRET: "${DIRECTUS_SECRET}"
      DB_CLIENT: "pg"
      DB_HOST: "host.docker.internal"   # connects to host Supabase Postgres
      DB_PORT: "54322"
      DB_DATABASE: "postgres"
      DB_USER: "directus_user"
      DB_PASSWORD: "${DIRECTUS_DB_PASSWORD}"
      DB_SCHEMA: "directus"
      ADMIN_EMAIL: "${DIRECTUS_ADMIN_EMAIL}"
      ADMIN_PASSWORD: "${DIRECTUS_ADMIN_PASSWORD}"
      CORS_ENABLED: "true"
      CORS_ORIGIN: "http://localhost:3000"
    restart: unless-stopped
```

**Step 3: Add to `.env.local`**

```bash
DIRECTUS_SECRET=<openssl rand -base64 32>
DIRECTUS_DB_PASSWORD=changeme_in_env
DIRECTUS_ADMIN_EMAIL=admin@silentbriefing.local
DIRECTUS_ADMIN_PASSWORD=<strong>
DIRECTUS_URL=http://localhost:8055
```

**Step 4: Start Directus**

```bash
docker compose up directus -d
```

Expected: Directus starts at `http://127.0.0.1:8055`. **Log in with the email and password you used in the Directus registration / first-run screen** — not necessarily `ADMIN_*` in `cms/.env` (those only seed the first admin when the database has no Directus install yet).

**Step 5: Verify linkage to Supabase**
- **Same DB:** In Supabase Studio → **Table Editor**, pick `public.jurisdictions` (or any app table). In Directus → **Content** → `jurisdictions`, you are viewing the same rows.
- **If Content is empty in the sidebar:** run `cms/scripts/register-app-collections.ps1 -Email you@example.com -Password '…'` (same credentials as the Directus web login — most reliable). Static tokens can 401 if the wrong value was copied; optional: `-Token` / `DIRECTUS_ADMIN_TOKEN`. Or open **Settings → Data Model** and confirm the five app collections are visible.

### Directus quick reference (why login / sidebar looked “wrong”)

| Topic | What to know |
| ----- | ------------ |
| `KEY` + `SECRET` | Directus **10+** requires **`KEY`** in `cms/.env` (encryption at rest). **`SECRET`** signs JWTs. Missing `KEY` often yields **`INTERNAL_SERVER_ERROR`** on GraphQL/API. |
| `supabase db reset` | Wipes Directus tables too. Use **`scripts/dev-db-reset.ps1`** or run **`cms/scripts/sync-directus-after-supabase-reset.ps1`** immediately after any full Postgres reset. |
| Login | After **`directus bootstrap`**, use `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `cms/.env`. Changing those env vars later does **not** change an existing admin password. |
| “No dashboard” | Directus 11 is the **Data Studio**. Use **Content** (data), **Settings → Data Model** (schema/UI), **Settings → Project Settings** (project). There is no separate marketing dashboard. |
| Supabase link | `cms/.env` `DB_*` must match `supabase status` DB URL (`postgres` on port `54322`). If Directus boots and shows the login screen, it already reached Postgres. |
| App tables invisible | Run **`sync-directus-after-supabase-reset.ps1`** (applies `snapshot-baseline.yaml`) and/or `register-app-collections.ps1`. |

**Step 6: Commit**

```bash
git add docker-compose.yml cms/.env.example
git commit -m "feat: add directus docker compose for local cms"
```

(Commit `.env.example` with placeholder values, never actual `.env`).

- **Status:** complete

---

## Task 6: Directus Collections Configuration

**Objective:** Configure Directus to treat `jurisdictions`, `officials`, `entities`, `dossier_claims`, and `rag_chunks` as first-class collections with proper display fields, relations, and interface hints.

**Files:**

- Create: `cms/schema/` directory with Directus schema snapshots
- Modify: Directus admin UI (or use Directus Schema API for code-driven config)

**Step 1: Create schema snapshots directory**

```bash
mkdir -p cms/schema
```

**Step 2: Pull initial schema snapshot**

```bash
# Using Directus CLI
bunx directus schema snapshot ./cms/schema/snapshot.yaml
```

Expected: `snapshot.yaml` created with current Directus model config.

**Step 3: Configure collections via Directus Admin UI**

In Directus admin → Settings → Data Model:

- `officials`: Set display template `{{full_name}} — {{office_type}}`. Add relations: `jurisdiction_id → jurisdictions`, `entity_id → entities`.
- `jurisdictions`: Set display template `{{name}} ({{level}})`. Enable tree view for parent_id hierarchy.
- `entities`: Set display template `{{canonical_name}} [{{type}}]`.
- `dossier_claims`: Set display template `{{claim_text | truncate(60)}} — {{pipeline_stage}}`. Add relation to `officials` (via `candidate_id` or new `official_id` FK — add migration if needed).

**Step 4: Save snapshot after configuration**

```bash
bunx directus schema snapshot ./cms/schema/snapshot_configured.yaml
```

**Step 5: Commit schema snapshot**

```bash
git add cms/schema/
git commit -m "feat: directus collections configured for officials hierarchy"
```

- **Status:** complete (baseline snapshot committed; refine in Admin then re-run `directus schema snapshot`)

---

## Task 7: Directus Extension — LLM Refresh Flow Trigger

**Objective:** Create a Directus Flow that fires when an official is saved/updated, POSTing to the backend worker API to trigger a dossier refresh. This is the Palantir automation hook — edits in CMS → intelligence pipeline runs.

**Files:**

- Create: `cms/extensions/llm-refresh-trigger/` (scaffolded; flat under `cms/extensions/`)

**Step 1: Scaffold extension**

```bash
cd cms
npx create-directus-extension@latest
```

Select: `type: hook`, `name: llm-refresh-trigger`, `language: typescript`.
The CLI may nest output (e.g. under `hooks/`). **Directus only loads extensions that sit directly under `cms/extensions/<name>/` with a `package.json`.** Move or symlink the scaffolded folder to `cms/extensions/llm-refresh-trigger/` (flat) before relying on it in Docker.

**Step 2: Implement hook (~80 LOC)**

Edit `cms/extensions/llm-refresh-trigger/src/index.ts` (or `index.js` if using JavaScript):

```typescript
import type { HookConfig } from '@directus/types';

const config: HookConfig = ({ filter, action }, { env, logger }) => {
  action('items.update', async ({ collection, keys }) => {
    if (collection !== 'officials') return;

    const workerUrl = env['BACKEND_WORKER_URL'] ?? 'http://localhost:8000';

    for (const officialId of keys) {
      try {
        await fetch(`${workerUrl}/v1/intelligence/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     'X-Service-Key': env['BACKEND_SERVICE_KEY'] ?? '' },
          body: JSON.stringify({ official_id: officialId, trigger: 'cms_edit' }),
        });
        logger.info(`LLM refresh triggered for official ${officialId}`);
      } catch (err) {
        logger.error(`Failed to trigger refresh for ${officialId}: ${err}`);
      }
    }
  });
};

export default config;
```

**Step 3: Build extension**

```bash
cd cms/extensions/llm-refresh-trigger
bun run build
```

Expected: compiled output in `dist/`.

**Step 4: Restart Directus to pick up extension**

```bash
docker compose restart directus
```

**Step 5: Test**
Update an official record in Directus. Check backend logs for "LLM refresh triggered" message (even if worker endpoint is a stub returning 200 OK).

**Step 6: Commit**

```bash
git add cms/extensions/
git commit -m "feat: directus hook triggers llm dossier refresh on official update"
```

- **Status:** complete

---

## Task 8: Backend Supabase Client Update

**Objective:** Update existing FastAPI backend to use the new local Supabase URL + keys, and add a stub endpoint for the Directus webhook (`POST /v1/intelligence/refresh`) so the flow trigger from Task 7 works end-to-end.

**Files:**

- Modify: `backend/briefing/config.py` (add new env vars for officials/jurisdictions)
- Modify: `backend/briefing/api/routes/intelligence.py` (or create if not exists)

**Step 1: Add config fields**

In `backend/briefing/config.py`, ensure these are present (use `uv add` if `pydantic-settings` not installed):

```python
class Settings(BaseSettings):
    # ... existing fields ...
    backend_service_key: str = ""         # shared secret for Directus webhook
    # Perplexity Sonar-only defaults; see https://docs.perplexity.ai/docs/sonar/models
    writer_model: str = "sonar-pro"
    adversarial_model: str = "sonar-reasoning-pro"
    correlation_model: str = "sonar"
    research_model: str = "sonar-deep-research"
```

**Step 2: Add stub route**

Create `backend/briefing/api/routes/intelligence.py` (~50 LOC):

```python
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from briefing.config import get_settings

router = APIRouter(prefix="/v1/intelligence", tags=["intelligence"])

class RefreshRequest(BaseModel):
    official_id: str
    trigger: str = "manual"

@router.post("/refresh", status_code=202)
async def trigger_dossier_refresh(
    req: RefreshRequest,
    x_service_key: str = Header(default=""),
    settings = Depends(get_settings),
):
    if settings.backend_service_key and x_service_key != settings.backend_service_key:
        raise HTTPException(status_code=401, detail="Invalid service key")
    # TODO: enqueue ARQ job for LLM refresh
    return {"job_id": None, "official_id": req.official_id, "status": "queued"}
```

**Step 3: Register route in main app**

```python
# backend/briefing/api/main.py
from briefing.api.routes.intelligence import router as intelligence_router
app.include_router(intelligence_router)
```

**Step 4: Run and test**

```bash
uv run uvicorn briefing.api.main:app --reload
curl -X POST http://localhost:8000/v1/intelligence/refresh \
  -H "Content-Type: application/json" \
  -d '{"official_id": "test-123", "trigger": "manual"}'
```

Expected: `{"job_id": null, "official_id": "test-123", "status": "queued"}`.

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add intelligence refresh stub route for directus webhook"
```

- **Status:** complete

---

## Summary & Next Steps

After completing Tasks 1-8:

- Supabase local stack running with full schema (races, candidates, entities, jurisdictions, officials, directus grants).
- Directus running via Docker on the same Postgres as Supabase (see Task 5 quick reference for login + Content sidebar).
- Officials hierarchy (jurisdiction_level, office_type enums, jurisdictions seed) ready for data.
- Directus collections configured, schema snapshots committed.
- LLM refresh flow wired: Directus save → backend `/v1/intelligence/refresh` → (stub for now, real ARQ job in Phase 2).
- Backend stub route for webhook operational.

**Proceed to:** `plans/01_expanded_silent_briefing_platform_plan.md` Phase 1 (judicial extraction + full LLM pipeline) and Phase 3 (operator console frontend).

---

## Clerk JWT → Supabase `authenticated` (Step 3 U3.5)

**Goal:** Phase 3 Next.js operator console reads Supabase with the **end-user’s JWT** (not `service_role` in the browser). Backend workers and FastAPI BFF continue to use `service_role` server-side.

1. **Clerk:** Create a [Supabase JWT template](https://clerk.com/docs/integrations/databases/supabase) in the Clerk dashboard so issued tokens include `sub` (maps to `auth.uid()` in RLS) and any custom claims you standardize on.
2. **Supabase:** Apply migration `20260422103000_authenticated_console_reads.sql` (policies on `jurisdictions`, `officials`, `dossier_claims`, `entity_edges` for role `authenticated`). Re-run `scripts/dev-db-migrate.*` after pull.
3. **Scope:** `authenticated` may SELECT accepted `entity_edges` only (same product bar as anon). `dossier_claims` rows must reference a non–soft-deleted `official` or have `official_id` null (candidate-linked).
4. **RAG:** `match_rag_chunks_public` already grants `EXECUTE` to `authenticated`; embeddings + RPC should run from a **server** context (Server Action / Route Handler / BFF) so the Perplexity key stays off the client unless you add a dedicated edge embedder.
5. **Env (console app):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus Clerk `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`. Never expose `SUPABASE_SERVICE_ROLE_KEY` in Next.js client bundles.

## Errors Encountered


| Error                                                                                                                             | Attempt | Resolution                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directus 11 bootstrap failed as `directus_user` (`permission denied for schema public` / migration `Add Project Owner` TypeError) | 1       | Added `search_path` migration; still failed introspecting `public` during internal migrations. **Local dev:** connect Directus as Supabase `postgres` user (`cms/.env`); keep `directus_user` migration for production-like grants. |
| `supabase db reset` exits 502 restarting containers                                                                               | 1       | Harmless locally; migrations + seed apply; run `supabase status` to confirm stack.                                                                                                                                                  |
| Original `20260319180000_races_candidates.sql` missing from repo                                                                  | 1       | Recreated migration from `plans/00_task_plan.md` + added minimal `entities` so Task 3 `officials.entity_id` FK applies.                                                                                                             |
| `supabase db diff` noisy after Directus bootstrap                                                                                  | 1       | Directus creates `directus_*` tables and Supabase grants outside migration files; diff reflects that. Use diff for migration-only schema, or exclude Directus-managed objects.                                                      |
| Login with `ADMIN_PASSWORD` from `.env` fails after browser registration                                                           | 1       | Expected: admin password is whatever you set in the Directus UI. Env `ADMIN_*` only applies to first automated bootstrap on an empty Directus DB.                                                                                  |
| App tables missing from Directus **Content**                                                                                       | 1       | Postgres tables need `directus_collections` / metadata. Run `cms/scripts/register-app-collections.ps1 -Email … -Password …` (JWT via `/auth/login`), or `-Token` with a **full** user static token. Or apply `cms/schema/snapshot-baseline.yaml` on a fresh instance. |
| Script returns **401** with `-Token`                                                                                               | 1       | Use `-Email` / `-Password` instead (web UI credentials). Regenerate static token if needed; ensure the value is not truncated and is the **user** token, not an unrelated API key.                                                |
| **`supabase db reset` then Directus `POST /auth/login` 401** with `cms/.env` `ADMIN_PASSWORD`                                      | 1       | After reset, the admin user/password in DB may come from the **browser setup** path, not `.env`. Log in via UI, then use those credentials for the script, or update `cms/.env` / env vars to match.                               |
| GraphQL / API **`INTERNAL_SERVER_ERROR`** after Postgres reset                                                                     | 1       | Directus system tables were wiped; container may be half-connected. Run `cms/scripts/sync-directus-after-supabase-reset.ps1` (bootstrap + schema apply). Ensure `cms/.env` has **`KEY`** + **`SECRET`**. Clear browser storage or use a private window. Prefer `scripts/dev-db-reset.ps1` instead of raw `supabase db reset`. |


