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
- `uv add pypdf pytest respx`; `uv run pytest tests/` (2 tests). `opinion-ingestion --dry-run` validates golden chunk count without API/DB.

**2026-04-19 — Plans + stack alignment (post `db reset`)**
- `supabase db reset` reapplied migrations + seed; `supabase status` healthy (transient CLI 502 on container restart is a known local flake — confirm with `supabase status`).
- **Directus:** After Postgres wipe, admin credentials often **do not** match `cms/.env` `ADMIN_*` if the account was created or changed in the browser. `POST /auth/login` with `.env` alone can return **401** until the password in use matches the UI (see `plans/04_foundation_supabase_directus.md` post-reset checklist). `docker compose restart directus` run; re-registration / password alignment left to operator.
- **Docs/code:** Plans `00`–`04` updated for **Sonar-only** strategy (no multi-vendor Agent writer roster). `backend/briefing/config.py` defaults include `RESEARCH_MODEL=sonar-deep-research` for research passes.

**Current Phase**: Plan Refinement Complete → Ready for Implementation (Phase 1 extensions + CMS + Frontend). **Immediate ops:** fix Directus login alignment, then `.\cms\scripts\register-app-collections.ps1 -Email … -Password …`.

**Next Steps**:
- Implement per refined plan in 00_task_plan.md (use subagent-driven-development or executing-plans skill).
- Setup: Clerk, Directus (Docker with Supabase), Next.js project with design system.
- Verify: Golden set of Supreme Court justices, test correlation on sample opinions, design fidelity in console.
- Log all in these files; re-read before major decisions.

**Test Results / Verification**: Plan now incorporates all feedback, research on Directus/Perplexity/adversarial, Palantir patterns. Ready for execution with evidence-based checks (e.g. after CMS setup, test create/replace flow; after frontend, screenshot vs design rules).

**Errors Encountered**: None. (User moved files to plans/ as preferred—updated there per instructions.)

**Test Results / Verification**: N/A (planning phase). Will verify plan completeness against requirements before claiming done.

**Errors Encountered**: None yet.
