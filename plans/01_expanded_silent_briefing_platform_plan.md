# Expanded Silent Briefing Platform Plan: Judicial Watch, Dossiers, CMS & Palantir-for-Utah Intelligence Hub

> **This plan fleshes out and expands `@plans/00_task_plan.md` (Phase 1 Backend).** It incorporates the design system from `@design/`, judicial watch for Utah Supreme Court, always-on dossiers (candidates in election years; elected officials/judges in all years, including non-Republicans), cross-referenced entity graph, official jurisdiction hierarchy, CMS for easy data management, adversarial AI report architecture, X + Perplexity feeds, and a premium operator console UI.
>
> **For Claude:** Read `CLAUDE.md` first, always. Planning files in `plans/` — re-read before major decisions. Use `uv` for Python, `bun` for JS (only exception: `npx create-directus-extension@latest`). Follow `.cursor/rules/` for language/design/DB standards. DRY, SRP, YAGNI. ~200 LOC per file. Nothing manually created that can be scaffolded. Think Palantir — always. Reference `plans/02_findings.md` (research), `plans/03_progress.md` (session log), `plans/04_foundation_supabase_directus.md` (foundation setup).
>
> **Goal:** Build a comprehensive, self-serve Palantir-for-Utah intelligence platform. Judicial watch (Supreme Court first), evidence-based dossiers with adversarial AI analysis, official/judge hierarchy (federal→state→county→city), entity graph for deep cross-references (judge → opinions → bills → issues → media → posts), CMS admin in Directus for non-technical users, and a premium operator console matching the `@design/` editorial aesthetic. Perplexity is the primary AI provider. Everything cross-referenced, intelligently reported.
>
> **Architecture Overview:**
>
> - **Schema:** `jurisdictions` (hierarchy) + `officials` (all elected/judges/candidates by type) + existing `entities/entity_edges/dossier_claims/rag_chunks` graph.
> - **Backend (extend Phase 1):** FastAPI + ARQ. New extraction jobs for utcourts.gov (opinions, bios), Ballotpedia (retention data), vote.utah.gov (filing sync). Two-stage + adversarial LLM pipeline via Perplexity. Abstracted `LLMService` protocol.
> - **CMS:** Directus (self-hosted Docker) on same Supabase Postgres. Flows trigger LLM refresh on edit. Custom extensions themed to `@design/`. Enables non-dev management of officials, dossiers, claims.
> - **Frontend:** Next.js + React (start fresh from design system, not copied from OperatorConsole kit which is reference only). Clerk auth. Supreme Court page as Palantir flagship, dossier pages `/[jurisdiction]/[slug]`, global cross-ref search, graph viz.
> - **AI:** Perplexity everything. `LLMService` abstraction for easy swap. Adversarial critique pattern on final reports. X API + Perplexity for feeds.
>
> **Tech Stack:** Supabase (Postgres, pgvector, RLS), FastAPI + ARQ (Python, `uv`), Perplexity Sonar/Agent (primary AI + adversarial via Agent API), Directus (CMS, Docker, `bunx create-directus-project`), Next.js + React + TypeScript (`bun`), Clerk (auth), Lucide icons, design system CSS vars. Docker Compose for local orchestration.
>
> **References:** `CLAUDE.md`, `plans/00_task_plan.md`, `plans/02_findings.md`, `plans/03_progress.md`, `plans/04_foundation_supabase_directus.md`, `@design/README.md`, `.cursor/rules/`.

---

## Confirmed Decisions (from user Q&A)


| Question                   | Answer                                                                                  | Decision                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMS choice                 | Directus — user agreed, will learn                                                      | **Directus** self-hosted via Docker on existing Supabase Postgres                                                                                    |
| Frontend                   | Start fresh; OperatorConsole kit is reference only                                      | **New Next.js app** from scratch using design system CSS/assets                                                                                      |
| Auth                       | Clerk                                                                                   | **Clerk** for all operator console routes                                                                                                            |
| AI provider                | Perplexity for everything; make it easy to swap later                                   | **Perplexity** as primary; abstracted `LLMService` protocol                                                                                          |
| Adversarial AI             | Different pedigree; Claude analysis + Grok adversarial, they debate before human review | **Adversarial pipeline:** Primary (Claude class via Agent API) → Adversarial (Grok class via Agent API) → Synthesis → Human review queue in Directus |
| Feeds                      | X + Perplexity                                                                          | **X API v2** when available + **Perplexity Sonar** for news aggregation; `FeedService` abstraction                                                   |
| Initial focus              | Supreme Court flagship, Palantir thinking                                               | **Utah Supreme Court** Judicial Watch page as MVP Palantir demonstration                                                                             |
| Schema                     | Support hierarchies preemptively                                                        | `jurisdiction_level` enum + `office_type` enum + `jurisdictions` (parent hierarchy) + `officials` table                                              |
| Tooling                    | `bun` not node; `uv` not pip                                                            | `bun` everywhere JS/TS; `uv` everywhere Python; `npx` ONLY for Directus extension scaffold                                                           |
| Hosting                    | Self-hosted for development                                                             | Docker Compose: Supabase local + Directus + backend + console                                                                                        |
| Cheaper AI for correlation | Use cheaper models for bulk edge extraction                                             | `CORRELATION_MODEL=sonar` (cheap); `WRITER_MODEL=claude-sonnet-4-5`; `ADVERSARIAL_MODEL=grok-4`                                                      |


---

## Current Status

- **Foundation (Phase 0):** COMPLETE — see `plans/04_foundation_supabase_directus.md` for Supabase migrations, Directus Docker, hook extension, API stub.
- **Backend Phase 1 (from `plans/00_task_plan.md`):** Steps 0-1 complete (FastAPI skeleton, candidate ETL). Step 2 (entities/claims/vectors) in progress. Running on local FastAPI.
- **Schema:** `races`, `candidates`, minimal `entities`, `jurisdictions`, `officials` live. `entity_edges`/`dossier_claims`/`rag_chunks`/`intelligence_runs` pending (Phase 1).

---

## Phases

### Phase 0: Foundation Setup (Prerequisite)

> **See `plans/04_foundation_supabase_directus.md` for full task breakdown.**

- [x] Task 1: `supabase init` + `supabase start`. Keys to `.env.local`.
- [x] Task 2: Apply existing races/candidates migration to fresh local instance.
- [x] Task 3: `jurisdiction_officials` migration — enums, `jurisdictions`, `officials`, RLS, seed.
- [x] Task 4: `directus_role_grants` migration — isolated `directus` schema, minimal Postgres role.
- [x] Task 5: Directus Docker Compose — connected to Supabase local Postgres.
- [x] Task 6: Directus collections config for officials/jurisdictions/entities/claims.
- [x] Task 7: Directus extension — LLM refresh flow trigger on official save.
- [x] Task 8: Backend stub endpoint for Directus webhook (`POST /v1/intelligence/refresh`).
- **Status:** complete
- **Blocks all other phases.**

### Phase 1: Backend — Schema Completion + Judicial Extraction

**Objective:** Complete Step 2 of `plans/00_task_plan.md` (entities/claims/vectors/graph) and extend for judicial extraction. Officials with type `state_supreme_justice` have opinions extracted, chunked, and embedded. Retention election data pulled from Ballotpedia. Two-stage + adversarial LLM pipeline wired.

**Bite-sized Tasks:**

**1.1 — Complete Step 2 schema (from 00_task_plan.md)**

- Migration: `entities`, `entity_edges`, `dossier_claims`, `rag_chunks`, `intelligence_runs` tables.
- Command: `supabase migration new entities_claims_vectors_graph`
- Test: Insert a test entity + edge in Studio. Verify pgvector column.
- Commit: `git commit -m "feat: entities, claims, vectors, intelligence_runs schema"`

**1.2 — Link officials to entities + claims**

- Migration: Add `official_id uuid REFERENCES officials(id)` to `dossier_claims` (complement existing `candidate_id`). Add `officials` as `entity` nodes automatically (trigger or service).
- Command: `supabase migration new link_officials_to_claims`
- Test: Create official, verify entity node auto-created.
- Commit: `git commit -m "feat: link officials to entities graph and dossier_claims"`

**1.3 — Judicial extraction worker job**

- New service: `backend/briefing/services/extraction/judicial.py` (~150 LOC)
- Sources: `utcourts.gov/courts/sup/` — scrape justices list (Playwright), biography pages (httpx + BeautifulSoup), opinions index.
- Output: Upsert to `officials` (jurisdiction=`ut`, office_type=`state_supreme_justice`).
- Command: `uv run python -m briefing.worker judicial-extraction --persist`
- Test golden set: Diana Hagen, Jill Pohlman — verify full_name, retention_year, slug.
- Commit: `git commit -m "feat: judicial extraction worker for utah supreme court justices"`

**1.4 — Ballotpedia retention data extraction**

- New service: `backend/briefing/services/extraction/retention.py` (~100 LOC)
- Scrape Ballotpedia retention election history for justices. Persist as `dossier_claims` with `category='Retention Voting'`.
- Test: Hagen + Pohlman retention history present in claims.
- Commit: `git commit -m "feat: ballotpedia retention vote history extraction"`

**1.5 — Opinion chunking + embedding**

- Service: `backend/briefing/services/extraction/opinions.py` (~150 LOC)
- Scrape opinion text from utcourts.gov, chunk to ~512-1024 tokens, embed via Perplexity embeddings endpoint, upsert to `rag_chunks`.
- Test: 3 opinions chunked, embeddings present in `rag_chunks`, pgvector ANN query returns relevant chunk.
- Commit: `git commit -m "feat: opinion chunking and embedding into rag_chunks"`

**1.6 — LLM service abstraction**

- Create: `backend/briefing/services/llm/base.py` — `LLMService` Protocol (~50 LOC)
- Create: `backend/briefing/services/llm/perplexity.py` — `PerplexityLLMService` implementing Protocol (~120 LOC)
- Config: `WRITER_MODEL`, `ADVERSARIAL_MODEL`, `CORRELATION_MODEL` from `pydantic-settings`.
- Test: Unit test `PerplexityLLMService.retrieve()` with mocked HTTP (respx). Verify JSON schema output.
- Commit: `git commit -m "feat: LLMService abstraction with Perplexity implementation"`

**1.7 — Adversarial dossier pipeline**

- Service: `backend/briefing/services/llm/adversarial_pipeline.py` (~180 LOC)
- Flow:
  1. `retrieve()` — Sonar for grounded evidence bundle (Stage 1)
  2. `generate()` — WRITER_MODEL via Agent API → primary dossier draft
  3. `critique()` — ADVERSARIAL_MODEL (Grok class) via Agent API → structured critique JSON
  4. `synthesize()` — Reconcile primary + adversarial; compute `groundedness_score`; flag conflicts
  5. Persist: all 4 outputs to `intelligence_runs`. Flagged items surface in human review queue.
- Test: Golden set of 1 justice (mock Perplexity responses). Verify all 4 pipeline stages produce non-empty structured output with `groundedness_score >= 0.7`.
- Commit: `git commit -m "feat: adversarial dossier pipeline (primary + critique + synthesis)"`

**1.8 — Correlation engine (cheap model, bulk)**

- Service: `backend/briefing/services/llm/correlation.py` (~120 LOC)
- On new opinion/claim ingestion: call `CORRELATION_MODEL=sonar` to extract entity mentions and propose `entity_edges` (e.g., opinion → bill, opinion → issue, official → official).
- Confidence threshold: only auto-insert edges above 0.8. Below threshold → stage for human review in Directus.
- Test: Feed known opinion text; verify proposed edges match known citations in opinion.
- Commit: `git commit -m "feat: correlation engine proposes entity edges from opinions/claims"`

**1.9 — Schedule orchestration**

- Update ARQ worker to schedule: judicial extraction (weekly), opinion refresh (daily for recent), correlation pass on new claims.
- Test: `uv run python -m briefing.worker --dry-run` shows scheduled jobs.
- Commit: `git commit -m "feat: schedule judicial extraction and correlation jobs"`
- **Status:** pending
- **Files:** `backend/briefing/services/extraction/judicial.py`, `retention.py`, `opinions.py`; `backend/briefing/services/llm/base.py`, `perplexity.py`, `adversarial_pipeline.py`, `correlation.py`; new migrations.

### Phase 2: Directus CMS — Judicial Dossier Management

**Objective:** Enable non-technical users to browse all officials/judges, manually edit dossier claims, create/replace a judge "page" (slug, bio, photo), trigger LLM refresh, and review adversarial-flagged items. All in Directus admin themed to `@design/` Silent Briefing aesthetic.

**Bite-sized Tasks:**

**2.1 — Custom Directus theme extension**

- Scaffold: `npx create-directus-extension@latest` (type: `theme`, name: `silent-briefing-theme`)
- Implement: Override Directus CSS variables using `design/colors_and_type.css` tokens. Navy sidebar, cream content area, gold active states, Newsreader for display, Inter for UI, no border dividers (tonal layering), Lucide icons.
- Test: Screenshot Directus admin. Compare to `design/preview/` files. Gold active tab, cream background, navy sidebar.
- Commit: `git commit -m "feat: directus silent briefing theme extension"`

**2.2 — Official "page" management**

- Directus collection `officials`: configure Create/Edit form with: `full_name`, `slug` (auto-generated from name, editable), `office_type` (select), `jurisdiction_id` (relation), `retention_year`, `photo_url`, `bio_summary` (rich text), `is_current`, `metadata`.
- Interface: Add "Trigger LLM Refresh" button as custom panel (extension, ~60 LOC) that POST to backend `/v1/intelligence/refresh`.
- Test: Create "Justice Test User" in Directus. Verify row in `officials` DB table. Verify refresh webhook fires.
- Commit: `git commit -m "feat: directus official page management with llm refresh button"`

**2.3 — Dossier claims management**

- `dossier_claims` collection in Directus: inline edit claim text, source_url, category (dropdown enum), pipeline_stage label (read-only for LLM, editable for `human_edit`), sentiment, groundedness_score (read-only).
- Human review queue: Directus Dashboard — filter `intelligence_runs` where `requires_human_review = true`. Show primary claim, adversarial challenge, resolution status. Operator approves/rejects/edits.
- Test: Create a test claim via Directus. Verify in DB. Update claim, verify `updated_at` changes.
- Commit: `git commit -m "feat: dossier claims management and human review queue in directus"`

**2.4 — Jurisdiction hierarchy browser**

- `jurisdictions` collection: tree view (parent_id), display `name (level)`. Add "New City" flow: creates jurisdiction + links to parent county.
- Test: Expand "Salt Lake County" node; see "Salt Lake City" child. Add "West Jordan" under SLCO.
- Commit: `git commit -m "feat: jurisdiction hierarchy tree view in directus"`
- **Status:** pending

### Phase 3: Operator Console — Next.js Frontend

**Objective:** Build the premium React/Next.js operator console from scratch using `@design/` (start fresh, OperatorConsole.jsx is reference only). Clerk auth. Supreme Court Judicial Watch as the flagship Palantir page. Dossier pages, global search.

**Bite-sized Tasks:**

**3.1 — Scaffold Next.js app with design system**

- Command: `bunx create-next-app@latest console --typescript --tailwind --app --src-dir`
- Install design dependencies: `bun add @clerk/nextjs lucide-react`
- Add design CSS: Copy `design/colors_and_type.css` to `console/src/app/globals.css` (or import it). Configure font loading for Newsreader + Inter.
- Configure Clerk: `middleware.ts` protecting `/judicial`, `/officials`, `/dossier`, `/admin`.
- Test: `bun run dev` → `localhost:3000`. Sign in with Clerk test user. See protected route.
- Commit: `git commit -m "feat: scaffold next.js console with design system and clerk auth"`

**3.2 — Supreme Court Judicial Watch page (flagship)**

- Route: `/judicial/supreme-court`
- Layout: Navy hero band at top ("Utah Supreme Court — Retention Overview"). Below: grid of justices cards (grayscale portrait → colorize on hover, name, office, retention year, latest correlation count, verdict status). Right column: top correlations summary (bills mentioned in opinions this term). Bottom: news feed teaser (Perplexity).
- All design system rules: tonal cards, no borders, gold pinstripes on hover, `--label-md` for metadata, no emoji, sentence-case headlines.
- Palantir patterns: Each justice card links to full dossier. "3 strong cross-references to SB 47 education bill" badge. Color-coded retention signal (green → safe, crimson → contested).
- Data: Supabase queries for current `state_supreme_justice` officials + `dossier_claims` count + top entity edges.
- Test: Render with seeded Diana Hagen + Jill Pohlman. Screenshot matches design aesthetic.
- Commit: `git commit -m "feat: judicial watch supreme court page"`

**3.3 — Dossier page (deep dive)**

- Route: `/judicial/[slug]` (and `/officials/[slug]`, `/candidates/[slug]`)
- Sections: Bio + portrait, "Analysis" (dossier prose, adversarial flags visible), Claims (filterable by category with source URLs), Related Entities (graph cross-refs as linked list + graph viz), Retention history (timeline), Feed tab (X posts + Perplexity news).
- Gold-pinstriped section headers (left-border rule). Body text 65-75ch max width. Sources shown as UPPERCASE tracked `SOURCE: vote.utah.gov`.
- Adversarial flags: subtle amber inline marker "⚠ challenged: see adversarial review" (Lucide icon, not emoji) linking to full critique.
- Test: Load Hagen dossier. All sections render without errors. Claims filterable by category.
- Commit: `git commit -m "feat: dossier deep-dive page with claims, graph refs, and feed tab"`

**3.4 — Global entity search**

- Route: `/search` (+ global search bar in nav chrome)
- Combines Supabase full-text (`ilike` on `officials.full_name`, `entities.canonical_name`) + pgvector semantic search (query embedding → ANN on `rag_chunks`).
- Results: grouped by type (Officials, Bills, Opinions, Issues). Each result links to relevant page.
- Test: Search "education" → returns relevant justices + bills with opinions mentioning education.
- Commit: `git commit -m "feat: global entity search with full-text and semantic results"`

**3.5 — Graph cross-reference view**

- Component: `EntityGraph` — visualizes `entity_edges` for a given official/entity.
- Visual spec: navy/cream, gold edges (stroke `--shadow-glow-gold` for strong links), Lucide icons as node labels, minimal labels in `--label-sm`.
- Library: `@xyflow/react` (React Flow) styled to design system, or D3 force layout.
- Test: Hagen graph renders with linked bills and opinions. Click node navigates to dossier.
- Commit: `git commit -m "feat: entity graph cross-reference component"`

**3.6 — Feed service + dossier feed tab**

- Backend: `backend/briefing/services/feeds/feed_service.py` (~100 LOC) — `FeedService` with `get_feed(official_id: str) → list[FeedItem]`. Sources: X API v2 (when token present) + Perplexity Sonar search for latest news.
- Frontend: Feed tab on dossier page — chronological list of posts/articles with source label, date, excerpt.
- Graceful degradation: if X token absent, Perplexity-only feed with note "X integration pending".
- Test: Mock FeedService returns 3 items. Feed tab renders. Source labels correct.
- Commit: `git commit -m "feat: feed service with X and perplexity sources; dossier feed tab"`
- **Status:** pending

### Phase 4: Expand Officials Coverage

**Objective:** Beyond Supreme Court — add UT Legislature, SLC Mayor/Council, SLCO Mayor/Council, UT Governor, UT AG, UT Delegation (federal senators/representatives). All feed into same dossier/graph pipeline.

**Tasks (high-level, will be expanded into a separate plan):**

- Extraction jobs for each jurisdiction/office type.
- Data sources: vote.utah.gov, le.utah.gov (bills), legis.utah.gov, fec.gov (federal), congress.gov.
- Entity edges: official → sponsored bills → issues, official → committee → other officials.
- Test: 20+ officials across jurisdictions in DB with claims.
- **Status:** pending

### Phase 5: Intelligence Reports & Advanced Palantir Features

**Objective:** Exportable briefings, advanced analytics, historical comparisons, full adversarial report UI, cross-jurisdiction correlations.

**Tasks (high-level, will be expanded):**

- PDF briefing export from dossier (design system styling).
- "Briefing mode" — curated view of top correlations + adversarial findings for human review.
- Historical retention vote comparison across justices.
- Cross-jurisdiction report ("Bills by SLC Council affecting entities linked to Justice X").
- SL County cities expansion.
- **Status:** pending

---

## Key Design Rules (Reference for All Phases)

- Always read `@design/README.md` before writing any UI code. Read `.cursor/rules/design-system.mdc`.
- No borders (No-Line Rule). Tonal layering only.
- Newsreader serif for headlines, Inter for UI. Never a third font.
- Gold (`--tertiary`) for structural accents only. Crimson (`--secondary`) for signal only (<5% viewport).
- Lucide icons, 1.5px stroke. Never emoji.
- Sentence case headlines. UPPERCASE tracked labels (`--label-md`/`--label-sm`).
- Grayscale portraits → colorize on hover (600ms).
- **Think Palantir in every view.** If data can be cross-referenced, show the reference. Every official, bill, opinion, issue should link.

---

## AI Architecture Reference

```
Stage 1: Perplexity Sonar / Sonar Pro
  → Grounded evidence bundle (URLs, citations, entity mentions)

Stage 2: Primary writer — WRITER_MODEL (Claude 4 class via Perplexity Agent API)
  → Structured dossier sections: bio, analysis, voting record, opposition research
  → Grounded to Stage 1 bundle only

Stage 3: Adversarial critique — ADVERSARIAL_MODEL (Grok 4 class via Perplexity Agent API)
  → "Find contradictions, unsubstantiated claims, missing cross-refs, weaker evidence"
  → Returns structured JSON: {challenge_id, challenged_claim, reason, confidence}

Stage 4: Synthesis pass — cheap model or rule-based
  → Items agreed on by both: high confidence (auto-include)
  → Items disputed: flag for human review (surfaced in Directus human review queue)
  → Compute overall groundedness_score

Stage 5: Human Review (Directus Dashboard)
  → Operator approves/rejects/edits flagged items
  → Approved: published to dossier page
  → Rejected: deleted or marked draft

Config (easily swap models):
  WRITER_MODEL=claude-sonnet-4-5
  ADVERSARIAL_MODEL=grok-4
  CORRELATION_MODEL=sonar         ← cheap, bulk edge extraction
```

**Abstraction:** All calls go through `LLMService` protocol in `briefing/services/llm/base.py`. Swap providers by updating config + implementing alternate service class. Business logic never imports `PerplexityLLMService` directly.

---

## Decisions Made (Full Registry)


| Decision                                                        | Rationale                                                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directus as CMS                                                 | Self-hosted, introspects existing Supabase schema, flows for automation, customizable to design system. Avoids full custom admin.                           |
| Start console from scratch                                      | OperatorConsole.jsx is design reference only — start clean Next.js with proper architecture                                                                 |
| Clerk for auth                                                  | Simpler than Supabase Auth for operator console. Well-supported MCP available.                                                                              |
| Perplexity as primary, single AI provider                       | One API, all models (Sonar + Agent + frontier). `LLMService` abstraction for future swaps.                                                                  |
| Adversarial AI pipeline                                         | Accuracy + credibility for judicial/opposition dossiers. Claude (primary) + Grok (adversarial) via Perplexity Agent. Structured debate before human review. |
| X API + Perplexity for feeds                                    | X for direct posts; Perplexity for grounded news aggregation. `FeedService` abstraction handles both.                                                       |
| `bun` not `node` for all JS/TS                                  | Faster, modern. Exception: `npx create-directus-extension@latest`.                                                                                          |
| `uv` not `pip` for all Python                                   | Faster, reproducible, declarative. Never manual pyproject.toml edits.                                                                                       |
| Officials hierarchy: `jurisdiction_level` + `office_type` enums | Preemptive support for all political levels without schema changes later.                                                                                   |
| Judges: `party = NULL`                                          | Utah judicial elections are non-partisan. `subject_alignment` field routes CMS/research logic.                                                              |
| Non-election years: show incumbents                             | `is_current = true` on `officials` regardless of party. Election years add candidates via `races`/`candidates`.                                             |
| Supreme Court first                                             | Most visible, most data-rich (opinions), best Palantir demonstration. Expand outward.                                                                       |
| Cheap model for correlation                                     | Sonar (small) for bulk entity edge extraction; expensive frontier only for final dossiers.                                                                  |
| Directus system tables in `directus` schema                     | Prevents Directus from polluting `public`. Schema separation, minimal role grants.                                                                          |
| Docker Compose for local orchestration                          | Supabase local + Directus + backend + (future) console in single compose network.                                                                           |


## Errors Encountered


| Error | Attempt | Resolution |
| ----- | ------- | ---------- |
| N/A   | -       | -          |


## Notes

- **Re-read before decisions:** `CLAUDE.md`, this file, `plans/02_findings.md`, `plans/04_foundation_supabase_directus.md`, `@design/README.md`.
- Always think Palantir: everything cross-referenced, intelligently reported.
- Foundation (Phase 0) is the prerequisite for everything else — complete all 8 tasks in `plans/04_foundation_supabase_directus.md` before Phase 1.
- Adversarial AI mitigations: ground both models to Stage 1 evidence, log all model outputs to `intelligence_runs`, human review gate before publishing.
- Governance: legal/compliance sign-off before production distribution of judicial dossiers.

