# Step 3 + Phase 3 Cohesive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use **superpowers:executing-plans** to implement this plan task-by-task (or **subagent-driven-development** for same-session execution with per-task review).

**Goal:** Close `**plans/00_task_plan.md` § Step 3** (autonomous researcher: staged retrieval → dossier writing, routing, RLS-safe RAG consumption from the console) and deliver `**docs/plans/01_expanded_silent_briefing_platform_plan.md` § Phase 3** (Next.js operator console with Clerk, design system, Judicial Watch flagship, dossier depth, search, graph, feeds)—in an order that does not fight migrations, existing workers, or Directus.

**Architecture:** **Step 3** extends the **existing** FastAPI + worker stack (`adversarial_pipeline`, `correlation`, `opinion-ingestion`, `match_rag_chunks_public`) with explicit **Stage 1 A/B/C retrieval** artifacts, **orchestrated triggers**, and **authenticated** Supabase access patterns the console will use. **Phase 3** is a **new** Next.js 15 app (Bun toolchain per `CLAUDE.md`) consuming **read-only** Supabase queries and/or thin **FastAPI** BFF routes—never embedding **service_role** keys in the browser. Cohesion = **stable JSON shapes** for evidence bundles and dossier sections + **RLS** that matches product (public judicial roster vs internal claims).

**Tech Stack:** `uv` + FastAPI + `pytest` + **Respx**; Supabase JS (`@supabase/ssr` or `supabase-js`) with **Clerk → Supabase** JWT bridge when RLS uses `authenticated`; **Bun** + Next.js 15 App Router + **Clerk** + Tailwind + `design/colors_and_type.css`; Perplexity Sonar only (`LLMService` already in `backend/briefing/services/llm/`).

**Read first (zero context):** `CLAUDE.md`, `plans/00_task_plan.md` § Step 3, `docs/plans/01_expanded_silent_briefing_platform_plan.md` § Phase 3, `docs/plans/04_foundation_supabase_directus.md`, `design/README.md`, `.cursor/rules/design-system.mdc`, `plans/03_progress.md`, `docs/plans/2026-04-21-step-2-phase-2-cohesive-implementation.md` (Appendix B RPC roles).

---

## Cohesion: execution order (read this once)

```text
1. Step 3A — Contracts: Pydantic models + golden JSON fixtures for Stage 1 evidence bundle and Stage 2 dossier sections (no DB change unless required).
2. Step 3B — Retrieval worker: prompts A/B/C (bio / record / vetting) → validated JSON → `dossier_claims` (`pipeline_stage=retrieval_sonar`) + optional `entity_edges` via existing `correlation` helpers.
3. Step 3C — Writer worker: consume Stage 1 bundle + optional `match_rag_chunks_public` (server-side only) → `writer_sonar` claims or narrative table (reuse or extend `adversarial_pipeline`—avoid two writers).
4. Step 3D — Auth + RLS tranche: Supabase policies for `authenticated` read paths the console needs (narrow); Clerk JWT template; document **no** `service_role` in Next.js.
5. Phase 3.1 — Scaffold Next.js + Clerk + design CSS; health check page.
6. Phase 3.2–3.4 — Judicial page, dossier page, search (depends on 3D for real data or mock flags).
7. Phase 3.5–3.6 — Graph UI + Feed tab (FeedService backend stub already specified in expanded plan).
8. Cross-cut — pytest, `dev-db-migrate`, Security Advisor triage notes for `directus_`* vs app tables (see Step 2 plan Appendix A).
```

**Dependency rules**


| If you change…                                          | Then also…                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `dossier_claims` / `intelligence_runs` columns or enums | Update Directus `register-app-collections.*` field PATCHes + `cms/schema/snapshot-baseline.yaml` collection meta |
| `match_rag_chunks_public` signature                     | Update callers + Step 2 Appendix B matrix                                                                        |
| RLS policies for `authenticated`                        | Add Clerk JWT mapping doc + E2E test with test user                                                              |
| New Next.js env vars                                    | Document in `CLAUDE.md` + root `README.md`                                                                       |


---

## Inventory — what Step 3 already has vs gap


| Capability                       | Already in repo                                             | Gap vs `00_task_plan` Step 3                                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM abstraction                  | `backend/briefing/services/llm/`                            | None                                                                                                                                                                                    |
| Adversarial multi-stage pipeline | `adversarial_pipeline.py` + worker                          | Step 3 asks for explicit **A/B/C retrieval** passes and **routing** (GOP vs opposition)—not necessarily separate from adversarial “retrieve” stage—**clarify product** (see Questions). |
| Correlation / graph              | `correlation.py`, workers                                   | Wire retrieval output → structured entity hooks consistently                                                                                                                            |
| RAG + ANN                        | `rag_chunks`, `match_rag_chunks`, `match_rag_chunks_public` | Console must call RPC **only** with server-side secrets or `authenticated` wrapper                                                                                                      |
| Persistence                      | `dossier_claims`, `intelligence_runs`                       | Ensure `pipeline_stage` values align with enums + writer stages                                                                                                                         |
| Orchestration                    | `schedule_catalog.py`, worker subcommands                   | “New or stale” triggers for officials—**define staleness** (see Questions)                                                                                                              |


---

# Part A — Step 3: Autonomous researcher (backend-heavy)

### Task U3.1: Evidence bundle schema + fixtures

**Files:**

- Create: `backend/briefing/services/intelligence/evidence_bundle.py` (Pydantic models; ~120 LOC)
- Create: `backend/briefing/services/intelligence/__init__.py`
- Create: `backend/tests/fixtures/evidence_bundle_golden.json`
- Test: `backend/tests/test_evidence_bundle.py`

**Step 1:** Define `EvidenceBundle`, `Citation`, `AtomicClaim` (or equivalent) matching what Stage 2 and critique prompts need.

**Step 2:** Run `uv run pytest backend/tests/test_evidence_bundle.py -q` — expect PASS after implementation.

**Step 3:** Commit `feat(intelligence): evidence bundle schema for Step 3`.

---

### Task U3.2: Stage 1 retrieval — prompts A / B / C

**Files:**

- Create: `backend/briefing/services/intelligence/retrieval_stages.py` (~180 LOC)
- Modify: `backend/briefing/worker/__main__.py` — subcommand e.g. `retrieval-pass`
- Modify: `backend/briefing/config.py` — optional `RETRIEVAL_MODEL_*` overrides
- Test: `backend/tests/test_retrieval_stages.py` (Respx mock Sonar; validate JSON + DB insert mocked)

**Step 1:** Implement three functions or one parameterized pass: **A bio**, **B record**, **C vetting** (opposition-heavy tone for C per `00_task_plan`). Each returns validated `EvidenceBundle`.

**Step 2:** Persist claims with `pipeline_stage='retrieval_sonar'` and `category` / `metadata.stage` distinguishing A/B/C.

**Step 3:** Optional: call `run_correlation_pass` on concatenated text (feature flag `--correlate`).

**Step 4:** Commit `feat(intelligence): Stage 1 A/B/C retrieval worker`.

---

### Task U3.3: Stage 2 dossier writer from evidence bundle

**Status (2026-04-19):** U3.1–U3.3 implemented in backend (`intelligence/` package, workers `retrieval-pass` / `dossier-write`); see `docs/plans/03_progress.md` session log.

**Files:**

- Modify: `backend/briefing/services/llm/adversarial_pipeline.py` **or** new `backend/briefing/services/intelligence/dossier_writer.py` if cleaner (YAGNI: extend existing if <80 LOC delta)
- Modify: worker — subcommand `dossier-write` or extend `adversarial-dossier` with `--from-retrieval-id`
- Test: `backend/tests/test_dossier_writer.py`

**Step 1:** Input = **latest retrieval claims** for an `official_id` + optional `match_rag_chunks` top-k (server-side `service_role` **or** migration to `authenticated` RPC only after U3.5).

**Step 2:** Output = `writer_sonar` claims (or single narrative row—pick one; **prefer claims** for traceability).

**Step 3:** Commit `feat(intelligence): Stage 2 writer from evidence bundle`.

---

### Task U3.4: Routing + staleness (GOP vs opposition)

**Files:**

- Modify: `backend/briefing/config.py` — `SubjectRouting` or env flags
- Modify: `officials` usage — document `subject_alignment` drives which prompts run
- Test: `backend/tests/test_routing.py`

**Step 1:** Encode: GOP → A + lighter C; opposition → full A/B/C (exact rules in config, not hard-coded in prompts).

**Step 2:** Define **staleness**: e.g. no `retrieval_sonar` claim in 30 days, or `officials.updated_at` — document in `plans/03_progress.md`.

**Step 3:** Commit `feat(intelligence): routing and staleness gates`.

---

### Task U3.5: RLS + Clerk JWT for console reads (narrow tranche)

**Files:**

- Create: `supabase/migrations/<timestamp>_authenticated_console_read.sql`
- Modify: `docs/plans/04_foundation_supabase_directus.md` — Clerk + Supabase section
- Modify: `CLAUDE.md` — env vars for Next.js

**Step 1:** List **exact** SELECT policies needed for Phase 3 UI (e.g. `officials` current, `jurisdictions`, `dossier_claims` by category, `entity_edges` accepted only—**align with product**).

**Step 2:** Use `(select auth.uid())` pattern; grant `EXECUTE` on `match_rag_chunks_public` to `authenticated` **only if** console calls it with user JWT (otherwise keep service_role on FastAPI only).

**Step 3:** Document Clerk **Supabase JWT template** (official Clerk docs)—out of scope to paste secrets.

**Step 4:** Commit `feat(db): authenticated RLS tranche for operator console`.

---

### Task U3.6: FastAPI BFF routes (optional but recommended)

**Files:**

- Create: `backend/briefing/api/routes/console.py` (or extend existing routes)
- Test: `backend/tests/test_api_console.py`

**Step 1:** Thin routes: `GET /v1/console/officials/{slug}`, `GET /v1/console/judicial/supreme-court` aggregating joins the UI needs—**if** complex joins are painful in browser. Otherwise use Supabase-js directly.

**Step 2:** All secrets stay server-side.

**Step 3:** Commit `feat(api): BFF endpoints for operator console`.

---

# Part B — Phase 3: Operator console (Next.js)

> **Scaffold path:** Expanded plan uses `console/` at repo root. If you prefer `apps/web`, change in Task P3.1 only and update all imports/paths consistently.

### Task P3.1: Scaffold Next.js 15 + Clerk + design system

**Files:**

- Create: `console/` via `bunx create-next-app@latest` (TypeScript, Tailwind, App Router, `src/`)
- Modify: `console/src/app/globals.css` — import or paste tokens from `design/colors_and_type.css`
- Create: `console/src/middleware.ts` — Clerk protect `/judicial`, `/officials`, `/dossier`, `/search`
- Modify: root `README.md` — how to run `bun dev` in `console/`
- Test: manual — sign-in page + protected route returns 401/redirect when signed out

**Step 1:** `cd` repo root; run create-next-app into `console/`.

**Step 2:** `bun add @clerk/nextjs lucide-react @supabase/supabase-js` (and `@supabase/ssr` if using cookie pattern).

**Step 3:** Commit `feat(console): scaffold Next.js with Clerk and design tokens`.

---

### Task P3.2: Supreme Court Judicial Watch page

**Files:**

- Create: `console/src/app/judicial/supreme-court/page.tsx`
- Create: `console/src/components/judicial/JusticeCard.tsx` (design-system compliant)
- Data: server component fetching officials (`office_type=state_supreme_justice`, `jurisdiction` UT) via Supabase or BFF

**Step 1:** Layout per `01_expanded` § 3.2 (hero, grid, correlations summary placeholder).

**Step 2:** Commit `feat(console): judicial watch supreme court page`.

---

### Task P3.3: Dossier dynamic route

**Files:**

- Create: `console/src/app/judicial/[slug]/page.tsx`
- Create: `console/src/components/dossier/*` — tabs: Overview, Claims, Graph placeholder, Feed placeholder

**Step 1:** Load official by slug; 404 when missing.

**Step 2:** Commit `feat(console): dossier page shell`.

---

### Task P3.4: Global search

**Files:**

- Create: `console/src/app/search/page.tsx`
- Create: `console/src/lib/search.ts` — combine `ilike` on names + optional semantic search via **server action** calling FastAPI or Supabase RPC

**Step 1:** Feature-flag semantic half if embeddings key not present.

**Step 2:** Commit `feat(console): global search v1`.

---

### Task P3.5: Entity graph visualization

**Files:**

- Create: `console/src/components/graph/EntityGraph.tsx`
- Add: `bun add @xyflow/react` (or D3—pick one in implementation; React Flow preferred in expanded plan)

**Step 1:** Query `entity_edges` for `official.entity_id` (accepted only for anon/authenticated as policies allow).

**Step 2:** Commit `feat(console): entity graph view`.

---

### Task P3.6: Feed service + tab

**Files:**

- Create: `backend/briefing/services/feeds/feed_service.py`
- Create: `backend/tests/test_feed_service.py`
- Modify: `console` dossier tab — call FastAPI `GET /v1/feeds/{official_id}` (define in U3.6 or new route)

**Step 1:** Mock X; real Perplexity optional behind env.

**Step 2:** Commit `feat: feed service and dossier feed tab`.

---

## Cross-cutting verification

**Step 1:** `cd backend && uv run pytest tests/ -q` — all pass.

**Step 2:** `.\scripts\dev-db-migrate.ps1` — migrations apply.

**Step 3:** `cd console && bun run build` — typecheck + build succeeds.

**Step 4:** Document manual: Clerk sign-in, load `/judicial/supreme-court`, open one dossier.

**Step 5:** Update `plans/03_progress.md` with Step 3 + Phase 3 tranche summary.

---

## Open questions (need your answers before execution)

1. **Retrieval vs adversarial:** Should **Stage 1** be the **existing** `retrieve_evidence` step inside `adversarial_pipeline.py` (expanded to A/B/C internally), or **three separate Sonar calls** always persisted as distinct claim groups? (Affects cost and DB row volume.)
2. **Staleness:** What triggers a full re-run? Time-based only, manual Directus button only, or both?
3. **Console data path:** Prefer **Supabase-js from Next.js** with Clerk JWT, **FastAPI BFF only**, or **hybrid** (reads Supabase, heavy joins BFF)?
4. **Public vs authenticated:** Should **any** dossier content be visible **without** Clerk (public judicial transparency), or **100% authenticated** for v1?
5. **Monorepo layout:** Confirm `**console/`** at repo root vs `apps/web` for Turborepo-style scaling.
6. **Phase alignment:** `01_expanded` still lists **Phase 2 task 2.4** as pending in one section—repo has P2.4 done; OK to mark expanded plan stale until editorial pass?

---

**Plan complete and saved to** `docs/plans/2026-04-21-step-3-phase-3-cohesive-implementation.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — fresh subagent per task; spec review then quality review between tasks; use **subagent-driven-development**.
2. **Parallel session** — open a new session in a git worktree; use **executing-plans** with human checkpoints between batches.

**Which approach do you want?**