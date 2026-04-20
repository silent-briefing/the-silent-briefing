# Progress.md - Silent Briefing Plan Fleshing & Expansion

Local run and deployment walkthrough: [`README.md`](../README.md) at repo root.

## Session Log

**2026-04-19 - Initial Planning Session**
- Read existing @plans/00_task_plan.md (backend Phase 1 focused on candidates, ETL, LLM dossiers, Supabase graph/vectors).
- Read planning-with-files and writing-plans skills.
- Read design/README.md — confirmed premium editorial design system (navy/cream/gold, Newsreader+Inter, no borders, specific voice, OperatorConsole UI kit).
- Web searched CMS options for Supabase + custom React admin: Supamode, Supabase CMS, NextBlock, recalled Directus/Payload as strong fits.
- Web searched Utah Supreme Court data: utcourts.gov for opinions/bios/dockets, Ballotpedia for elections/retention, focus on retention votes.
- Created findings.md with research synthesis (design implications, judicial sources, CMS recs, Palantir vision).
- Created this progress.md.
- **Current Phase**: Requirements & Discovery + Planning (fleshing out expanded task_plan).
- Updated findings with key discoveries on retention elections, official sources rich for LLM analysis, need for heavy UI customization to match design.

**Decisions so far (Updated with User Feedback)**:
- **CMS: Directus chosen** (self-hosted on your Supabase Postgres; introspects existing schema, instant admin + GraphQL/flows for "create/replace page", custom theming to `@design/`, automations for Palantir correlation on edits). Payload as strong alternative for more TS modeling. No full custom CMS.
- **Frontend**: Start fresh Next.js 15 app (app router). Use `design/` (CSS vars, assets, typography rules, OperatorConsole as style reference only—not direct copy). Build Judicial main page (justices grid with info/news teasers) + dynamic dossier pages with tabs (Analysis, Claims, Interactive Graph for cross-refs, X/Perplexity Feed). Strict `@design/` adherence (tonal layering, editorial copy, gold accents, Lucide, no defaults).
- **Auth**: Clerk (easier; use Clerk MCP/skills for setup, orgs for GOP teams if needed).
- **Focus**: Supreme Court first (main justices page + deep dossiers). Expand to full Federal/State/SLC/SLCO. **Always Palantir**: Heavy cross-referencing via graph (judge ↔ opinion ↔ bill ↔ issue ↔ coverage). Intelligent reporting via CorrelationEngine (cheap Perplexity calls for edge proposal) + graph traversal + RAG + adversarial-vetted synthesis. Interactive graph viz in console.
- **AI Provider**: Perplexity **Sonar only** for v1 ([model catalog](https://docs.perplexity.ai/docs/sonar/models)): map **roles** to Sonar IDs — e.g. `CORRELATION_MODEL=sonar`, `WRITER_MODEL=sonar-pro`, `ADVERSARIAL_MODEL=sonar-reasoning-pro`, `RESEARCH_MODEL=sonar-deep-research` for research / deep-dive jobs (defaults in `backend/briefing/config.py`). Abstract `LLMService` for a future provider swap. Final reports: primary draft → adversarial pass (**stronger Sonar tier + critique prompt**) → synthesis + human review in Directus/Console. Cheapest tier for bulk correlation. Ground everything to Stage 1 evidence to limit adversarial step risk.
- **Feeds**: Both X API (for posts) + Perplexity (news/search related to subject). Store as claims or dedicated feed.
- **Self-hosted**: Directus + Supabase local (CLI/Docker), Next dev, FastAPI workers. Perplexity/Clerk/X hosted as needed.
- **"Pages"**: Dynamic routes in Next.js console (`/judicial/[slug]` or `/dossier/[slug]`), managed as items in Directus collections (slug, rich fields, publish status). CMS provides easy edit/create/replace that triggers backend refresh.
- **Phases**: Refined master plan now in 00_task_plan.md with new sections for Correlation/Palantir Engine, Directus CMS setup, Next.js Operator Console, Adversarial AI Pipeline. Original backend steps treated as foundational (complete or in-progress).
- **Graph/Correlation**: New service for LLM-driven edge extraction (cheap models), confidence scoring, manual approval. Enables "intelligent reporting" that surfaces connected insights across all referenced data.

**2026-04-20 — Directus resilience after `supabase db reset`**
- Added `scripts/dev-db-reset.ps1` (Supabase reset + repair) and `cms/scripts/sync-directus-after-supabase-reset.ps1` (stop/start Directus, `directus bootstrap`, `directus schema apply` on `snapshot-baseline.yaml`, optional `register-app-collections`).
- `docker-compose.yml`: healthcheck for Directus. `cms/.env.example`: document required **`KEY`** (Directus 10+) alongside `SECRET`. Snapshot extended with `entity_edges`, `dossier_claims`, `rag_chunks`, `intelligence_runs`. Plan updates in `plans/04_foundation_supabase_directus.md`.

**2026-04-20 — Phase 1 tranche 1 (executing-plans batch: 1.1–1.3)**
- Migrations: `20260420120000_entities_claims_vectors_graph.sql`, `20260420120100_link_officials_claims.sql` (entity graph + vault + RAG + intelligence_runs; `official_id` links; `officials_ensure_entity` trigger).
- Backend: `briefing/services/extraction/judicial.py`, `briefing/worker/__main__.py`; deps via `uv add` (`httpx`, `beautifulsoup4`, `lxml`, `playwright`, `supabase`). Roster source: `.../judges-bios/appellate-courts/supreme-court.html` (not `/courts/sup/` hub).
- Verification: `supabase db reset` OK; `uv run python -m briefing.worker judicial-extraction --dry-run --no-bios` passes golden (Hagen + Pohlman); `--persist --no-bios` upserts 5 UT supreme justices with `entity_id` set.
- Directus: extended `register-app-collections.ps1` with `entity_edges`, `dossier_claims`, `rag_chunks`, `intelligence_runs` — **re-run script** after pulling.

**2026-04-20 — Phase 0 Directus collections**
- `cms/scripts/register-app-collections.ps1` run successfully; Directus **Content** lists app collections.

**2026-04-20 — Phase 1 tranche 2 (1.4 Ballotpedia retention, `executing-plans`)**
- `backend/briefing/services/extraction/retention.py`: fetch Ballotpedia justice pages, parse **Elections** retention voteboxes, golden check (Hagen + Pohlman 2020 ~83% Yes).
- Worker: `python -m briefing.worker retention-extraction --dry-run|--persist` (optional `--slugs`). Inserts `dossier_claims` with `category=Retention Voting`, `pipeline_stage=retrieval_sonar`. Chief justice pages may lack voteboxes on Ballotpedia (0 rows until another source).
- Plan updates: `plans/01_expanded_silent_briefing_platform_plan.md` task 1.4 marked done.

**2026-04-20 — Phase 1 tranche 3 (1.5–1.6 opinions + LLM, `executing-plans`)**
- `opinions.py` + worker `opinion-ingestion`: legacy UT Supreme PDF index → pypdf → chunks → Perplexity embeddings → `rag_chunks`; migration `20260420140000_rag_chunks_ann_match.sql` (HNSW + `match_rag_chunks`).
- `services/llm/base.py`, `perplexity.py`: `LLMService` Protocol, `/v1/embeddings` + `/v1/sonar`; config `PERPLEXITY_API_KEY`, `EMBEDDING_*`.
- `uv add pypdf pytest respx`; `uv run pytest tests/` (suite grew with baseline + Step 0 API tests — see later 2026-04-21 entries). `opinion-ingestion --dry-run` validates golden chunk count without API/DB.

**2026-04-21 — Step 1 baseline ETL, Directus-friendly migrations, merge to `main`**
- **Baseline extraction (vote.utah + optional SLCO Playwright + optional Google Civic `voterinfo` only — standalone `elections` API helper not wired):** `backend/briefing/services/baseline/*`, `briefing/services/persistence/baseline_upsert.py`, worker `python -m briefing.worker baseline-extraction`, `POST /v1/extraction/baseline-sync`, `.github/workflows/baseline-extraction-smoke.yml`, tests `test_baseline_vote_utah.py`, `test_baseline_civic.py`.
- **Incremental local DB:** `scripts/dev-db-migrate.ps1` / `dev-db-migrate.sh` run `supabase migration up` (no Postgres wipe); `cms/scripts/sync-directus-after-migration.*` runs health check + `register-app-collections` only — **no** bootstrap/schema-apply. Documented in `README.md`, `CLAUDE.md`, `plans/04_foundation_supabase_directus.md`, `.cursor/rules/supabase-directus.mdc`. Full wipe + Directus repair remains `dev-db-reset.*`.
- **Verification:** `uv run pytest` (**6** passed after Step 0 API tests); `baseline-extraction --dry-run --sources vote_utah` returned hundreds of normalized rows against live filings.
- **Git:** pushed to `origin/main` (commit message: baseline ETL + migrate workflow + backend pipeline).

**2026-04-19 — Plans + stack alignment (post `db reset`)**
- `supabase db reset` reapplied migrations + seed; `supabase status` healthy (transient CLI 502 on container restart is a known local flake — confirm with `supabase status`).
- **Directus:** After Postgres wipe, admin credentials often **do not** match `cms/.env` `ADMIN_*` if the account was created or changed in the browser. `POST /auth/login` with `.env` alone can return **401** until the password in use matches the UI (see `plans/04_foundation_supabase_directus.md` post-reset checklist). `docker compose restart directus` run; re-registration / password alignment left to operator.
- **Docs/code:** Plans `00`–`04` updated for **Sonar-only** strategy (no multi-vendor Agent writer roster). `backend/briefing/config.py` defaults include `RESEARCH_MODEL=sonar-deep-research` for research passes.

**Current Phase**: **Phase 1 backend (1.1–1.9)** complete — schedule catalog (`worker --dry-run`), `correlation-recent-chunks`, and existing extraction/LLM CLIs. **Phase 2** (Directus CMS / judicial dossier management per `01_expanded`) and **Step 3** (bulk `dossier_claims` from adversarial prose) remain. Frontend (Next.js + Clerk) not started.

**Next Steps**:
- Prefer **`scripts/dev-db-migrate.*`** for new migrations; reserve **`dev-db-reset.*`** for intentional full replay.
- **Phase 2.1+** Directus theme extension and console prep; wire cron/Cloud Scheduler to worker recipes from `worker --dry-run`.
- Re-run **`register-app-collections`** after schema changes if Content metadata drifts.

**Test Results / Verification (latest):** `uv run pytest` in `backend/` — run after each tranche (correlation adds `tests/test_correlation.py`). Baseline dry-run against live vote.utah exercised in dev.

**Errors Encountered**: None logged for 2026-04-21 tranche.

**2026-04-21 — Phase 1 task 1.7 adversarial dossier pipeline**
- `backend/briefing/services/llm/adversarial_pipeline.py`: four-stage Sonar flow (retrieve → draft → critique JSON → synthesis JSON) with optional `intelligence_runs` persistence; worker `adversarial-dossier`.
- Tests: `tests/test_adversarial_pipeline.py` (mock LLM + mock Supabase insert). `uv run pytest tests/` → **9** passed.

**2026-04-21 — Step 0 plan closure (executing-plans)**
- **Gap:** Plan Step 0 called for **`/version`**, **lifespan** shared HTTP client, and correlation-friendly requests; app had only `/health` and no lifespan.
- **Shipped:** `GET /version` (package version via `importlib.metadata`), `app_lifespan` + shared **`httpx.AsyncClient`** on `app.state`, **`briefing.api.deps.get_http_client`**, **`X-Request-ID`** middleware, `tests/test_api_step0.py`. README Backend section documents API surface + worker boundary.
- **Verification:** `uv run pytest tests/` → **6 passed**.

**2026-04-19 — Phase 1 task 1.8 correlation engine (executing-plans tranche)**
- `backend/briefing/services/llm/correlation.py`: LLM proposes structured `entity_edges`; optional persist to Supabase with confidence threshold and dedupe/self-loop skips.
- Worker: `python -m briefing.worker correlation-pass` (`--text` / `--text-file`, `--persist`, `--dry-run`, `--min-confidence`).
- Tests: `tests/test_correlation.py`. Plan `01_expanded` task **1.8** marked done; next tranche **1.9**.

**2026-04-19 — Phase 1 task 1.9 schedule orchestration (executing-plans tranche)**
- `backend/briefing/services/schedule_catalog.py`: printable registry (cron hints + CLI one-liners); **`python -m briefing.worker --dry-run`** prints it (two-token argv only).
- `backend/briefing/services/pipeline/recent_rag_correlation.py` + worker **`correlation-recent-chunks`**: recent `rag_chunks` → `run_correlation_pass`.
- Tests: `tests/test_worker_schedule.py`, `tests/test_recent_rag_correlation.py`. **`01_expanded` Phase 1** backend checklist complete; next **Phase 2**.

**2026-04-19 — Step 3 tranche 1 (U3.1–U3.3, executing-plans batch)**
- **U3.1:** `backend/briefing/services/intelligence/evidence_bundle.py` — `EvidenceBundle` / `EvidenceItem`, `evidence_bundle_response_schema()` for Sonar `response_format`; golden `tests/fixtures/evidence_bundle_golden.json`; `tests/test_evidence_bundle.py`.
- **U3.2:** `retrieval_stages.py` — parameterized A/B/C prompts, `persist_retrieval_bundle`, optional `--correlate` → `run_correlation_pass` on merged text; worker **`retrieval-pass`**; config **`retrieval_model`** (default `sonar`); `tests/test_retrieval_stages.py` (Respx + mocks).
- **U3.3:** `dossier_writer.py` — load latest A/B/C claims by `metadata.evidence_bundle`, optional RAG via `match_rag_chunks_public`, Markdown draft → `dossier_claims` (`category=Dossier / Draft`, `pipeline_stage=writer_sonar`); worker **`dossier-write`**; `tests/test_dossier_writer.py`.
- **Docs:** `CLAUDE.md` planning table + worker hints; `AGENTS.md` intelligence layout; `schedule_catalog` on-demand Step 3 job.
- **Verify:** `uv run pytest` from `backend/` (full suite).
