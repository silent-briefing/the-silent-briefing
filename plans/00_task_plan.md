# Refined Master Plan: Silent Briefing — Palantir-for-Utah Intelligence Platform (Supreme Court Judicial Watch, Dossiers, Directus CMS, Clerk + Next.js Operator Console, Perplexity-First AI with Adversarial Critique, Graph Correlation Engine)


## Goal

Build the **full Palantir-for-Utah intelligence platform** for Utah GOP use, focused initially on **Utah Supreme Court Judicial Watch** (justices, retention elections, opinions analysis) with expansion to Federal, State, Salt Lake City, and Salt Lake County officials/judges/candidates. **Always maintain living dossiers** for current elected/judges (including non-Republicans in non-election years); add candidate info during election/retention cycles. Core: evidence-based **claim-level vault** in Supabase, **entity graph** with heavy cross-referencing (judge ↔ opinion ↔ bill ↔ issue ↔ media/coverage), **intelligent reporting** that surfaces connected insights, **Directus CMS** for easy non-dev management ("create/replace pages", manual dossier/claim edits without DB changes), **Clerk-auth'ed Next.js Operator Console** (Supreme Court main page with justices overview/news, dynamic dossier views with tabs for analysis/claims/interactive graph/feed), and **Perplexity-first AI orchestration** using **only the Sonar model family** ([Sonar models](https://docs.perplexity.ai/docs/sonar/models)): cheaper tiers for volume (retrieval, correlation), stronger tiers for drafting and critique, optional `sonar-deep-research` for heavy runs — all via **Sonar Chat Completions** (`/chat/completions`); adversarial critique = **different Sonar tier + critique prompt**, then synthesis + human review (no multi-vendor writer roster).

**Perplexity Sonar for all LLM work** (one API surface; model IDs from [Sonar models](https://docs.perplexity.ai/docs/sonar/models); abstraction still allows a future provider swap). **Palantir principles everywhere**: automated + LLM-driven correlation (cheaper Sonar tiers for edge proposal), interactive graph viz, RAG-augmented intelligent briefings that traverse connections intelligently. Self-hosted where possible (Supabase local CLI/Docker, Directus Docker, Next dev server, FastAPI workers).

**What we are building**: Extend existing FastAPI backend + workers (Phase 1 foundation complete/in-progress), add CorrelationEngine service, Directus CMS layer, fresh Next.js frontend per `@design/` (editorial navy/cream/gold, tonal layering, Newsreader+Inter, Lucide, no SaaS defaults—OperatorConsole as style reference only). **Not**: Public voter UI.

**Scope**: Supreme Court first (main justices page + deep linked dossiers). Graph + correlation for "everything referenced together" with intelligent reporting. CMS for "pages" (slug-based dynamic routes managed in Directus collections). Adversarial AI loop for high-stakes reports. Later: full jurisdictions, X feed integration, more cities.

**Architecture (Palantir-inspired)**: Supabase (schema + pgvector + RLS), FastAPI + ARQ (extend for judicial extraction, correlation jobs), Directus (on same DB for admin/flows/GraphQL), Next.js 15 (Clerk auth, design system foundation, graph components, dynamic pages). `LLMService` abstraction maps roles to **Sonar model IDs** only: e.g. `CORRELATION_MODEL=sonar`, `WRITER_MODEL=sonar-pro`, `ADVERSARIAL_MODEL=sonar-reasoning-pro`, `RESEARCH_MODEL=sonar-deep-research` for scheduled or on-demand **deep research** (not the default latency-sensitive path). Correlation uses the **cheapest** tier; critique uses a **stronger** Sonar tier with a strict evidence-bound prompt. Human review queue in Directus/Console.

### Research Insights (goal / architecture + user feedback)
- **Directus** best for CMS: Layers on your Supabase without schema changes, instant admin/flows for automation (edit → correlation trigger), custom themable to `@design/`, GraphQL ideal for Palantir frontend queries. Self-hosted Docker. (Confirmed via research; strong partner.)
- **Perplexity Sonar Reasoning Pro** ideal for multi-step correlation, CoT on opinions. Adversarial critique needs grounding prompts to mitigate persuasion risks (per 2026 research: can reduce accuracy 10-40%; counter with provenance, citation validation, human gate).
- **Frontend**: Fresh Next.js to strictly follow design system (avoid any default UI kits). Judicial main page as entrypoint to Palantir UX.
- **Always Palantir**: CorrelationEngine + graph traversal + adversarial synthesis = intelligent, connected reporting. Cheaper models for volume; Perplexity abstraction enables it cheaply.

**Best practices**

- Treat **Stage 1 output as an evidence bundle** (URLs, fetch time, normalized spans, hashes); Stage 2 composes **only** from that bundle to simplify audit and reduce “prompt stuffing” risk.
- Assume **at-least-once** job execution for any queue or cron; **Supabase holds durable truth** (job status, idempotency keys, embeddings)—the queue is for dispatch, not the audit trail.

**Security**

- Retrieved web content is **untrusted input** to the writer model; structure prompts to mitigate **indirect prompt injection** (see [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) / [GenAI resources](https://genai.owasp.org/)).

**References**

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) · [Supabase — Securing your data](https://supabase.com/docs/guides/database/secure-data) · [Supabase — Hardening the Data API](https://supabase.com/docs/guides/api/hardening-data-api)

## Stakeholder & use (explicit)

- **Primary user:** Utah **GOP** campaigns / county parties / aligned PACs (operational research, not public voter roll spam).
- **Opposition research:** Systematic, source-backed dossier claims on **opposing candidates** (same schema as “friendly” bios — differentiate with `subject_alignment` or `pipeline` metadata in DB).

## Governance (non-legal checklist)

Campaign and opposition research work can implicate **election law**, **privacy**, and **third-party ToS** (sites, APIs, LLM providers). Before production use: designate **human review** for sensitive claims, retain **source URLs**, and obtain **org legal/compliance** sign-off on data sources and outreach (this plan does not provide legal advice).

### Research Insights (governance)

**Quality gates**

- Define **when** humans must review (e.g. opposition dossiers, low citation coverage, high contradiction rate between Stage 1 evidence and Stage 2 prose, or “unreferenced assertion” rate above threshold).
- Keep a **frozen golden set** (candidates + expected source URLs / JSON shape) to regression-test model and prompt changes.

**Data protection (technical, non-legal)**

- Prefer **RLS + narrow grants** on any table reachable from the Data API; for highest-sensitivity rows, consider **non-exposed schemas** and **backend-only Postgres** access per [Hardening the Data API](https://supabase.com/docs/guides/api/hardening-data-api).

**References**

- [RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions) (RLS + vectors) · [Supabase — Understanding API keys](https://supabase.com/docs/guides/api/api-keys)

## Current Phase

**Refined Master Plan Complete.** Original Phase 1 backend foundational (Steps 0-1 complete; Step 2 schema/entities/claims/vectors in progress and extended here for judges/opinions). New phases added below for Directus CMS, Correlation/Palantir Engine, Adversarial Perplexity Orchestration, Next.js Operator Console (Supreme Court focus). **Current: Transition to Implementation** (start with judicial extraction + Directus setup + LLM abstraction per bite-sized tasks in new phases). Re-read `plans/findings.md`, this file, and `plans/progress.md` before any code. All self-hosted dev (Supabase local, Directus Docker).

## Phases

### Step 0: Backend skeleton (API + config + job boundaries)

**Objective:** Repo layout and runtime split appropriate for **ETL + LLM** (not “one giant request handler”).

- [x] **FastAPI** app: health, version, **REST** routes for triggers/status (e.g. “run scrape”, “enqueue candidate X”, “job status”) — thin controllers, fat **services** modules.
- [x] **`pydantic-settings`:** env-based config — **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** (or split anon vs service keys) from **`supabase start`** locally, dashboard when hosted; optional **`DATABASE_URL`** for direct SQL/SQLAlchemy (`postgresql://postgres:postgres@127.0.0.1:54322/postgres` local default per CLI output); Perplexity, Cloudflare, etc.; **never** embed `service_role` in client bundles.
- [x] **Lifespan:** open shared **HTTP clients** / connection pools in [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/); teardown on shutdown.
- [x] **Long work:** **[`BackgroundTasks`](https://fastapi.tiangolo.com/tutorial/background-tasks/)** only for **light** post-response work; **scrape + Sonar + writer + embed** run in a **separate worker process** or **queue-backed job** (FastAPI docs point to **Celery**-class tools for heavy work — pick ARQ/RQ/Huey/Celery or a dedicated `worker` CLI; document choice).
- [x] **Scheduling:** **GitHub Actions cron**, **K8s CronJob**, or host **cron** invoking a **worker module** (e.g. `python -m <package>.worker run-nightly`) or HTTP to a **secured** admin route — FastAPI has **no** built-in cron.
- [x] **Optional later:** **WebSockets** for job progress — [FastAPI websockets](https://fastapi.tiangolo.com/advanced/websockets/) (single-process story; scale-out needs pub/sub — out of scope until required).
- [x] **Queue / worker default (document in README):** **ARQ + Redis** for async I/O-heavy pipelines (scrape, LLM, embed); **Celery** if the team standardizes on it or needs broader workflow primitives; **plain asyncio worker + cron** only with **DB-backed claiming** (`FOR UPDATE SKIP LOCKED`, leases) and documented risk of overlapping cron runs. Optional: **Supabase Queues** ([pgmq](https://supabase.com/docs/guides/queues)) instead of Redis — different ops tradeoff, same need for **idempotent** side effects.
- [x] **Idempotency:** unique **`idempotency_key`** (or natural keys) on job rows / upserts so retries and duplicate deliveries do not double-charge APIs or duplicate claims.
- **Status:** complete (skeleton in `backend/` — `pip install -e .`, `uvicorn briefing.api.main:app`, `arq briefing.worker.settings.WorkerSettings`)

### Research Insights (Step 0 — skeleton)

**Best practices**

- **FastAPI** stays thin: enqueue work, return **202 + job id** where appropriate; workers own retries/backoff/jitter for external APIs.
- Log **correlation ids** (`job_id`, `candidate_id`, `intelligence_run_id`) in structured JSON logs — never log full API keys (trim to prefix/hash only).

**Pitfalls**

- **At-least-once** semantics: every LLM call and DB write path should be safe to run twice.
- **Celery + asyncio:** if choosing Celery, plan explicitly how async HTTP clients run (extra glue vs ARQ’s native async).

**References**

- [FastAPI — Background tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) · [ARQ docs](https://arq-docs.helpmanual.io/) · [Celery stable](https://docs.celeryq.dev/en/stable/) · [Supabase Queues](https://supabase.com/docs/guides/queues)

### Step 1: Baseline Data Extraction (“Who”)

**Objective:** Reproducibly pull candidate identity fields from live pages that may be JS-heavy.

- [x] **Sources:** SLCO Clerk — [`current-candidate-list`](https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/) (JS UI); statewide — [`vote.utah.gov/2026-candidate-filings/`](https://vote.utah.gov/2026-candidate-filings/) (static HTML tables; configurable via `VOTE_UTAH_FILINGS_URL`). Voter search: [`votesearch.utah.gov/.../candidates-and-issues`](https://votesearch.utah.gov/voter-search/search/search-by-address/candidates-and-issues) (address-scoped; not primary roster).
- [x] **Tooling (per probe):**
  - **vote.utah.gov:** `httpx` + **BeautifulSoup** / **lxml** (deterministic table parse). Default **User-Agent** required — some hosts return **403** to library defaults (`HTTP_USER_AGENT` in settings).
  - **SLCO:** **Playwright** (Chromium): open list URL → race `<select>` **All** → scrape **h3** (office) + **h4** (name) + following **p** (party — filing status). Toggle `SLCO_PLAYWRIGHT_ENABLED=false` to skip (httpx probe only). **Cloudflare `/content`** remains an ops alternative.
  - **Other:** Firecrawl optional per host (not wired).
- [x] **Supplement:** [Google Civic Information API v2](https://developers.google.com/civic-information/docs/v2) client — **`elections`** when `GOOGLE_CIVIC_API_KEY` set; **`voterInfoQuery`** → `NormalizedCandidate` when **`GOOGLE_CIVIC_VOTER_ADDRESS`** set (optional **`GOOGLE_CIVIC_ELECTION_ID`**); **`divisionsByAddress`** on client for future use. **No** Representatives endpoints.
- [x] **Output contract (normalized list):** `NormalizedCandidate` — Name, Office Sought, Party, Incumbency (empty when unknown), District (parsed from office text), provenance fields.
- [x] **Operations (smoke / schedule):** [`.github/workflows/baseline-extraction-smoke.yml`](.github/workflows/baseline-extraction-smoke.yml) — `workflow_dispatch` + daily UTC cron; runs `uv sync`, Playwright system deps + Chromium, `python -m briefing.worker baseline-extraction`. **Idempotent merge** into **`public.races` / `public.candidates`** via upsert (`dedupe_key` + race natural key). Production cron may call **secured API** or **ARQ worker** on your host.
- [x] **Resilience (MVP):** `ResilientFetcher` — concurrency cap, retries + backoff + jitter, **Retry-After** on 429, **ETag** / **Last-Modified** conditional GET, **SHA-256** body hash on responses.
- [x] **Artifacts:** raw HTML + retention (`EXTRACTION_ARTIFACTS_DIR`, `EXTRACTION_ARTIFACTS_RETENTION_DAYS`) — vote.utah response, SLCO httpx probe, SLCO Playwright render; split discovery vs fetch job types remains a later ops refinement.
- **Status:** complete for roster pull + **Supabase upsert** when service role configured (`persist_baseline_extraction`, `POST /v1/extraction/baseline-sync`, worker `process_scrape_job`, CLI `baseline-extraction --persist`).

### Research Insights (Step 1 — extraction)

**Best practices**

- **Discovery vs fetch:** treat listing pages and detail pages as separate pipelines with their own hashes and schedules — reduces duplicate full fetches when only ordering changes.
- Prefer **deterministic extraction** (`/scrape`-style selectors, local Playwright) before LLM **`/json`** extraction when the schema must be exact (already directionally in `findings.md`; reinforce here for filings accuracy).

**Edge cases**

- **401/403** — do not “retry forever”; classify as policy / bot block and alert.
- **Poison pages** — cap body size, timeout aggressively, and quarantine URLs that repeatedly fail.

**References**

- [Playwright — Actionability](https://playwright.dev/python/docs/actionability) · [Cloudflare Browser Rendering FAQ](https://developers.cloudflare.com/browser-rendering/faq/) (bot-identified traffic)

### Step 2: Database Architecture (“Vault” + graph + vectors)

**Objective:** **Supabase** (local `supabase start` first, then linked/hosted) with **`pgvector`** — same Postgres engine, but **PostgREST, RLS, Studio, migrations workflow**, and optional Auth/Storage/Realtime as needed — **not** a standalone Postgres container or non-Supabase managed Postgres as the primary app DB. Schema includes: relational **election core**, **claim-level** research, **LLM provenance**, a **typed entity graph** (people / bills / issues / orgs / races), and **chunk embeddings** for RAG — so downstream queries can traverse “candidate → sponsored bill → issue → related coverage” and retrieve semantically similar chunks.

- [x] **`races`** — table + unique `(office_label, district, jurisdiction)` in [`supabase/migrations/20260319180000_races_candidates.sql`](supabase/migrations/20260319180000_races_candidates.sql) (RLS on; **service_role** grants only).
- [x] **`candidates`** — FK to `races`, `dedupe_key` column + unique index; **`briefing.services.persistence.baseline_upsert`** upserts from `NormalizedCandidate` rows (vote.utah + SLCO + Civic voterInfo).
- [x] **`entities`** — unified node table (minimal enum in [`20260319180000_races_candidates.sql`](supabase/migrations/20260319180000_races_candidates.sql)); extend types / dedupe strategy still TBD (see Key Questions).
- [x] **`entity_edges`** — landed in [`20260420120000_entities_claims_vectors_graph.sql`](supabase/migrations/20260420120000_entities_claims_vectors_graph.sql): **`source_entity_id`**, **`target_entity_id`**, **`relation`**, **`provenance`**, **`status`** (`proposed` | `accepted` | `rejected`), **`confidence`** / **`weight`** / **`valid_from`**.
- [x] **`dossier_claims`** — same migration + [`20260420120100_link_officials_claims.sql`](supabase/migrations/20260420120100_link_officials_claims.sql): FKs **`candidate_id`**, **`official_id`**, subject/object **`entities`**; **`pipeline_stage`** enum (`retrieval_sonar` | `writer_sonar` | `critique_sonar` | `human_edit`); LLM provenance columns; **`groundedness_score`**.
- [x] **`rag_chunks`** — same migration: **`content`**, **`embedding vector(1024)`** (align dim with embed API in Phase 1.5), **`embedding_model_id`**, **`source_url`**, **`source_type`**, **`chunk_index`**, **`content_hash`**.
- [x] **`intelligence_runs`** — same migrations: **`model_id`**, **`pipeline_stage`**, **`status`**, tokens/cost, **`raw_response`**, **`idempotency_key`**, **`groundedness_score`**, **`requires_human_review`**; FKs **`candidate_id`**, **`official_id`**.
- [ ] **Migrations / RLS (if Supabase):** enable **`pgvector`**; **RLS on every user-reachable table** if anything uses **`anon` / publishable key**; workers use **`service_role` / secret key** only on trusted hosts — remember it **bypasses RLS**, so enforce org rules in code for sensitive paths.
- [ ] **Defense in depth:** for opposition-grade tables, consider **`private` (non-exposed) schema** + server-side Postgres only, or minimal RPC with **`SECURITY INVOKER`** and **revoked `EXECUTE` from `anon` / `public`** on sensitive functions ([Hardening the Data API](https://supabase.com/docs/guides/api/hardening-data-api), [Database Functions](https://supabase.com/docs/guides/database/functions)).
- [ ] **Vectors:** similarity search must respect intended isolation — follow [RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions); avoid returning raw **embedding vectors** to clients unless required.
- [ ] **Ongoing:** run **Security Advisor** in Supabase for “RLS disabled” regressions before releases.
- **Status:** in progress (graph + claims + vectors + runs landed 2026-04-20; ANN indexes / `match_*` RPC / entity enum expansion / full RLS review still open)

### Research Insights (Step 2 — database)

**Best practices**

- Index columns referenced in **RLS policies**; follow Supabase **RLS performance** guidance (e.g. wrap `auth.uid()` as `(select auth.uid())` per [RLS performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)).
- Use **`embedding_model_id` + `content_hash` + `chunk_version`** on `rag_chunks` (already listed) — add **`fetched_at` / `source_version`** when web-sourced for freshness ranking and invalidation.

**Performance**

- Prefer **`match_*` RPC** or SQLAlchemy paths that keep ANN queries **parameterized** and **bounded** (`limit`, distance threshold).

**References**

- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Vector columns](https://supabase.com/docs/guides/ai/vector-columns) · [Column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security) (advanced)

### Step 3: Autonomous Researcher & Intelligence (“Deep Dive”)

**Objective:** **Stage 1 — gather; Stage 2 — write.** On **new or stale** candidates, use **Sonar** to pull **grounded, structured facts** (and citations). Then use **the same Sonar Chat Completions API** with a **stronger Sonar model** (and structured output / `response_format` where supported) to turn that evidence into **dossier prose** (sections, executive summary, talking points) **without inventing sources** — every material factual assertion in output should trace to Stage 1 URLs or graph-linked entities. Support **opposition** depth via routing. **Graph + RAG:** extract or normalize **entity mentions** (bills, people, issues) into **`entities` / `entity_edges`**; **chunk** long sources into **`rag_chunks`** and **embed** for retrieval to feed future prompts.

- [ ] **Stage 1 — Retrieval (grounded Sonar passes):** Prompts **A / B / C** (bio, record, vetting) — Chat Completions with `model` per [Sonar models](https://docs.perplexity.ai/docs/sonar/models) (e.g. `sonar`, `sonar-pro`, `sonar-deep-research`, `sonar-reasoning-pro` — confirm current IDs in docs). Persist as **`dossier_claims`** with **`pipeline_stage=retrieval_sonar`**; parse bill/person/issue hooks into **`entities` + `entity_edges`** where possible.
- [ ] **Stage 2 — Dossier writing (Sonar only):** Input = **structured Stage 1 JSON** + optional **top-k `rag_chunks`**. Single or multi-call flow (per-section JSON or one narrative). Persist as claims or dedicated narrative rows with **`pipeline_stage=writer_sonar`** (rename from `writer_agent` in code/docs as you implement). Config **`WRITER_MODEL`** (default **`sonar-pro`**) + optional **`WRITER_FALLBACK_CHAIN`** of **other Sonar model IDs** for failover (see Perplexity **model fallback** docs for your SDK path).
- [ ] **Prompt D — Briefing / synthesis:** Can run on **Stage 2** output or directly on Stage 1 claims; prefer **`WRITER_MODEL`** for fluency, a **fresh Sonar retrieval** pass if new web grounding is required.
- [ ] **Routing — who gets what:** GOP-flagged → A + lighter C; **opposition** → full A/B/C + stronger Stage 2 vetting tone (still source-grounded). Encode in config.
- [ ] **RAG hygiene:** embedding model choice (dims must match `pgvector` column); chunk size / overlap; re-embed when source changes; store **`embedding_model_id`** on `rag_chunks` for future migrations.
- [ ] **Structured JSON:** **`json_schema`** / `response_format` on Sonar where supported for both retrieval and writer passes; validate before insert; store **raw** responses for debug.
- [ ] **Model testing harness:** **`MODEL_MATRIX`** includes **each Sonar tier** you deploy (`CORRELATION_MODEL`, `WRITER_MODEL`, `ADVERSARIAL_MODEL`, optional deep-research); in staging, run fixed **golden** candidates and score **groundedness** (citations present), **JSON validity**, **style** rubric.
- [ ] **Error handling:** retries, rate limits, partial success (e.g. Sonar OK, writer fails → keep claims, queue retry).
- [ ] **Groundedness checks (staging → prod gates):** automated metrics in the spirit of **RAGAS faithfulness** / NLI entailment on **atomic claims** vs Stage 1 evidence; track **citation coverage** and **citation validity** (URL/snippet supports sentence — see e.g. [FACTUM](https://arxiv.org/abs/2601.05866) for long-form citation QA research context).
- [ ] **Optional critic pass:** small verifier model or rule step when scores fall below threshold (inspired by **Self-RAG**-style retrieve → generate → critique — [paper](https://arxiv.org/abs/2310.11511)).
- **Status:** pending

### Research Insights (Step 3 — intelligence)

**Best practices**

- Validate **`json_schema`** outputs **before** insert; store **raw** provider payloads for forensics (already planned — add **PII redaction policy** for logs if raw text can contain addresses/phones from sources).
- **Writer prompts:** treat evidence as **quoted, delimited blocks**; never silently allow new URLs in Stage 2 that were not in Stage 1 unless explicitly running a **new** Sonar retrieval job.

**Security**

- Sanitize or encode model outputs before any downstream tool that could interpret them as instructions or markup (**insecure output handling** class — OWASP GenAI).

**Chunking defaults (tune per corpus)**

- Start near **512–1024-token** windows with **~10–20% overlap**; prefer **structure-aware** splits when HTML/PDF has headings — then measure retrieval quality on golden questions.

**References**

- [RAGAS — Faithfulness](https://docs.ragas.io/en/latest/concepts/metrics/faithfulness.html) · [OWASP GenAI — LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) · [Perplexity docs](https://docs.perplexity.ai/)

### Step 4: Orchestrator (“Autopilot”)

**Objective:** **Backend** command path(s): worker entrypoint + optional API-triggered jobs — scrape → DB upsert → research for newcomers. (Foundational; extended in new phases below for judicial and correlation.)

- [x] Core layout and scheduling patterns established in original plan.
- **Status:** foundational (extend for new jobs).

### Research Insights (Step 4 — orchestrator)

**Best practices** (updated)
- Separate queues + Perplexity caps preserved. Add dedicated correlation queue (cheap models). Integrate with Directus flows for CMS-triggered jobs.
- New: Correlation metrics (edges proposed/accepted, correlation confidence).

**Edge cases**
- Partial success now includes correlation failures (keep claims, retry edges).

**References**
- Original + Directus flows docs, Perplexity rate limits.

## New Phases (Refined Expansion per User Feedback & Research)

### Phase 5: LLM Abstraction, Perplexity Primary + Adversarial Critique Pipeline

**Objective:** Make **Perplexity Sonar** the one-stop: config maps **roles** → **Sonar model IDs** (correlation, writer, adversarial). Abstract for easy swap. Implement adversarial loop for reports (draft → critique with **stronger Sonar tier + critique prompt** → synthesis) + human review. Support X feed.

**Bite-sized Tasks (TDD style):**
1. Create `services/llm/base.py` + `perplexity.py` (config-driven **Sonar** models only, normalize to your schemas, Sonar-only fallback chain). Test with dummy calls.
2. Update existing LLM calls to the abstraction. Wire **`CORRELATION_MODEL`** to the cheapest Sonar tier used in production.
3. Implement `AdversarialCritiqueService`: Primary draft → Critique ("find flaws vs sources, missing cross-refs, unsubstantiated") using **`ADVERSARIAL_MODEL`** (e.g. **`sonar-reasoning-pro`**). Synthesis pass. Add to pipeline for judicial dossiers.
4. Add X integration stub (API client for posts related to subject; store as claims or feed data). Perplexity as backup for news.
5. Human review queue: New `intelligence_reviews` table or Directus flow; console view.
- **Status:** pending
- **Files:** `services/llm/`, update existing pipeline/services, new tests in worker tests.
- **Palantir tie-in:** Critique includes "are cross-references complete?" prompt. Ground all in evidence.

### Phase 6: Judicial Watch Extraction + Correlation/Palantir Engine

**Objective:** Supreme Court focus. Extract opinions/bios from utcourts.gov + Ballotpedia. Build CorrelationEngine for automatic edge proposal using cheap Perplexity calls. Enable "everything referenced" + intelligent reporting.

**Bite-sized Tasks:**
1. Extend schema (migrations): Add opinion support to entities/claims or new `opinions` table; judicial fields on officials (`type='judge'`, `retention_year`, etc.).
2. New extraction job for Supreme Court (Playwright/httpx for opinions list, parse key metadata). Idempotent upsert, trigger correlation.
3. Implement `services/correlation/engine.py`: On new content, cheap LLM call to extract structured edges ("list related bills/issues/entities with justification/confidence"). Upsert to `entity_edges` with provenance. Batch for efficiency.
4. Vector + graph queries for "intelligent report" generation (traverse for connected claims, RAG chunks).
5. Test on golden justices (Hagen, Pohlman): extraction → correlation (e.g. opinion links to bill) → report.
- **Status:** pending
- **Files:** `supabase/migrations/`, `services/extraction/`, `services/correlation/`, update orchestrator. Use existing ResilientFetcher.
- **Palantir**: This is the core correlation layer. Main justices page will query this for "top connections" cards.

### Phase 7: Directus CMS for Data & Page Management

**Objective:** Easy non-dev management. Create/edit/replace "pages" (judges/candidates/officials with slugs), rich dossier editing, claim management, approval flows. Theme to `@design/`. Trigger backend on changes.

**Bite-sized Tasks:**
1. Docker-compose for Directus (connect to local Supabase Postgres + storage). Config for your schema.
2. Define/configure collections in Directus (`officials`, `dossiers`, `claims`, `reviews`) with relations, rich text (for analysis), slug field, status (draft/published).
3. Customize UI: CSS overrides + custom panels/interfaces using design system (navy/cream, gold, Newsreader labels, Lucide, tonal cards, editorial copy rules). Add "Create Judicial Page" flow.
4. Flows/hooks: On save → call FastAPI endpoint for correlation/LLM refresh.
5. Test: Non-dev flow — create/replace justice page, edit claim, verify DB + trigger, view in console. Human review queue.
- **Status:** pending
- **Files:** `docker-compose.yml` (add Directus), Directus config/yaml, custom extensions if needed. Update RLS if impacted.
- **Why Directus**: Instant on your schema, flows for Palantir automation, self-hosted, customizable to design without full rewrite.

### Phase 8: Next.js Operator Console UI (Fresh, Design-System First)

**Objective:** Fresh Next.js 15 app. Clerk auth. Supreme Court main page (justices overview with cards, key stats, news teaser, correlations). Dynamic dossier pages with tabs (Overview/Analysis/Claims/Graph/Feed). Interactive graph for cross-refs. Consume FastAPI + Directus GraphQL. Strict `@design/` (no shadcn defaults; use your CSS, components, copy, Lucide, grayscale portraits, etc.).

**Bite-sized Tasks:**
1. Init Next.js 15 (app router, TS, Tailwind with design CSS import as base). Add Clerk.
2. Build Judicial main page (`/judicial`): Grid of justices using design cards, quick links to dossiers, top correlations from graph.
3. Dossier dynamic route (`/dossier/[slug]`): Tabs per design (serif headlines, UPPERCASE labels, tonal surfaces). Integrate graph component (e.g. react-force-graph styled to gold/navy), feed (X + Perplexity results as claims), claims list with provenance.
4. Admin link/embedded views to Directus (or custom forms). "Intelligence Report" button that generates adversarial-vetted briefing.
5. Tests: Design fidelity (compare to preview/ in design/), E2E for flows, Clerk protected routes. Commit frequently.
- **Status:** pending
- **Files:** New `frontend/` or `app/` dir, `design/` imported as foundation, components/pages following design/README.md rules exactly. Extend patterns from OperatorConsole.jsx without copying code.
- **Palantir UX**: Graph view central; reports synthesize cross-refs intelligently; main page as "command center".

### Phase 9: Testing, Verification, Deployment & Governance
- Golden sets for justices/opinions. End-to-end (extraction → correlation → CMS edit → console report).
- Adversarial + groundedness metrics. Human review SLA in Directus.
- Deploy: Local-first (Supabase + Directus + Next + workers), then hosted Supabase + Vercel for frontend, self-hosted Directus.
- Update governance for judicial data (opinions public but analysis sensitive).
- **Status:** pending
- Use verification-before-completion skill before claiming done (run tests, design review, smoke on justices).

## Updated Key Questions
1. Confirm Directus vs Payload after initial POC (theming effort)?
2. Exact Clerk setup (organizations for different GOP entities?).
3. Graph viz library preference (react-force-graph, vis-network, or custom D3 to match design)?
4. Correlation confidence threshold and approval workflow details?
5. X API tier/access status (or start with Perplexity news only)?
6. "Pages" confirmation: Dynamic Next.js routes fed by Directus slugs good?
7. Budget for Perplexity/X usage (model selection to control costs with cheap correlation)?
8. Any specific Supreme Court fields or report templates?

## Updated Decisions Made (Key New Rows)
| Decision | Rationale |
|----------|-----------|
| **Directus for CMS** | Best fit for existing Supabase schema, instant admin/flows/GraphQL, self-hosted, customizable to `@design/`. Enables easy page management + Palantir automation without reinventing. |
| **Perplexity Sonar + abstraction** | One API family per [Sonar models](https://docs.perplexity.ai/docs/sonar/models). Role-based env vars (`CORRELATION_MODEL`, `WRITER_MODEL`, `ADVERSARIAL_MODEL`, `RESEARCH_MODEL` for `sonar-deep-research`-class runs). LLMService keeps a future non-Perplexity swap possible without rewriting call sites. |
| **Adversarial critique loop** | Draft (e.g. `sonar-pro`) → critique (e.g. `sonar-reasoning-pro` + strict prompt) → synthesis + human. Same vendor; different tier and prompt. |
| **Fresh Next.js Operator Console** | Starts clean; strictly applies `@design/` (tonal, editorial, Lucide, no defaults). OperatorConsole as reference only. Clerk for auth. |
| **CorrelationEngine + cheap Sonar tier** | Enables "ALWAYS THINK PALANTIR" — scalable cross-referencing and intelligent reporting without always using the heaviest Sonar tier. Graph + RAG + adversarial = connected insights. |
| **Supreme Court main page + deep dossiers first** | Matches focus. Grid overview + tabbed details with graph/feed delivers Palantir UX immediately. |
| **Self-hosted Directus + local Supabase** | Per your preference. Everything possible local first. |
| **"Pages" = Directus items → dynamic Next routes** | Easy CMS edit/create/replace; slug-based, publish-controlled, triggers backend. |

(Original decisions preserved + extended; e.g. claim-level vault, two-stage now includes adversarial, graph + vectors now powers Palantir correlation.)

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Local `supabase db reset` then Directus `401` on scripts | 1 | Postgres wipe clears Directus users; UI password may not match `cms/.env` `ADMIN_*`. Log in at `http://127.0.0.1:8055`, align credentials, then run `register-app-collections.ps1` with the **same** email/password as the UI. See `plans/04_foundation_supabase_directus.md` post-reset checklist. |

## Notes
- **ALWAYS THINK PALANTIR**: Every phase prioritizes graph, correlation (cheap LLM), cross-references, intelligent synthesis, interactive viz, connected reporting. Re-read this + `plans/02_findings.md` before decisions.
- **Re-read before any work**: `plans/00_task_plan.md`, `plans/02_findings.md`, `plans/03_progress.md`, `@design/README.md`.
- Log every error here with 3-strike protocol. Update statuses after phases. Use planning-with-files hooks.
- **Execution**: Plan is now detailed, bite-sized where possible, TDD-ready, references exact files/skills. Prefer subagent-driven-development for this session (fresh subagent per phase/task with review) or parallel executing-plans session. **Which approach? Start with Phase 5 or 6?**
- Design system non-negotiable for all UI/CMS. Governance/human review critical for judicial/opposition.
- This refines the original backend plan into the full platform you described. Ready for implementation with verification at each step.

1. **Hosting:** Where will the **API + worker** run (single VPS, container pair, split API vs worker tiers)? Same question for **cron** vs in-process scheduling.
2. **Identity:** How do we key “same candidate” across re-scrapes (name normalization, office, district composite)?
3. **Perplexity:** Confirm tier limits / RPM for **each Sonar model** you use (`sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research`, etc.) and daily volume (see `findings.md` + current pricing docs).
4. **Opposition rules:** How is “opposition” determined (party from filing vs manual tag vs race-level)? Who approves **Stage 2** dossiers before internal distribution?
5. **Model eval:** Rubric for **retrieval** (recall of URLs, entity extraction quality) vs **writing** (groundedness, JSON validity, tone) — separate gates for Sonar vs writer promotion.
6. **Graph + RAG:** **Entity resolution** (same person across offices/years)? **Canonical bill IDs** (Utah le.utah.gov)? **Embedding model** and re-embed policy?
7. **Filing calendar:** Exact date window for “daily during filing season” and whether frequency changes off-season.
8. **Job transport:** **Redis + ARQ** vs **Supabase Queues (pgmq)** vs **Celery** — pick per ops constraints (managed Redis? desire for DB-only infra? team familiarity).
9. **Human review:** Exact **SLA / queue tool** (internal admin UI Phase 2 vs spreadsheet vs issue tracker) for opposition outputs — governance depends on it.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Phase 1 = **backend** ETL + intelligence APIs | Frontend consumes APIs later; ship data + jobs + REST first |
| Claim-level `dossier_claims` | Easier Phase 2 rendering and source-level auditing |
| Headless/crawl for official sites | Government pages often dynamic; static HTTP may be insufficient |
| Civic API: elections / voterInfo / divisions only | Representatives API methods turned down — plan supplemental data accordingly |
| Perplexity: `json_schema` response_format | Documented structured output path vs prompt-suffixed JSON only |
| Sonar-only vs multi-vendor | **Product default:** Sonar Chat Completions only ([models](https://docs.perplexity.ai/docs/sonar/models)). Agent API / third-party models are out of scope until explicitly needed. |
| Opposition + GOP routing | Same claims schema; metadata + prompts differentiate use cases |
| Cloudflare vs local Playwright | CF = ops offload + REST/`/json` option; bot signaling + caching + pricing tradeoffs — evaluate per site |
| Two-stage LLM | Sonar = grounded facts (Stage 1); stronger Sonar tier = dossier prose (Stage 2); provenance via `pipeline_stage` |
| Graph + pgvector | Relational edges + `rag_chunks.embedding` prepare for traverse + semantic retrieval without locking a graph DB vendor yet |
| **Backend-first** | FastAPI + worker + Supabase service role; no campaign UI in Phase 1 |
| **Supabase only (no “plain Postgres” app DB)** | **Local Supabase CLI** (`supabase init` / `supabase start`) for dev parity with PostgREST + migrations + Studio; hosted Supabase for prod — avoids drifting to ad-hoc Postgres-only stacks |
| **Local-first database** | Develop against Docker-backed local stack (API `localhost:54321`, DB `54322`, Studio `54323`) before `supabase link` / `db push` to cloud |
| Heavy jobs off request thread | BackgroundTasks for light work only; queue/worker for scrape+LLM per FastAPI guidance |
| **Default worker stack (MVP)** | **ARQ + Redis** for native asyncio + I/O-bound scrape/LLM/embed; **Celery** if org standard or workflow complexity demands; **cron-only** worker acceptable only with **DB leases / idempotency** |
| **Queue semantics** | Assume **at-least-once** delivery; Supabase rows are source of truth for job state and deduplication |
| **Sensitive data exposure** | Prefer **RLS + hardening** for API paths; **private / non-exposed schemas** for highest-risk tables; never ship **`service_role`/secret keys** to clients |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Notes

- Re-read this plan before choosing tools (Playwright vs Firecrawl vs both).
- Log every integration failure in **Errors Encountered** with a new attempt strategy (no exact repeats).
