# Step 2 + Phase 2 Cohesive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (or subagent-driven-development for same-session execution with per-task review).

**Goal:** Close **Step 2** in `plans/00_task_plan.md` (database vault, RLS, vectors, entity graph hardening) and deliver **Phase 2** in `plans/01_expanded_silent_briefing_platform_plan.md` (Directus judicial CMS) in an order that does not fight migrations, Directus metadata, or future Next.js + Clerk reads.

**Architecture:** Step 2 work is **Postgres-first** (migrations + policies + optional RPC hardening). Phase 2 is **Directus-on-the-same-DB** (extensions, snapshots, collection UX) per `plans/04_foundation_supabase_directus.md`. Directus typically connects with a **DB role that bypasses RLS**; **anon/authenticated** policies you add in Step 2 matter for **future** Supabase-js from the operator console, not for Directus Studio editing. Cohesion = **column names and enums stay stable** so Directus field maps and SQL stay aligned.

**Tech Stack:** Supabase CLI + SQL migrations, Directus 10+ (Docker), `npx`/`bunx` for extensions, `uv`/`pytest` for backend checks, existing `cms/schema/snapshot-baseline.yaml` + `cms/scripts/register-app-collections.*`.

**Read first (zero context):** `CLAUDE.md`, `plans/04_foundation_supabase_directus.md`, `.cursor/rules/supabase-directus.mdc`, `plans/03_progress.md`, `plans/01_expanded_silent_briefing_platform_plan.md`.

---

## Cohesion: execution order (read this once)

```text
1. Step 2 — Inventory & policy decisions (no migrations): Task S0
2. Step 2 — Schema hardening migrations: Tasks S1–S4 (one migration file per task; frequent commits)
3. Phase 2 — Can start in parallel after S1 lands ONLY if you avoid renaming columns;
   recommended: finish S1–S2 before Phase 2.2+ snapshot edits that reference new columns.
4. After Phase 2.2–2.3: run `cms/scripts/sync-directus-after-migration.*` pattern from `04` when schema changes.
5. Step 2 — RLS for `anon`/`authenticated`: Tasks S5–S6 align with product: public dossier vs internal-only claims.
```

**Dependency rules**


| If you change…                  | Then also…                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `public.*` column types / enums | Update `cms/schema/snapshot-baseline.yaml` + re-run registration; verify Directus field types                           |
| RLS on tables Directus edits    | Confirm Directus DB role still bypasses RLS (see `20260419000000_jurisdiction_officials.sql` / `directus_user` in `04`) |
| `match_rag_chunks` signature    | Update any backend caller tests; never expose raw vectors to `anon` without a wrapper                                   |


---

# Part A — Step 2: Database vault hardening

**Maps to:** `plans/00_task_plan.md` § Step 2 (lines ~127–158). **Status today:** graph + claims + vectors + `match_rag_chunks` landed; **enum expansion, RLS review, advisor pass** open.

---

### Task S0: RLS & exposure inventory (documentation only)

**Files:**

- Create: `docs/plans/2026-04-21-step-2-rls-inventory.md` (short matrix; can be a section inside this file instead — prefer **append to this doc** under “Appendix A” to avoid sprawl)
- Read-only: `supabase/migrations/20260319180000_races_candidates.sql`, `20260419000000_jurisdiction_officials.sql`, `20260420120000_entities_claims_vectors_graph.sql`, `20260420120100_link_officials_claims.sql`, `20260420140000_rag_chunks_ann_match.sql`

**Step 1: Build a table**

For each `public` table used by the app, record: RLS on/off, policies by role (`anon`, `authenticated`, `service_role`), and **intended** future consumer (Directus / Next.js anon / worker only).

**Step 2: Run Security Advisor**

Local: Supabase Studio → **Database** → **Security Advisor** (or CLI advisory if you use it). Capture **ERROR** and **WARN** rows relevant to RLS, function `search_path`, and extension privileges.

**Step 3: Commit**

```bash
git add docs/plans/2026-04-21-step-2-phase-2-cohesive-implementation.md
git commit -m "docs: Step 2 RLS inventory and advisor baseline"
```

---

### Task S1: Entity graph — dedupe + optional enum values (YAGNI-safe)

**Files:**

- Create: `supabase/migrations/<timestamp>_entities_dedupe_and_enum.sql` (use `supabase migration new entities_dedupe_and_enum`; **do not** reuse example timestamps if they already exist)
- Modify (if correlation types need DB sync): `backend/briefing/services/llm/correlation.py` — `_ALLOWED_TYPES` / `normalize_entity_type` must match DB enum **or** stay as subset
- Test: `cd backend && uv run pytest tests/test_correlation.py -q`

**Step 1: Write the migration (minimal)**

- Add **partial unique index** preventing duplicate active entities of same type + normalized name, e.g. unique on `(type, lower(trim(canonical_name)))` **only if** product accepts that rule. If not, document “no unique index yet” and only add **btree index** on `(type, lower(canonical_name))` for lookup performance.
- Only `ALTER TYPE ... ADD VALUE` for new `entity_type` values if **both** (a) correlation pipeline emits them and (b) you update normalization. Otherwise skip.

**Step 2: Apply locally**

```powershell
cd c:\Users\dave\projects\the-silent-briefing
.\scripts\dev-db-migrate.ps1
```

Expected: migration applies without error; Directus still healthy (`cms/scripts/sync-directus-after-migration.ps1` if needed).

**Step 3: Run tests**

```bash
cd backend && uv run pytest tests/ -q
```

Expected: all pass.

**Step 4: Commit**

```bash
git add supabase/migrations/*_entities_dedupe_and_enum.sql
git commit -m "feat(db): entity dedupe index and optional enum alignment"
```

---

### Task S2: `rag_chunks` provenance + freshness columns

**Files:**

- Create: `supabase/migrations/<timestamp>_rag_chunks_freshness.sql` (`supabase migration new rag_chunks_freshness`)
- Modify (optional, only if you read these in code): `backend/briefing/services/extraction/opinions.py` — populate new columns in `persist_opinion_chunks` `row` dict

**Step 1: Migration SQL (example — adjust names to taste)**

Add nullable columns:

- `fetched_at timestamptz` — when source bytes were retrieved
- `chunk_version int NOT NULL DEFAULT 1` — bump when re-chunking strategy changes

Backfill: `UPDATE rag_chunks SET fetched_at = created_at WHERE fetched_at IS NULL;`

**Step 2: Apply + verify**

```sql
-- In Studio SQL editor
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rag_chunks'
AND column_name IN ('fetched_at', 'chunk_version');
```

**Step 3: Commit**

```bash
git add supabase/migrations/*_rag_chunks_freshness.sql backend/briefing/services/extraction/opinions.py
git commit -m "feat(db): rag_chunks freshness metadata"
```

---

### Task S3: `match_rag_chunks` — defensive wrapper for future non-service callers (optional but recommended)

**Files:**

- Create: `supabase/migrations/<timestamp>_match_rag_chunks_wrapper.sql` (`supabase migration new match_rag_chunks_wrapper`)
- Read: `supabase/migrations/20260420140000_rag_chunks_ann_match.sql`

**Step 1: Add SQL function** `public.match_rag_chunks_public` (name TBD) that:

- Returns **only** `id`, `content`, `source_url`, `source_type`, `chunk_index`, `similarity` (or distance) — **no embedding column**
- `SECURITY INVOKER`, `STABLE`, strict `LIMIT` cap (e.g. `LEAST(match_count, 50)`)
- `REVOKE ALL FROM PUBLIC` / `GRANT EXECUTE` only to roles you intend (often **authenticated** only, not **anon**, until product approves public RAG)

**Step 2: Document**

In this plan’s Appendix: which role may call which RPC.

**Step 3: Commit**

```bash
git add supabase/migrations/*_match_rag_chunks_wrapper.sql
git commit -m "feat(db): bounded RAG RPC without raw embeddings"
```

---

### Task S4: RLS — align `anon`/`authenticated` with Phase 3 preview (policy tranche)

**Files:**

- Create: `supabase/migrations/<timestamp>_rls_public_read_tranche.sql` (`supabase migration new rls_public_read_tranche`)
- Reference: `plans/01_expanded` Phase 3 (future console) for what should be public

**Step 1: Decide policies (must be explicit)**

Minimal **safe** pattern for a GOP internal tool:

- **dossier_claims:** no `anon` read by default; optional `SELECT` for `authenticated` only when Clerk JWT maps to Supabase — **defer** until Next.js auth wiring exists, OR add narrow policy for `category IN (...)` only.
- **entity_edges:** `SELECT` for `anon` where `status = 'accepted'` (implemented tranche 2).
- **rag_chunks:** avoid broad `anon` `SELECT` on full text; use `match_rag_chunks_public` for authenticated console.

**Step 2: Write migration**

Use `(select auth.uid())` pattern in policies per Supabase RLS performance guidance.

**Step 3: Advisor re-run**

No new **ERROR** rows for “RLS disabled” on exposed tables.

**Step 4: Commit**

```bash
git add supabase/migrations/*_rls_public_read_tranche.sql
git commit -m "feat(db): RLS public read tranche for graph and claims"
```

---

### Task S5: Performance indexes for FKs / policy columns

**Files:**

- Create: `supabase/migrations/<timestamp>_step2_index_pass.sql` (`supabase migration new step2_index_pass`)

**Step 1: Add indexes** on columns used in RLS `USING (...)` and common joins (`dossier_claims.official_id`, `entity_edges.source_entity_id`, etc.) — verify with `EXPLAIN` on representative queries from `plans/01_expanded` Phase 3 snippets.

**Step 2: Commit**

```bash
git add supabase/migrations/*_step2_index_pass.sql
git commit -m "chore(db): indexes for RLS and graph queries"
```

---

# Part B — Phase 2: Directus judicial CMS

**Maps to:** `plans/01_expanded_silent_briefing_platform_plan.md` § Phase 2 (tasks 2.1–2.4). **Foundation:** `plans/04_foundation_supabase_directus.md`, existing `cms/extensions/llm-refresh-trigger/`, `POST /v1/intelligence/refresh` in backend.

---

### Task P2.1: Silent Briefing Directus theme extension

**Files:**

- Create: `cms/extensions/silent-briefing-theme/` (light) and `cms/extensions/silent-briefing-dark/` (**flat** under `cms/extensions/`; Directus only loads immediate children with `package.json`; each theme extension sets one `appearance` — `light` or `dark` — so both folders are needed for branded light and dark)
- Read: `design/colors_and_type.css`, `design/README.md` (if present)
- Modify: `docker-compose.yml` or Directus env so extension is mounted (follow pattern in `04` for extensions volume)
- Test: manual screenshot compare to `design/preview/` (if present)

**Step 1: Scaffold**

From repo root (or `cms/` — pick one and document):

```bash
cd cms
npx create-directus-extension@latest --type theme silent-briefing-theme
```

**Step 2: Map design tokens**

Edit generated theme files so CSS variables mirror:

- Navy sidebar / cream surfaces / gold active states
- Fonts: **Newsreader** (display), **Inter** (UI) — load via `@import` or Directus theme slot per Directus 10 theme extension docs

**Step 3: Wire extension**

Ensure Directus container sees the built extension (bind mount in compose).

**Step 4: Smoke**

Open `http://127.0.0.1:8055/admin` — theme applies without console errors.

**Step 5: Commit**

```bash
git add cms/extensions/silent-briefing-theme docker-compose.yml
git commit -m "feat(directus): silent briefing theme extension"
```

---

### Task P2.2: Official “page” management + LLM refresh panel

**Files:**

- Modify: `cms/schema/snapshot-baseline.yaml` — `officials` collection fields/layout
- Create: `cms/extensions/official-llm-refresh/` (or interface extension — ~60 LOC per `01_expanded`)
- Modify: `backend/briefing/api/routes/intelligence.py` (only if request shape must change) — today: secured `POST /v1/intelligence/refresh`
- Read: `cms/extensions/llm-refresh-trigger/index.js` for payload pattern
- Test: manual — create Justice Test User; click refresh; see FastAPI log / 202

**Step 1: Snapshot**

In Directus Admin, configure `officials` form: `full_name`, `slug`, `office_type`, `jurisdiction_id`, `retention_year`, `photo_url`, `bio_summary`, `is_current`, `metadata` — **must match** `public.officials` columns.

**Step 2: Export snapshot**

Follow `04` to export YAML into `cms/schema/snapshot-baseline.yaml` (or your documented export path).

**Step 3: Custom panel**

Implement button **POST** to `BACKEND_WORKER_URL/v1/intelligence/refresh` with `BACKEND_SERVICE_KEY` header from Directus env (never expose in browser — use server-side hook or secure endpoint pattern; if panel is browser-only, use a **Directus Flow** calling a serverless proxy — **YAGNI:** for local dev, document acceptable risk or use Flow).

**Minimal dev pattern (document in commit message):**

- Prefer **Directus Flow** (server-side) → backend with secret header for v1; avoid embedding service key in custom panel JS.

**Step 4: Commit**

```bash
git add cms/schema/snapshot-baseline.yaml cms/extensions/official-llm-refresh
git commit -m "feat(directus): officials layout and LLM refresh trigger"
```

---

### Task P2.3: Dossier claims + human review surfaces

**Files:**

- Modify: `cms/schema/snapshot-baseline.yaml` — `dossier_claims`, `intelligence_runs` layouts
- Optional: `cms/extensions/` dashboard widget for `requires_human_review = true`
- Test: insert claim via Directus; verify DB row; edit claim; `updated_at` changes

**Step 1: Configure `dossier_claims`**

Read-only display for LLM fields (`pipeline_stage`, `groundedness_score`); editable `claim_text`, `source_url`, `category`, `sentiment`; enforce enum options matching Postgres enums (`pipeline_stage` / claim categories).

**Step 2: Review queue**

Directus **Insights** dashboard: filter `intelligence_runs` where `requires_human_review` is true (boolean).

**Step 3: Commit**

```bash
git add cms/schema/snapshot-baseline.yaml
git commit -m "feat(directus): dossier claims and review queue layouts"
```

**Implementation note (tranche 3, 2026-04-20):** `directus schema apply` cannot **create** `directus_fields` rows for columns that already exist on mirrored Postgres tables (Directus returns `Field "id" already exists`). This tranche ships **`display_template`** updates on `officials`, `dossier_claims`, and `intelligence_runs` plus the **Insights** review workflow as a **manual** filter. Detailed layouts (readonly LLM fields, enum dropdowns, sort order) should be finalized in Studio, then **`directus schema snapshot`** merged into `snapshot-baseline.yaml`, or applied via **PATCH** `/fields/:collection/:field`.

**Implementation note (tranche 5, 2026-04-20):** **`register-app-collections.ps1` / `.sh`** PATCHes **`dossier_claims`** (readonly: `pipeline_stage`, provenance + `groundedness_score`; `category` / `sentiment` **select-dropdown** with **`allowOther`**) and **`intelligence_runs`** (readonly: run metadata + costs + `raw_response`; **`requires_human_review`** stays editable). Re-run after new environments or when field meta drifts.

---

### Task P2.4: Jurisdiction hierarchy browser

**Files:**

- Modify: `cms/schema/snapshot-baseline.yaml` — `jurisdictions` tree (`parent_id` self-relation)
- Modify: `cms/scripts/register-app-collections.*` — idempotent relation + `parent_id` M2O interface + collection `display_template` / `sort_field` (covers stacks where YAML relation apply is finicky)
- Optional seed: `supabase/migrations/*_west_jordan_jurisdiction.sql` — example city under SLCO
- Test: expand UT → SLCO → SLC + West Jordan; Content module **layout → Tree**

**Step 1: Configure M2O self-relation** `parent_id` → `jurisdictions.id`

**Step 2: Tree interface** — Directus **Content → jurisdictions → layout Tree** (available once the self-relation exists).

**Step 3: Commit**

```bash
git add cms/schema/snapshot-baseline.yaml cms/scripts/register-app-collections.ps1 cms/scripts/register-app-collections.sh supabase/migrations/*_west_jordan_jurisdiction.sql
git commit -m "feat(directus): jurisdiction hierarchy tree"
```

**Implementation note (tranche 4, 2026-04-20):** Snapshot lists the FK-backed relation for fresh `directus schema apply`. **`register-app-collections`** also POSTs the relation and PATCHes `parent_id` / collection meta so existing environments pick up hierarchy without a full reset.

---

## Cross-cutting verification (after Part A + Part B)

**Step 1: Backend tests**

```bash
cd backend && uv run pytest tests/ -q
```

Expected: all pass.

**Step 2: Migrations**

```powershell
.\scripts\dev-db-migrate.ps1
```

**Step 3: Directus sync**

```powershell
.\cms\scripts\sync-directus-after-migration.ps1
```

**Step 4: Smoke hook**

PATCH an `officials` row in Directus; confirm `llm-refresh-trigger` still fires (`04` checklist).

**Step 5: Update `plans/03_progress.md`**

One session log entry: Step 2 + Phase 2 tranche status, advisor results summary, screenshots note for theme.

---

## Appendix A — RLS & exposure inventory (Task S0 baseline, 2026-04-21)

Source: `supabase/migrations/*.sql` as of tranche 1. **authenticated**: no table policies reference it yet (Clerk → Supabase JWT wiring is Phase 3). **Directus:** connects with the DB user in `cms/.env`; local stacks often use **`postgres` (superuser)**, which bypasses RLS — Studio still works while `anon` remains locked down. **`directus_user`** in migrations is for stricter deploys; if Directus ever connects as `directus_user` without `BYPASSRLS`, add explicit policies or use the Supabase **service role** only from trusted backends.

Audit query (Studio SQL): `SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;`


| Table             | RLS | anon                                         | authenticated | service_role | Intended consumer (today)                                                                |
| ----------------- | --- | -------------------------------------------- | ------------- | ------------ | ---------------------------------------------------------------------------------------- |
| entities          | ON  | none                                         | none          | ALL (policy) | Workers; future console                                                                  |
| races             | ON  | none                                         | none          | ALL          | Workers                                                                                  |
| candidates        | ON  | none                                         | none          | ALL          | Workers                                                                                  |
| jurisdictions     | ON  | SELECT (all rows)                            | none          | ALL          | Public read + Directus                                                                   |
| officials         | ON  | SELECT (`deleted_at IS NULL AND is_current`) | none          | ALL          | Public roster + Directus                                                                 |
| entity_edges      | ON  | SELECT (`status = accepted`)                 | none          | ALL          | Anon: accepted edges only (tranche 2)                                                    |
| dossier_claims    | ON  | none                                         | none          | ALL          | Workers; Phase 2 Directus                                                                |
| rag_chunks        | ON  | none                                         | none          | ALL          | Workers; `match_rag_chunks` / `match_rag_chunks_public` via service_role / authenticated |
| intelligence_runs | ON  | none                                         | none          | ALL          | Workers; Phase 2 review UI                                                               |


### Security Advisor (manual)

Run in **Supabase Studio → Database → Security Advisor** on local (or hosted) after `supabase start`. Paste **ERROR/WARN** rows affecting `public` into `plans/03_progress.md` or this appendix when triaged. CLI alternative: `supabase db lint` if enabled in your CLI version.

### Database lint (CLI) vs Studio Security Advisor

**CLI:** **`supabase db lint`** checks a configured rule set; one run reported **no schema errors** (CLI v2.78.x local). Rules and versions can differ from the **Dashboard → Database → Security Advisor** UI.

**Studio:** The advisor often reports **ERROR** for **`public.directus_*`** tables: **RLS disabled in public** ([lint 0013](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)) and **sensitive columns exposed** on `directus_users`, `directus_sessions`, `directus_shares` ([lint 0023](https://supabase.com/docs/guides/database/database-linter?lint=0023_sensitive_columns_exposed)). That is **expected** with the current architecture: Directus stores system metadata in **`public`**, and Supabase **PostgREST** exposes **`public`** (`supabase/config.toml` → `[api].schemas`). So **`anon` / `authenticated` clients could theoretically hit those tables via the Data API** unless you add RLS, revoke grants, or stop exposing them.

**Product meaning:** This is **not** “you forgot RLS on `officials`.” It is “**CMS system tables live in the same exposed schema as the app**.” Directus itself talks to Postgres with a **privileged DB user** and does not rely on Supabase RLS for those rows.

**Remediation (pick one direction; don’t blindly enable RLS on all `directus_*` without testing):**

1. **Isolate Directus metadata** — run Directus against a **separate database** or a **non-API schema** (e.g. `directus` schema) and keep **`public`** for app tables only; align `config.toml` so PostgREST does not expose the CMS schema.
2. **Lock down API** — deny **`anon`/`authenticated`** default privileges on `directus_*` and/or add **RLS + deny-all** policies **if** you confirm Directus still works (Directus typically uses `postgres` / service-style role locally).
3. **Accept + document for internal dev** — if only **trusted** backends use the Supabase **service_role** and browsers never use the anon key against these tables, treat advisor rows as **known exceptions** until (1) or (2).

### Database lint (CLI, tranche 6)

**`supabase db lint`** on local (schemas `directus`, `extensions`, `public`): **2026-04-20** — **No schema errors found** in that CLI run. **Do not equate** that with an empty **Studio Security Advisor** list; see above.

## Appendix B — Vector RPC roles (Task S3, tranche 2)


| Function                                      | Returns embedding?                        | EXECUTE granted to              | Notes                                                       |
| --------------------------------------------- | ----------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `public.match_rag_chunks(vector, int)`        | no (similarity only)                      | `service_role`                  | Existing worker / backend                                   |
| `public.match_rag_chunks_public(vector, int)` | no; includes `source_type`, `chunk_index` | `authenticated`, `service_role` | `SECURITY DEFINER`, `SET search_path = public`, max 50 rows |


**Not granted:** `anon` (no public RAG until product approves).

---

## Execution status — Step 2 + Phase 2 cohesive (closed tranche 6)

| Scope | Status |
| ----- | ------ |
| **S0** — Appendix A RLS matrix, advisor / lint process | Done (matrix + **`supabase db lint`** clean on local 2026-04-20) |
| **S1** — Entity dedupe index | Done (`idx_entities_type_canonical_norm`) |
| **S2** — `rag_chunks` freshness columns | Done |
| **S3** — `match_rag_chunks_public` | Done (Appendix B); not granted to `anon` |
| **S4** — `anon` read accepted `entity_edges` | Done |
| **S5** — RLS/index helper indexes | Done |
| **P2.1** — Directus themes | Done (light + dark extensions) |
| **P2.2** — Officials + LLM refresh (hook, endpoint, panel) | Done |
| **P2.3** — Claims / runs UX | Done (snapshot `display_template` + **register** field PATCHes, tranche 5) |
| **P2.4** — Jurisdictions tree | Done (snapshot relation + register + West Jordan seed) |
| **Cross-cutting** — pytest, migrate, Directus sync | Done tranche 6 |
| **Smoke** — PATCH `officials` → `llm-refresh-trigger` | **Operator** (see `plans/04_foundation_supabase_directus.md`); not automated here |

**Outside this plan (follow `plans/00_task_plan.md` / Phase 3):** entity enum expansion, `authenticated` JWT policies (Clerk), Studio Security Advisor UI rows if any WARN beyond lint, optional full `directus schema snapshot` merge for field layouts.

---

**Plan complete and saved to** `docs/plans/2026-04-21-step-2-phase-2-cohesive-implementation.md`.