# Expanded Silent Briefing Platform Plan: Judicial Watch, Dossiers, CMS & Palantir-for-Utah Intelligence Hub

> **This plan fleshes out and expands `@plans/00_task_plan.md` (Phase 1 Backend).** It incorporates the design system from `@design/`, judicial watch for Utah Supreme Court, always-on dossiers (candidates in election years; elected officials/judges in all years, including non-Republicans), cross-referenced entity graph, official jurisdiction hierarchy, CMS for easy data management, adversarial AI report architecture, X + Perplexity feeds, and a premium operator console UI.
>
> **For Claude:** Read `CLAUDE.md` first, always. Planning files in `plans/` — re-read before major decisions. Use `uv` for Python, `bun` for JS (only exception: `npx create-directus-extension@latest`). Follow `.cursor/rules/` for language/design/DB standards. DRY, SRP, YAGNI. ~200 LOC per file. Nothing manually created that can be scaffolded. Think Palantir — always. Reference `plans/02_findings.md` (research), `plans/03_progress.md` (session log), `plans/04_foundation_supabase_directus.md` (foundation setup).
>
> **Goal:** Build a comprehensive, self-serve Palantir-for-Utah intelligence platform. Judicial watch (Supreme Court first), evidence-based dossiers with adversarial AI analysis, official/judge hierarchy (federal→state→county→city), entity graph for deep cross-references (judge → opinions → bills → issues → media → posts), CMS admin in Directus for non-technical users, and a premium operator console matching the `@design/` editorial aesthetic. **Perplexity Sonar** ([models](https://docs.perplexity.ai/docs/sonar/models)) is the **only** LLM family for v1. Everything cross-referenced, intelligently reported.
>
> **Architecture Overview:**
>
> - **Schema:** `jurisdictions` (hierarchy) + `officials` (all elected/judges/candidates by type) + existing `entities/entity_edges/dossier_claims/rag_chunks` graph.
> - **Backend (extend Phase 1):** FastAPI + ARQ. New extraction jobs for utcourts.gov (opinions, bios), Ballotpedia (retention data), vote.utah.gov (filing sync). Two-stage + adversarial LLM pipeline via **Perplexity Sonar only**. Abstracted `LLMService` protocol.
> - **CMS:** Directus (self-hosted Docker) on same Supabase Postgres. Flows trigger LLM refresh on edit. Custom extensions themed to `@design/`. Enables non-dev management of officials, dossiers, claims.
> - **Frontend:** Next.js + React (start fresh from design system, not copied from OperatorConsole kit which is reference only). Clerk auth. Supreme Court page as Palantir flagship, dossier pages `/[jurisdiction]/[slug]`, global cross-ref search, graph viz.
> - **AI:** Perplexity **Sonar** for all generative steps; map roles to model IDs (`CORRELATION_MODEL`, `WRITER_MODEL`, `ADVERSARIAL_MODEL`, `RESEARCH_MODEL` for deep research). `LLMService` abstraction for easy swap. Adversarial critique = stronger Sonar tier + critique prompt. X API + Perplexity for feeds.
>
> **Tech Stack:** Supabase (Postgres, pgvector, RLS), FastAPI + ARQ (Python, `uv`), Perplexity **Sonar** (Chat Completions — all LLM roles), Directus (CMS, Docker, `bunx create-directus-project`), Next.js + React + TypeScript (`bun`), Clerk (auth), Lucide icons, design system CSS vars. Docker Compose for local orchestration.
>
> **References:** `CLAUDE.md`, `plans/00_task_plan.md`, `plans/02_findings.md`, `plans/03_progress.md`, `plans/04_foundation_supabase_directus.md`, `@design/README.md`, `.cursor/rules/`.

---

## Confirmed Decisions (from user Q&A)


| Question                   | Answer                                                                | Decision                                                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMS choice                 | Directus — user agreed, will learn                                    | **Directus** self-hosted via Docker on existing Supabase Postgres                                                                                                                                                                 |
| Frontend                   | Start fresh; OperatorConsole kit is reference only                    | **New Next.js app** from scratch using design system CSS/assets                                                                                                                                                                   |
| Auth                       | Clerk                                                                 | **Clerk** for all operator console routes                                                                                                                                                                                         |
| AI provider                | Perplexity **Sonar** only for v1; swap later if needed                | **Sonar** Chat Completions for all roles; abstracted `LLMService`; see [Sonar models](https://docs.perplexity.ai/docs/sonar/models)                                                                                               |
| Adversarial AI             | Stronger Sonar tier + critique prompt vs draft tier (same API family) | **Adversarial pipeline:** Primary draft (`WRITER_MODEL`, e.g. `sonar-pro`) → Critique (`ADVERSARIAL_MODEL`, e.g. `sonar-reasoning-pro`) → Synthesis → Human review queue in Directus                                              |
| Feeds                      | X + Perplexity                                                        | **X API v2** when available + **Perplexity Sonar** for news aggregation; `FeedService` abstraction                                                                                                                                |
| Initial focus              | Supreme Court flagship, Palantir thinking                             | **Utah Supreme Court** Judicial Watch page as MVP Palantir demonstration                                                                                                                                                          |
| Schema                     | Support hierarchies preemptively                                      | `jurisdiction_level` enum + `office_type` enum + `jurisdictions` (parent hierarchy) + `officials` table                                                                                                                           |
| Tooling                    | `bun` not node; `uv` not pip                                          | `bun` everywhere JS/TS; `uv` everywhere Python; `npx` ONLY for Directus extension scaffold                                                                                                                                        |
| Hosting                    | Self-hosted for development                                           | Docker Compose: Supabase local + Directus + backend + console                                                                                                                                                                     |
| Cheaper AI for correlation | Use cheaper **Sonar** tier for bulk edge extraction                   | `CORRELATION_MODEL=sonar`; `WRITER_MODEL=sonar-pro`; `ADVERSARIAL_MODEL=sonar-reasoning-pro`; `RESEARCH_MODEL=sonar-deep-research` for deep research jobs (tune per [Sonar models](https://docs.perplexity.ai/docs/sonar/models)) |


---

## Current Status

- **Foundation (Phase 0):** COMPLETE — see `plans/04_foundation_supabase_directus.md` for Supabase migrations, Directus Docker, hook extension, API stub. **Day-to-day schema changes:** use **`scripts/dev-db-migrate.*`** (`supabase migration up` + light Directus sync) so Directus is not wiped; **`dev-db-reset.*`** only for a full replay. **If you run `supabase db reset` alone**, follow the **Post-reset checklist** in `04`: repair Directus, align login with `cms/.env`, re-run `register-app-collections.ps1`.
- **Backend Phase 1 (from `plans/00_task_plan.md`):** Steps 0–1 complete (FastAPI skeleton, **baseline candidate ETL** — vote.utah / optional SLCO / optional Civic, `races`+`candidates` upsert, worker + API + CI smoke). Step 2 (entities/claims/vectors + ANN RPC) largely landed; see `00_task_plan` Step 2 status for open RLS/enum work. Running on local FastAPI.
- **Schema:** `races`, `candidates`, minimal `entities`, `jurisdictions`, `officials`, `entity_edges`, `dossier_claims`, `rag_chunks`, `intelligence_runs` live. Judicial roster extraction upserts UT supreme `officials` (worker). **Phase 1 (1.1–1.9)** complete in backend CLI terms. Next: **Phase 2** Directus CMS / operator console groundwork.

---

## Phases

### Phase 0: Foundation Setup (Prerequisite)

> **See `plans/04_foundation_supabase_directus.md` for full task breakdown.**

- Task 1: `supabase init` + `supabase start`. Keys to `.env.local`.
- Task 2: Apply existing races/candidates migration to fresh local instance.
- Task 3: `jurisdiction_officials` migration — enums, `jurisdictions`, `officials`, RLS, seed.
- Task 4: `directus_role_grants` migration — isolated `directus` schema, minimal Postgres role.
- Task 5: Directus Docker Compose — connected to Supabase local Postgres.
- Task 6: Directus collections config for officials/jurisdictions/entities/claims.
- Task 7: Directus extension — LLM refresh flow trigger on official save.
- Task 8: Backend stub endpoint for Directus webhook (`POST /v1/intelligence/refresh`).
- **Status:** complete
- **Blocks all other phases.**

### Phase 1: Backend — Schema Completion + Judicial Extraction

**Objective:** Complete Step 2 of `plans/00_task_plan.md` (entities/claims/vectors/graph) and extend for judicial extraction. Officials with type `state_supreme_justice` have opinions extracted, chunked, and embedded. Retention election data pulled from Ballotpedia. Two-stage + adversarial LLM pipeline wired.

**Bite-sized Tasks:**

**1.1 — Complete Step 2 schema (from 00_task_plan.md)** ✅

- Migration: `entities`, `entity_edges`, `dossier_claims`, `rag_chunks`, `intelligence_runs` tables.
- Command: `supabase migration new entities_claims_vectors_graph`
- Test: Insert a test entity + edge in Studio. Verify pgvector column.
- Commit: `git commit -m "feat: entities, claims, vectors, intelligence_runs schema"`
- **Done (2026-04-20):** `20260420120000_entities_claims_vectors_graph.sql` — `entities` pre-existed; added edges, claims, `rag_chunks` (vector 1024), `intelligence_runs`. `supabase db reset` applied cleanly.

**1.2 — Link officials to entities + claims** ✅

- Migration: Add `official_id uuid REFERENCES officials(id)` to `dossier_claims` (complement existing `candidate_id`). Add `officials` as `entity` nodes automatically (trigger or service).
- Command: `supabase migration new link_officials_to_claims`
- Test: Create official, verify entity node auto-created.
- Commit: `git commit -m "feat: link officials to entities graph and dossier_claims"`
- **Done (2026-04-20):** `20260420120100_link_officials_claims.sql` — `official_id` on `dossier_claims` + `intelligence_runs`; `officials_ensure_entity` BEFORE INSERT trigger. Verified `entity_id` populated after official upsert.

**1.3 — Judicial extraction worker job** ✅

- New service: `backend/briefing/services/extraction/judicial.py` (~150 LOC)
- Sources: `utcourts.gov` — **roster:** `.../judges-bios/appellate-courts/supreme-court.html` (stable justice links); httpx + Playwright fallback; optional bio pages for summary + retention hint.
- Output: Upsert to `officials` (jurisdiction=`ut`, office_type=`state_supreme_justice`).
- Command: `uv run python -m briefing.worker judicial-extraction --persist`
- Test golden set: Diana Hagen, Jill Pohlman — verify full_name, retention_year, slug.
- Commit: `git commit -m "feat: judicial extraction worker for utah supreme court justices"`
- **Done (2026-04-20):** `briefing/worker/__main__.py` + dependencies (`httpx`, `bs4`, `lxml`, `playwright`, `supabase`). Golden check passes; roster currently **5** active justices (all upserted). Re-run `register-app-collections.ps1` so Directus shows new tables.

**1.4 — Ballotpedia retention data extraction** ✅

- New service: `backend/briefing/services/extraction/retention.py`
- Scrape Ballotpedia **Elections** voteboxes (retention Yes/No tables). Persist as `dossier_claims` with `category='Retention Voting'`, `metadata.source=ballotpedia_retention` (replaces prior Ballotpedia rows per official on each run).
- Command: `uv run python -m briefing.worker retention-extraction --dry-run` / `--persist` (needs service role). Optional `--slugs diana-hagen,jill-m-pohlman`.
- **Golden:** Diana Hagen + Jill M. Pohlman must each show a **2020** retention with Yes ~83%. Some justices (e.g. chief) may have **no** votebox on Ballotpedia yet → zero claims until sourced elsewhere.
- **Done (2026-04-20):** Parser follows `span.mw-headline#Elections` (MediaWiki), maps `officials.slug` → Ballotpedia title (drops single-letter middle initials).
- Commit: `git commit -m "feat: ballotpedia retention vote history extraction"`

**1.5 — Opinion chunking + embedding** ✅

- Service: `backend/briefing/services/extraction/opinions.py` — legacy index `https://legacy.utcourts.gov/opinions/supopin/` (dated `*YYYYMMDD.pdf`, excludes `/summaries/`); **pypdf** text extract; chunk ~3.6k chars with overlap; **Perplexity** `/v1/embeddings` (`pplx-embed-v1-0.6b`, 1024-d) via `PerplexityLLMService`; upsert `rag_chunks` (`source_type=ut_supreme_opinion`, replace-by-`source_url`).
- DB: `supabase/migrations/20260420140000_rag_chunks_ann_match.sql` — **HNSW** cosine index + `public.match_rag_chunks(query_embedding vector(1024), match_count int)` (execute **`service_role`** only).
- Command: `uv run python -m briefing.worker opinion-ingestion --dry-run` (no key) / `--persist` (Supabase) / `--no-embed` / `--limit N`.
- **Golden:** ≥3 dated opinion PDFs listed; ≥3 opinions yield extractable text; **≥3 total chunks** across them (`--dry-run` verifies locally).
- **Done (2026-04-20):** Wired; full **embed+persist** needs `PERPLEXITY_API_KEY` + `SUPABASE_*` in `.env.local`. **`--persist`** runs an automatic **correlation** pass per opinion (same `CORRELATION_MODEL` + `entity_edges` persist) unless **`--no-correlate`**.
- Commit: `git commit -m "feat: opinion chunking and embedding into rag_chunks"`

**1.6 — LLM service abstraction** ✅

- `backend/briefing/services/llm/base.py` — `LLMService` **Protocol**: `embed_texts`, `chat_completion`.
- `backend/briefing/services/llm/perplexity.py` — `PerplexityLLMService`: decodes **base64 int8** embeddings to float vectors; chat → **`POST /v1/sonar`**.
- Config: `PERPLEXITY_API_KEY`, `EMBEDDING_MODEL_ID`, `EMBEDDING_DIMENSIONS`, `PPLX_*` models already on `Settings`.
- Test: `uv run pytest tests/` — **respx** mocks for `/v1/embeddings` + `/v1/sonar`.
- Commit: `git commit -m "feat: LLMService abstraction with Perplexity implementation"`

**1.7 — Adversarial dossier pipeline** ✅

- Service: `backend/briefing/services/llm/adversarial_pipeline.py` — `retrieve_evidence`, `generate_draft`, `critique_draft`, `synthesize_final`, `run_adversarial_dossier_pipeline`, `persist_pipeline_runs`.
- Flow:
  1. **retrieve** — `CORRELATION_MODEL` → evidence JSON bundle (Stage 1)
  2. **generate** — `WRITER_MODEL` → primary Markdown draft
  3. **critique** — `ADVERSARIAL_MODEL` + JSON schema → structured critique
  4. **synthesize** — `WRITER_MODEL` + JSON schema → `final_dossier`, `groundedness_score`, `requires_human_review`
  5. **Persist** (optional): four rows in `intelligence_runs` (`official_id`, per-stage `raw_response`, final row carries scores).
- Worker: `uv run python -m briefing.worker adversarial-dossier --subject "…" [--official-id UUID] [--dry-run] [--persist]`
- Test: `tests/test_adversarial_pipeline.py` — sequenced mock LLM, `groundedness_score >= 0.7`, persist inserts ×4 (mocked).
- **Done (2026-04-21):** wired; full run needs `PERPLEXITY_API_KEY`; `--persist` needs `SUPABASE_*` + `--official-id`.
- Commit: `git commit -m "feat: adversarial dossier pipeline (primary + critique + synthesis)"`

**1.8 — Correlation engine (cheap model, bulk)** ✅

- Service: `backend/briefing/services/llm/correlation.py` — `propose_edges_from_text` (JSON schema via `CORRELATION_MODEL`), `normalize_entity_type`, `persist_proposed_edges` (resolves/creates `entities`, inserts `entity_edges` with `status=proposed` when confidence ≥ default 0.8), `run_correlation_pass`.
- Worker: `uv run python -m briefing.worker correlation-pass --text "…" [--text-file] [--context] [--min-confidence 0.8] [--dry-run] [--persist]` (`--persist` needs `SUPABASE_*`).
- Tests: `tests/test_correlation.py` — normalization, propose (mock LLM), persist (monkeypatched entity resolution), dry-run / missing Supabase guard.
- **Done (2026-04-19):** CLI + unit tests; **`opinion-ingestion --persist`** runs correlation per opinion unless **`--no-correlate`**; `correlation-recent-chunks` for batch catch-up.
- Commit: `git commit -m "feat: correlation engine proposes entity edges from opinions/claims"`

**1.9 — Schedule orchestration** ✅

- **Reality check:** ARQ/Redis is **not** wired; work runs via **`python -m briefing.worker`** subcommands. This task delivers a **schedule catalog + cron-ready recipes**, not an in-process scheduler.
- **Catalog:** `uv run python -m briefing.worker --dry-run` (exactly that argv shape) prints scheduled job definitions: judicial weekly, opinion ingestion daily, **correlation on recent `rag_chunks`**, optional retention weekly — each with cadence, suggested cron, and example CLI.
- **Automation hook:** `correlation-recent-chunks` loads `rag_chunks` from the last `--hours` (default 48), concatenates text (caps `--max-chars`), runs the same Sonar correlation pass as `correlation-pass` (`--persist` / `--dry-run` / `--min-confidence`).
- Test: `tests/test_worker_schedule.py`, `tests/test_recent_rag_correlation.py`; full suite `uv run pytest tests/`.
- Commit: `git commit -m "feat: schedule judicial extraction and correlation jobs"`
- **Done (2026-04-19):** `backend/briefing/services/schedule_catalog.py`, `backend/briefing/services/pipeline/recent_rag_correlation.py`, `briefing.worker` entry + subcommand.

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
Stage 1: Sonar retrieval tier (e.g. sonar / sonar-pro)
  → Grounded evidence bundle (URLs, citations, entity mentions)

Stage 2: Primary writer — WRITER_MODEL (e.g. sonar-pro)
  → Structured dossier sections: bio, analysis, voting record, opposition research
  → Grounded to Stage 1 bundle only

Stage 3: Adversarial critique — ADVERSARIAL_MODEL (e.g. sonar-reasoning-pro)
  → "Find contradictions, unsubstantiated claims, missing cross-refs, weaker evidence"
  → Returns structured JSON: {challenge_id, challenged_claim, reason, confidence}

Stage 4: Synthesis pass — lighter Sonar tier or rule-based merge
  → Items agreed on by both: high confidence (auto-include)
  → Items disputed: flag for human review (surfaced in Directus human review queue)
  → Compute overall groundedness_score

Stage 5: Human Review (Directus Dashboard)
  → Operator approves/rejects/edits flagged items
  → Approved: published to dossier page
  → Rejected: deleted or marked draft

Use `RESEARCH_MODEL` (default `sonar-deep-research`) for **research** and scheduled “deep dive” jobs — costly and slower; not the default hot path for correlation or drafting.

Config (role → Sonar model ID; verify IDs in docs):
  CORRELATION_MODEL=sonar
  WRITER_MODEL=sonar-pro
  ADVERSARIAL_MODEL=sonar-reasoning-pro
  RESEARCH_MODEL=sonar-deep-research
```

**Abstraction:** All calls go through `LLMService` in `briefing/services/llm/base.py`. Config holds **Sonar model strings** only for v1; a future alternate provider is a new adapter, not a scatter of vendor SDKs in business logic.

---

## Decisions Made (Full Registry)


| Decision                                                        | Rationale                                                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Directus as CMS                                                 | Self-hosted, introspects existing Supabase schema, flows for automation, customizable to design system. Avoids full custom admin.                                                          |
| Start console from scratch                                      | OperatorConsole.jsx is design reference only — start clean Next.js with proper architecture                                                                                                |
| Clerk for auth                                                  | Simpler than Supabase Auth for operator console. Well-supported MCP available.                                                                                                             |
| Perplexity Sonar as sole LLM provider (v1)                      | One API surface; multiple **Sonar** model IDs for cost/latency tradeoffs ([docs](https://docs.perplexity.ai/docs/sonar/models)). `LLMService` abstraction for future non-Perplexity swaps. |
| Adversarial AI pipeline                                         | Accuracy + credibility for judicial/opposition dossiers. Draft + critique are **different Sonar tiers** and prompts, not different vendors.                                                |
| X API + Perplexity for feeds                                    | X for direct posts; Perplexity for grounded news aggregation. `FeedService` abstraction handles both.                                                                                      |
| `bun` not `node` for all JS/TS                                  | Faster, modern. Exception: `npx create-directus-extension@latest`.                                                                                                                         |
| `uv` not `pip` for all Python                                   | Faster, reproducible, declarative. Never manual pyproject.toml edits.                                                                                                                      |
| Officials hierarchy: `jurisdiction_level` + `office_type` enums | Preemptive support for all political levels without schema changes later.                                                                                                                  |
| Judges: `party = NULL`                                          | Utah judicial elections are non-partisan. `subject_alignment` field routes CMS/research logic.                                                                                             |
| Non-election years: show incumbents                             | `is_current = true` on `officials` regardless of party. Election years add candidates via `races`/`candidates`.                                                                            |
| Supreme Court first                                             | Most visible, most data-rich (opinions), best Palantir demonstration. Expand outward.                                                                                                      |
| Cheap model for correlation                                     | Sonar (small) for bulk entity edge extraction; expensive frontier only for final dossiers.                                                                                                 |
| Directus system tables in `directus` schema                     | Prevents Directus from polluting `public`. Schema separation, minimal role grants.                                                                                                         |
| Docker Compose for local orchestration                          | Supabase local + Directus + backend + (future) console in single compose network.                                                                                                          |


## Errors Encountered


| Error                                    | Attempt | Resolution                                                                                                                                     |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Directus script 401 after local DB reset | 1       | Align admin password with browser session or update `cms/.env`; run `register-app-collections.ps1` with UI credentials (`plans/04` checklist). |


## Notes

- **Re-read before decisions:** `CLAUDE.md`, this file, `plans/02_findings.md`, `plans/04_foundation_supabase_directus.md`, `@design/README.md`.
- Always think Palantir: everything cross-referenced, intelligently reported.
- Foundation (Phase 0) is the prerequisite for everything else — complete all 8 tasks in `plans/04_foundation_supabase_directus.md` before Phase 1.
- Adversarial AI mitigations: ground both models to Stage 1 evidence, log all model outputs to `intelligence_runs`, human review gate before publishing.
- Governance: legal/compliance sign-off before production distribution of judicial dossiers.

