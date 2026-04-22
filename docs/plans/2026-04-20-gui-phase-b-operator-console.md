# Phase B — Operator Console (Public-facing Surfaces)

> **For Claude:** REQUIRED SUB-SKILL: `superpowers:executing-plans` or `superpowers:subagent-driven-development`. **Depends on Phase A** (all exit-gate items passing). Tasks B.1–B.3 are sequential foundations; B.4–B.10 may be worked in any order by separate subagents.

**Goal:** Deliver every operator-facing surface with Palantir-grade cross-referencing and strict `design/README.md` compliance: Briefing home, Judicial Watch (Supreme Court first, then appellate + district), Officials hub, full Dossier with 6 tabs, Comparison matrix, Global search, Entity graph, Live feeds, Saved views, Alerts.

**Architecture:** Reads come from `supabase-js` with the Clerk→Supabase JWT (authenticated RLS tranche from U3.5 + new policies below). Search's semantic half calls the BFF (`match_rag_chunks_public` is `service_role` gated). Feeds call the BFF. Operator mutations (bookmarks, saved views) write directly via `supabase-js` + RLS. Intel-run triggers go through the BFF.

**Tech Stack:** inherits Phase A. Adds: `@xyflow/react` for the graph, `@tanstack/react-virtual` for long officials lists, `react-hook-form` for search filter forms.

**Read first:**

- `docs/plans/task_plan.md`, `docs/plans/findings.md`
- `design/README.md` §§ Content Fundamentals, Visual Foundations, Cards, Iconography — internalize voice + No-Line Rule
- `design/ui_kits/operator_console/OperatorConsole.jsx` — **reference only** (do not copy; transcribe patterns)
- `design/preview/*.html` — component studies
- `backend/briefing/api/routes/console.py` — existing BFF endpoints
- `supabase/migrations/20260422103000_authenticated_console_reads.sql` — RLS tranche

---

## Task B.1 — RLS tranche extension for operator surfaces

**Files:**

- Create: `supabase/migrations/<timestamp>_operator_rls.sql`
- Test: `backend/tests/test_rls_operator.py`

**Additions:**

- `officials`: already readable by authenticated (U3.5). Verify + add index on `(jurisdiction_id, office_type, is_current)`.
- `jurisdictions`: authenticated SELECT.
- `dossier_claims`: authenticated SELECT where `pipeline_stage IN ('writer_sonar','human_edit')` AND a `published` flag (add column if missing: `published boolean default false`). `retrieval_sonar` + `critique_sonar` stay internal.
- `entity_edges`: authenticated SELECT where `status = 'accepted'`.
- `rag_chunks`: no direct SELECT; only `match_rag_chunks_public` RPC, already `service_role` only — keep.
- `opinions`, `bills`, `media_coverage` (tables may need creating if Phase 1 didn't): authenticated SELECT where `published = true`.

**Step 1:** Audit which of the above tables exist; create missing ones behind `if not exists`.

**Step 2:** Write migration + RLS policies using `(select auth.uid())` pattern.

**Step 3:** pytest matrix — each table × (service_role, authenticated-admin, authenticated-operator, authenticated-viewer, anon) asserting expected pass/fail.

**Step 4:** Commit: `feat(db): operator RLS tranche for dossier + edges + opinions + bills + media`.

---

## Task B.2 — Shared operator primitives

**Files:**

- Create: `console/src/components/operator/Card.tsx` (house card per design — `--radius-lg`, `--shadow-sm` rest, `--shadow-md` hover, optional 2px gold top border for featured, hover gold left pinstripe animation)
- Create: `console/src/components/operator/SectionHeader.tsx` (Newsreader serif, sentence case)
- Create: `console/src/components/operator/MetaLabel.tsx` (Inter 12px UPPERCASE 0.2em tracked — the dossier metadata label primitive)
- Create: `console/src/components/operator/Portrait.tsx` (grayscale at rest, colorize on hover, 600ms ease; serif-initials fallback)
- Create: `console/src/components/operator/SourceCite.tsx` (chevron-right + url + fetched_at)
- Create: `console/src/components/operator/ClaimRow.tsx` (atomic claim with status dot + source + optional adversarial flag)
- Create: `console/src/components/operator/StatusDot.tsx` (one rounded-full exception per design)
- Create: `console/src/components/operator/KpiTile.tsx` (tabular figures, label-md beneath)
- Create: `console/src/components/operator/EmptyState.tsx` (italic serif copy per design voice)

**Step 1:** Build each component against tokens; no `rounded-full` except StatusDot + Portrait; no 1px solid borders except ghost focus.

**Step 2:** Vitest snapshot test for each.

**Step 3:** Storybook-esque dev route `app/(operator)/_primitives/page.tsx` (gated to non-prod) that renders every primitive with Utah-shaped copy ("Justice Hagen", "HD 32", "vote.utah.gov").

**Step 4:** Commit: `feat(operator): shared editorial primitives`.

---

## Task B.3 — Data access layer for operator screens

**Files:**

- Create: `console/src/lib/queries/officials.ts` (`listSupremeCourt`, `listAppellate`, `listByJurisdiction`, `getBySlug`)
- Create: `console/src/lib/queries/dossier.ts` (`getDossierClaims`, `getAdversarialFlags`, `getTimeline`)
- Create: `console/src/lib/queries/graph.ts` (`getAcceptedEdgesForEntity`)
- Create: `console/src/lib/queries/search.ts` (server action → BFF for semantic, `supabase-js` for lexical `ilike`)
- Create: `console/src/lib/queries/feeds.ts` (server action → BFF `/v1/feeds/{official_id}`)
- Create: `console/src/lib/queries/saved-views.ts` (CRUD against `user_saved_views`)

**Step 1:** Each function typed with generated `types.ts` + Zod parse at boundary.

**Step 2:** Vitest unit tests with an in-process Supabase (`supabase-js` against local), or mock. Prefer against-local for integration signal.

**Step 3:** Commit: `feat(console): operator data-access layer`.

---

## Task B.4 — Briefing home (`/`)

**Files:**

- Modify: `console/src/app/(operator)/page.tsx`
- Create: `console/src/components/operator/briefing/BriefingHero.tsx`
- Create: `console/src/components/operator/briefing/StatsStrip.tsx`
- Create: `console/src/components/operator/briefing/PriorityList.tsx`
- Create: `console/src/components/operator/briefing/LiveExtractionLog.tsx`

**Step 1:** Layout per `design/ui_kits/operator_console` BriefingScreen: hero headline (Newsreader display-lg, sentence case, e.g. "Morning brief — Tuesday, April 21"), KPI strip (counts from `dossier_claims`, `intelligence_runs`, `alerts`), priority list (top 5 officials with open adversarial flags or retention year within 12 months), extraction log tail (last 20 `intelligence_runs` rows).

**Step 2:** Server component fetches; tabular figures for numbers; UTC-local `Mountain Time` timezone per design voice.

**Step 3:** Playwright: sign-in → `/` renders hero + stats + list; axe clean.

**Step 4:** Commit: `feat(console): briefing home`.

---

## Task B.5 — Judicial Watch (`/judicial/`*)

**Files:**

- Create: `console/src/app/(operator)/judicial/page.tsx` — Judicial Watch landing (links to Supreme Court, Court of Appeals, District Courts)
- Create: `console/src/app/(operator)/judicial/supreme-court/page.tsx`
- Create: `console/src/app/(operator)/judicial/court-of-appeals/page.tsx`
- Create: `console/src/app/(operator)/judicial/district/page.tsx` (filter by district)
- Create: `console/src/components/operator/judicial/JusticeCard.tsx` (portrait + name + retention_year countdown + subject_alignment badge + latest-claim teaser)
- Create: `console/src/components/operator/judicial/RetentionCountdown.tsx`

**Step 1:** Supreme Court page queries `listSupremeCourt()`; grid (asymmetric 8/4 per design, not 3-col box grid); retention countdown pulls `retention_year`.

**Step 2:** Click card → `/judicial/[slug]` (B.6 dossier).

**Step 3:** Court of Appeals + District views reuse `JusticeCard` with appropriate `office_type` filters.

**Step 4:** Playwright: load each route, verify card counts against fixture.

**Step 5:** Commit: `feat(console): judicial watch hubs`.

---

## Task B.6 — Full Dossier (`/judicial/[slug]`, `/officials/[slug]`)

**Files:**

- Create: `console/src/app/(operator)/judicial/[slug]/page.tsx`
- Create: `console/src/app/(operator)/officials/[slug]/page.tsx` — shares the dossier layout component
- Create: `console/src/components/operator/dossier/DossierHeader.tsx` (portrait, name, office_type, jurisdiction, retention / next election, subject_alignment, share/export menu)
- Create: `console/src/components/operator/dossier/DossierTabs.tsx`
- Create: `console/src/components/operator/dossier/tabs/Overview.tsx`
- Create: `console/src/components/operator/dossier/tabs/Claims.tsx` (virtualized; group by category; source citations; adversarial flag icon when `requires_human_review`)
- Create: `console/src/components/operator/dossier/tabs/Adversarial.tsx` (groundedness score, claim vs critique vs synthesis split view)
- Create: `console/src/components/operator/dossier/tabs/Graph.tsx` (embeds B.7's EntityGraph scoped to this entity_id, accepted edges only)
- Create: `console/src/components/operator/dossier/tabs/Feed.tsx` (server component → BFF `/v1/feeds/{official_id}`)
- Create: `console/src/components/operator/dossier/tabs/Timeline.tsx` (chronological events: filings, opinions, media coverage, intel runs)

**Step 1:** Layout: full-width hero (navy → navy-container 135° gradient per design), max-w-5xl body under, no three-column box grid.

**Step 2:** Tabs: gold underline for active, UPPERCASE tracked labels, Lucide icons 20px.

**Step 3:** Each tab loads its data on activation (`loading.tsx` skeleton — editorial, italic serif "Loading claims…").

**Step 4:** 404 when slug unknown.

**Step 5:** Playwright: open Hagen dossier, click each tab, verify content.

**Step 6:** Commit: `feat(console): full dossier with 6 tabs`.

---

## Task B.7 — Entity Graph (React Flow)

**Files:**

- Create: `console/src/components/operator/graph/EntityGraph.tsx`
- Create: `console/src/components/operator/graph/nodeTypes.tsx` (custom nodes per entity type — judge, bill, opinion, issue, org)
- Create: `console/src/components/operator/graph/edgeTypes.tsx` (strength encoded as stroke width; gold for strong links per design)
- Create: `console/src/app/(operator)/graph/page.tsx` — standalone graph view seeded by search

**Step 1:** Lazy-import `@xyflow/react` (client-only, dynamic import) so it doesn't bloat the dossier bundle.

**Step 2:** Navy background; cream nodes; gold edges for confidence > 0.8; charcoal edges otherwise. No emoji, no colored node fills.

**Step 3:** Breadth-first expansion: start from an entity, fetch direct edges, progressively expand on click.

**Step 4:** `prefers-reduced-motion`: disable spring layout; use fixed dagre layout.

**Step 5:** Playwright: load dossier Graph tab; assert N nodes after default expand.

**Step 6:** Commit: `feat(console): entity graph (React Flow) with design-system styling`.

---

## Task B.8 — Officials Hub (`/officials`)

**Files:**

- Create: `console/src/app/(operator)/officials/page.tsx`
- Create: `console/src/components/operator/officials/OfficialsFilters.tsx` (jurisdiction ladder, office_type, party, subject_alignment, is_current)
- Create: `console/src/components/operator/officials/OfficialsTable.tsx` (virtualized; row hover = left gold pinstripe per design)

**Step 1:** URL-synced filters (search params). Asymmetric layout (filters left 4/12, results 8/12).

**Step 2:** Row click → dossier.

**Step 3:** "Save this view" button → writes to `user_saved_views`.

**Step 4:** Commit: `feat(console): officials hub with filters + saved views`.

---

## Task B.9 — Comparison Matrix (`/compare`)

**Files:**

- Create: `console/src/app/(operator)/compare/page.tsx`
- Create: `console/src/components/operator/compare/ComparePicker.tsx` (Command palette to pick 2–4 officials)
- Create: `console/src/components/operator/compare/CompareMatrix.tsx` (asymmetric 1/4 + 3×1/4 grid per design ComparisonScreen)

**Step 1:** Side-by-side dossier summaries + shared-edge highlight (gold pinstripe when both subjects share a graph edge).

**Step 2:** Print stylesheet (operators export to PDF): tabular figures, Newsreader headlines, gold rules.

**Step 3:** Commit: `feat(console): comparison matrix`.

---

## Task B.10 — Global Search (`/search`)

**Files:**

- Create: `console/src/app/(operator)/search/page.tsx`
- Create: `console/src/lib/search/lexical.ts` (Supabase full-text across `officials.full_name`, `bills.title`, `opinions.title`, `media_coverage.headline`)
- Create: `console/src/lib/search/semantic.ts` (server action → BFF `POST /v1/search/semantic` wrapping `match_rag_chunks_public`)
- Create: `backend/briefing/api/routes/search.py` — `POST /v1/search/semantic` (embed query via `EMBEDDING_MODEL_ID`, call RPC, return top-k with source)
- Create: `backend/tests/test_api_search.py`

**Step 1:** Unified results list grouped by kind; feature-flag `search.semantic` (off when no Perplexity key).

**Step 2:** Command-palette style (Cmd-K) reachable anywhere in the shell; opens modal search.

**Step 3:** Playwright + axe + backend pytest.

**Step 4:** Commit: `feat(console,api): global search (lexical + semantic)`.

---

## Task B.11 — Feeds (X + Perplexity) — BFF + Dossier tab

**Files:**

- Create: `backend/briefing/services/feeds/feed_service.py` — `FeedService` with `XSource`, `PerplexityNewsSource`, deterministic order (latest first), dedupe by URL/post_id
- Create: `backend/briefing/api/routes/feeds.py` — `GET /v1/feeds/{official_id}`
- Create: `backend/tests/test_feed_service.py` (respx mocks; no live calls)
- Wire: `Feed` dossier tab (B.6) to consume

**Step 1:** X source behind `X_API_BEARER_TOKEN`; falls back to Perplexity news when unset.

**Step 2:** Cache feed results per official for 10 min (settings key `feed.cache_seconds`).

**Step 3:** Commit: `feat(api): feed service + dossier feed tab`.

---

## Task B.12 — Saved Views + Alerts + Notifications

**Files:**

- Create: `console/src/app/(operator)/saved/page.tsx` (list personal saved views + bookmarked dossiers)
- Create: `console/src/components/operator/alerts/AlertsBell.tsx` (top-bar bell; unread count; dropdown list from `alerts` table)
- Create: `console/src/app/(operator)/alerts/page.tsx` (full history)
- Create: `backend/briefing/services/alerts/dispatcher.py` — called by workers when new filings/opinions/adversarial flags land; inserts into `alerts`
- Modify: `backend/briefing/worker/__main__.py` — hook dispatcher into existing jobs

**Step 1:** In-app only for v1 (email deferred — see `findings.md §9`).

**Step 2:** Mark-as-read mutation (operator-writable via RLS).

**Step 3:** Commit: `feat(console,worker): alerts + saved views end-to-end`.

---

## Task B.13 — Accessibility + performance sweep

**Files:**

- Modify: every top-level route — add skip-link, landmarks, focus management on tab change
- Modify: `gui-ci.yml` — tighten axe/Lighthouse budgets from Phase A.7

**Step 1:** Run axe against every operator route; fix 0-violation gate.

**Step 2:** Lighthouse on `/`, `/judicial/supreme-court`, one dossier, `/search`, `/compare`, `/graph` — all meet `findings.md §8` budgets.

**Step 3:** `prefers-reduced-motion` visual pass (disable staggered reveal, pinstripe animation).

**Step 4:** Commit: `chore(console): a11y + performance sweep`.

---

## Task B.14 — Docs + progress

**Files:**

- Modify: `docs/plans/progress.md` — Phase B entry
- Modify: `docs/plans/task_plan.md` — Phase B status → complete
- Modify: `CLAUDE.md` § Frontend — note shipped surfaces

**Step 1:** Commit: `docs: Phase B operator console complete`.

---

## Phase B exit gate

1. Every operator route renders without a console error; axe 0 violations; Lighthouse budgets met.
2. Sign-in as operator → can load Briefing, Judicial Watch, dossier, compare, search, graph; cannot load `/admin/`*.
3. Sign-in as viewer → same except no "Save view" / "Bookmark" affordances (hidden by `<RoleGate>`), and DB rejects writes if forced (RLS).
4. Backend pytest green. Frontend Vitest + Playwright green.
5. `progress.md` + `task_plan.md` updated.