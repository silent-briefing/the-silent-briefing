# Phase C — Admin Console (`/admin/*`)

> **For Claude:** REQUIRED SUB-SKILL: `superpowers:executing-plans` or `superpowers:subagent-driven-development`. **Depends on Phase A**; can run in parallel with Phase B (distinct file surfaces). Every admin mutation MUST write to `admin_audit_log` via the BFF helper (Phase A.9).

**Goal:** Give admins a complete, design-system-consistent GUI that fully replaces Directus for day-to-day work across ten concerns: Officials CRUD, Dossier review, Intel runs observability, Correlations review, Sources & feeds config, Users & roles, Opinions/bills ingestion, Media curation, Engine ops dashboard, System settings.

**Architecture:** All admin mutations go through the FastAPI BFF under `/v1/admin/*` (verified Clerk JWT, `service_role` Supabase client, audit-log on every write). Admin reads use `supabase-js` under authenticated RLS where possible; fall back to BFF reads when joins or `service_role`-only views are needed. Admin UI uses the shadcn primitives re-themed in Phase A.7 + TanStack Table + TanStack Query.

**Tech Stack:** inherits A + B. Adds: `react-hook-form` + `@hookform/resolvers/zod` everywhere, `date-fns` for timestamps, `@monaco-editor/react` for claim-text editing (swap to `react-textarea-autosize` if Monaco bundle is too heavy — evaluate in C.2).

**Read first:**
- `docs/plans/task_plan.md`, `docs/plans/findings.md` §2–§5
- `CLAUDE.md` § Database (schema rules, RLS), § CMS — Directus (what we're replacing)
- `backend/briefing/services/intelligence/*` — retrieval, writer, routing, evidence bundle
- `backend/briefing/services/llm/adversarial_pipeline.py` — the pipeline admins trigger
- `backend/briefing/services/schedule_catalog.py` — job names
- `supabase/migrations/` (latest) — table shapes

---

## Task C.1 — Admin shell + audit log wiring

**Files:**
- Create: `console/src/app/(admin)/admin/layout.tsx` (already stubbed in A.6; flesh out navigation)
- Create: `console/src/components/admin/AdminNav.tsx` (sidebar lists 10 concerns with Lucide icons 20px)
- Create: `console/src/components/admin/AdminHeader.tsx` (breadcrumb + environment badge (`local`/`staging`/`prod`) in gold UPPERCASE tracked)
- Create: `console/src/components/admin/MutationConfirm.tsx` (crimson-accented destructive confirm dialog — the signal-only use of `--secondary`)
- Create: `backend/briefing/services/audit/log.py` — `write_audit(actor, action, target, before, after)`
- Modify: every BFF admin handler (added in C.2–C.10) — must call `write_audit` inside its DB transaction

**Step 1:** AdminNav items (each links to its page, added in C.2–C.10):
1. Officials
2. Dossiers & Claims
3. Intel Runs
4. Correlations
5. Sources & Feeds
6. Users & Roles
7. Opinions & Bills
8. Media Coverage
9. Engine Ops
10. Settings

**Step 2:** `/admin` index page = dashboard tiles summarizing each concern (counts + "needs review" badges pulling from dedicated views).

**Step 3:** `write_audit` helper writes to `admin_audit_log` (Phase A.5) inside the same transaction as the mutation — either both commit or neither. Unit-test with a forced failure after mutation but before commit (no audit row expected).

**Step 4:** Commit: `feat(admin): shell navigation + audit log helper`.

---

## Task C.2 — Officials CRUD

**Files:**
- Create: `console/src/app/(admin)/admin/officials/page.tsx` — TanStack Table (server-side pagination, filters match operator hub)
- Create: `console/src/app/(admin)/admin/officials/new/page.tsx` — create form
- Create: `console/src/app/(admin)/admin/officials/[id]/page.tsx` — edit form
- Create: `console/src/components/admin/officials/OfficialForm.tsx` (react-hook-form + Zod; fields: full_name, slug (auto-derived + editable), office_type, jurisdiction_id, party, subject_alignment, is_current, retention_year, bio_summary)
- Create: `backend/briefing/api/routes/admin/officials.py` — `GET /v1/admin/officials` (filtered list), `POST`, `PATCH /{id}`, `DELETE /{id}` (soft via `deleted_at`)
- Create: `backend/tests/test_api_admin_officials.py`

**Rules:**
- Slug uniqueness enforced in DB; form shows conflict error inline.
- `office_type` restricted to enum from CLAUDE.md (`state_supreme_justice`, etc.).
- Judges cannot have `party` set (validation + DB check constraint from Phase 1 schema).
- Every mutation audit-logged with before/after.

**Step 1:** Zod schema in `console/src/lib/schemas/official.ts` — reused by form + BFF validation.

**Step 2:** Pytest: each route × each role (admin passes, operator forbidden, viewer forbidden).

**Step 3:** Playwright: create → edit → soft-delete → verify list.

**Step 4:** Commit: `feat(admin): officials CRUD`.

---

## Task C.3 — Dossier review & approval queue

**Files:**
- Create: `console/src/app/(admin)/admin/dossiers/page.tsx` — queue (filter: `requires_human_review`, category, groundedness < threshold)
- Create: `console/src/app/(admin)/admin/dossiers/[official_id]/page.tsx` — side-by-side review: claims list (left) + adversarial critique (right) + groundedness meter (top)
- Create: `console/src/components/admin/dossiers/ClaimEditor.tsx` (edit text, edit sources, toggle `published`, mark reviewed)
- Create: `console/src/components/admin/dossiers/PublishBar.tsx` (bulk-publish selected claims; crimson confirm)
- Create: `backend/briefing/api/routes/admin/dossiers.py` — `GET /queue`, `GET /official/{id}`, `PATCH /claim/{id}`, `POST /publish`, `POST /claim/{id}/reject`

**Rules:**
- Publish sets `published=true` AND `reviewed_at=now()` AND `reviewed_by=<clerk_user_id>`.
- Reject sets `published=false`, writes a `review_note`, keeps claim for history.
- Groundedness score (already stored on `dossier_claims`) shown as colored bar (cream → gold → crimson bands, not a rainbow).

**Step 1:** Ensure columns exist (`published`, `reviewed_at`, `reviewed_by`, `review_note`) — add migration if missing.

**Step 2:** Pytest + Playwright for queue → review → publish flow.

**Step 3:** Commit: `feat(admin): dossier review + approval queue`.

---

## Task C.4 — Intel runs observability + trigger

**Files:**
- Create: `console/src/app/(admin)/admin/runs/page.tsx` — table of `intelligence_runs` (status, model_id, tokens, groundedness, pipeline_stage, idempotency_key, created_at)
- Create: `console/src/app/(admin)/admin/runs/[id]/page.tsx` — single-run view (raw request/response JSON pretty-printed, timing, cost, retry count)
- Create: `console/src/components/admin/runs/TriggerRunDialog.tsx` — pick job (`retrieval-pass`, `dossier-write`, `adversarial-dossier`, `correlation-pass`, `retention-extraction`, `opinion-ingestion`), pick official, pick flags; submit → POST to BFF
- Create: `backend/briefing/api/routes/admin/runs.py` — `GET /`, `GET /{id}`, `POST /trigger` (accepts job name + params; dispatches via the existing worker or enqueues)

**Rules:**
- `POST /trigger` validates job name against `schedule_catalog.py` registry.
- Idempotency: if a matching `(job, target, idempotency_key)` run is already in-flight, return 409 with the existing run id.
- Live status: poll every 3s from the UI until terminal state (keep simple; no WebSockets v1).

**Step 1:** Ensure `schedule_catalog` exposes a machine-readable list; add `get_catalog()` if not present.

**Step 2:** Pytest: invalid job rejected; valid job dispatched; duplicate returns 409.

**Step 3:** Commit: `feat(admin): intel run observability + manual trigger`.

---

## Task C.5 — Correlations review (`entity_edges`)

**Files:**
- Create: `console/src/app/(admin)/admin/correlations/page.tsx` — proposed edges queue (filter by confidence threshold, relation type, source/target entity)
- Create: `console/src/components/admin/correlations/EdgeCard.tsx` (shows source → relation → target + provenance + confidence + "accept/reject/escalate")
- Create: `console/src/components/admin/correlations/BatchBar.tsx` (bulk accept above confidence X)
- Create: `backend/briefing/api/routes/admin/correlations.py` — `GET /proposed`, `POST /{id}/accept`, `POST /{id}/reject`, `POST /batch-accept`

**Rules:**
- Accept flips `status='accepted'`; surfaces in operator graph (B.7).
- Reject flips `status='rejected'`; does not delete (audit trail).
- Batch-accept requires confirm dialog + explicit confidence threshold input (no accidental mass-accept).

**Step 1:** Pytest + Playwright.

**Step 2:** Commit: `feat(admin): correlations review queue`.

---

## Task C.6 — Sources & feeds config

**Files:**
- Create: `console/src/app/(admin)/admin/sources/page.tsx` — list of source URLs (from `backend/briefing/defaults/source_urls.py` + any `settings` overrides)
- Create: `console/src/app/(admin)/admin/sources/[key]/page.tsx` — edit override
- Create: `console/src/app/(admin)/admin/feeds/page.tsx` — X + Perplexity feed configuration (enabled flags, cache TTL, per-official opt-out)
- Create: `backend/briefing/api/routes/admin/sources.py` — `GET /`, `PATCH /{key}` (writes to `settings` table; runtime reads from `settings` first, defaults second)
- Create: `backend/briefing/api/routes/admin/feeds.py`
- Modify: `backend/briefing/config.py` — source URLs read from `settings` fallback-to-env-fallback-to-default

**Step 1:** Define `SettingDescriptor` (type, default, validator) in backend; API exposes it so the UI can render the right input (url/int/bool/string).

**Step 2:** Pytest for settings precedence (db > env > default).

**Step 3:** Commit: `feat(admin,api): sources + feeds configuration`.

---

## Task C.7 — Users & roles (Clerk Organizations)

**Files:**
- Create: `console/src/app/(admin)/admin/users/page.tsx` — list of org members with role badges
- Create: `console/src/components/admin/users/InviteDialog.tsx`
- Create: `console/src/components/admin/users/RoleChanger.tsx`
- Create: `backend/briefing/api/routes/admin/users.py` — proxies to Clerk Backend API (list members, invite, update role, remove)
- Modify: `backend/briefing/config.py` — `CLERK_SECRET_KEY` usage boundary

**Rules:**
- Only `admin` role in the current org can manage users (double-check against Clerk `org:admin` system role + app `admin` role).
- Setting `role=admin` on another user requires typed confirmation (target email re-entered).
- Every change audit-logged.

**Step 1:** `clerk-sdk-python` via `uv add`; use official SDK, do not hand-roll Clerk API calls.

**Step 2:** Pytest with mocked Clerk SDK.

**Step 3:** Commit: `feat(admin,api): users & roles via Clerk Organizations`.

---

## Task C.8 — Opinions & bills ingestion

**Files:**
- Create: `console/src/app/(admin)/admin/opinions/page.tsx` — list + upload PDF (triggers `opinion-ingestion` worker job scoped to that file)
- Create: `console/src/app/(admin)/admin/opinions/[id]/page.tsx` — review chunks, tag, link to officials/bills
- Create: `console/src/app/(admin)/admin/bills/page.tsx` — list + create; link sponsors (officials) and related opinions
- Create: `backend/briefing/api/routes/admin/opinions.py`
- Create: `backend/briefing/api/routes/admin/bills.py`
- Storage: Supabase Storage bucket `opinions-pdf` (private; accessed via signed URL from BFF)

**Rules:**
- PDF upload → stored in bucket → enqueues `opinion-ingestion` run → chunks appear under the opinion.
- Linking = insert into `entity_edges` with `status='accepted'` directly (admin-curated) + audit.

**Step 1:** Migration for `opinions-pdf` bucket policies (admin-only).

**Step 2:** Pytest for upload → enqueue + link mutations.

**Step 3:** Commit: `feat(admin,api): opinions + bills ingestion and linking`.

---

## Task C.9 — Media coverage curation

**Files:**
- Create: `console/src/app/(admin)/admin/media/page.tsx` — list (from `media_coverage`), filter by official, publish state
- Create: `console/src/components/admin/media/MediaForm.tsx` (headline, outlet, url, published_at, officials linked)
- Create: `backend/briefing/api/routes/admin/media.py`

**Step 1:** If `media_coverage` doesn't exist yet, add migration (columns: id, headline, outlet, url unique, published_at, fetched_at, summary, published boolean, created_by).

**Step 2:** Pytest + Playwright.

**Step 3:** Commit: `feat(admin,api): media coverage curation`.

---

## Task C.10 — Engine ops dashboard

**Files:**
- Create: `console/src/app/(admin)/admin/ops/page.tsx` — health view: API `/health`, `/version`, worker subprocesses, recent job failures, Supabase Studio link, Sentry link (if configured), Perplexity quota (from `intelligence_runs` last 24h tokens)
- Create: `console/src/components/admin/ops/ExtractionHealth.tsx` (per source: last successful fetch, last error, avg latency)
- Create: `console/src/components/admin/ops/JobQueueCard.tsx` (top 10 recent runs per pipeline stage)
- Create: `console/src/components/admin/ops/DataQualityCard.tsx` (counts of unlinked claims, officials with zero claims, stale dossiers per `RETRIEVAL_STALE_DAYS`)
- Create: `backend/briefing/api/routes/admin/ops.py` — aggregates the above from existing tables + worker probe

**Step 1:** No new tables — all views on existing `intelligence_runs`, `dossier_claims`, `officials`.

**Step 2:** Pytest for the aggregation endpoint.

**Step 3:** Commit: `feat(admin): engine ops dashboard`.

---

## Task C.11 — System settings

**Files:**
- Create: `console/src/app/(admin)/admin/settings/page.tsx` — categorized settings (LLM tiers, retrieval routing, staleness days, feature flags, feed cache TTLs)
- Create: `console/src/components/admin/settings/SettingsForm.tsx` (generic — renders inputs from `SettingDescriptor` list)
- Reuse: BFF `/v1/admin/sources` etc. (settings = sources table from C.6 generalized)

**Step 1:** Include LLM model tiers (`WRITER_MODEL`, `ADVERSARIAL_MODEL`, `CORRELATION_MODEL`, `RESEARCH_MODEL`) as settings (with env fallback — never override production env silently; UI shows "using env value" badge when DB override absent).

**Step 2:** Feature flag editor writes to `feature_flags` (Phase A.5).

**Step 3:** Commit: `feat(admin): system settings`.

---

## Task C.12 — Admin accessibility + performance + audit sweep

**Files:**
- Modify: all admin routes — axe pass (focus traps on dialogs; table keyboard nav)
- Modify: `gui-ci.yml` — add admin routes to axe + Lighthouse runs
- Add: E2E test `console/tests/e2e/audit-log.spec.ts` — perform one mutation per admin concern; verify matching `admin_audit_log` row exists

**Step 1:** Run sweep; fix issues.

**Step 2:** Commit: `chore(admin): a11y + audit log E2E coverage`.

---

## Task C.13 — Docs + progress

**Files:**
- Modify: `docs/plans/progress.md` — Phase C entry
- Modify: `docs/plans/task_plan.md` — Phase C complete
- Modify: `CLAUDE.md` — point CMS section to admin, mark Directus as "on sunset path, see Phase D"

**Step 1:** Commit: `docs: Phase C admin console complete`.

---

## Phase C exit gate

1. Admin (test user) can perform at least one meaningful action per concern:
   - Create + edit + soft-delete an official
   - Approve one dossier claim
   - Trigger one intel run and see it reach terminal state
   - Accept one correlation
   - Override one source URL
   - Invite a user and change their role
   - Upload one opinion PDF and see chunks
   - Create one media coverage row
   - Open ops dashboard (all cards render without error)
   - Toggle one feature flag
2. Operator and viewer roles cannot load `/admin/*` (middleware + BFF + RLS all deny).
3. Every mutation produced an `admin_audit_log` row with accurate before/after (E2E test).
4. Backend pytest + frontend Vitest + Playwright + axe + Lighthouse all green.
5. `progress.md` + `task_plan.md` updated.
