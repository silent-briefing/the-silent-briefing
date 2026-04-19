# CLAUDE.md — Silent Briefing Project Standards

> **Authoritative reference for all AI agents and contributors.** Re-read before major decisions, new phases, or after any context gap. Always think **Palantir for Utah** — everything that can be referenced together should be, reported intelligently.

---

## Project Identity

**Product:** *The Silent Briefing* — A private, Palantir-style political intelligence platform for Utah. Evidence-first dossiers, judicial watch, entity graph cross-references, adversarial AI analysis, and a premium operator console UI for GOP campaigns, county parties, and aligned PACs.

**North Star:** Think Palantir. Every official, judge, candidate, opinion, bill, issue, and media mention should link to every other relevant entity. Cross-references are not optional — they are the product. Data without correlation is noise.

**Phase 1 (backend):** ETL pipeline → Supabase schema → LLM dossiers via Perplexity. FastAPI + ARQ + Supabase.
**Phase 2 (platform):** Supabase + Directus CMS + Next.js/React operator console + Clerk auth + Palantir graph.

---

## Planning Files

All planning files live in `plans/` with numeric prefixes:

| File | Purpose |
|------|---------|
| `plans/00_task_plan.md` | Backend Phase 1 — ETL/LLM/Supabase schema (original) |
| `plans/01_expanded_silent_briefing_platform_plan.md` | Expanded scope: judicial, CMS, UI, Palantir vision |
| `plans/02_findings.md` | Research: CMS options, judicial sources, AI orchestration, design |
| `plans/03_progress.md` | Session log, test results, decisions |
| `plans/04_foundation_supabase_directus.md` | Foundation: Supabase CLI setup + Directus scaffold |

**Rules for planning files:**
- Re-read relevant plans before major decisions (keeps goals in attention window).
- Update phase status after completing work: `pending → in_progress → complete`.
- Log every error in the relevant plan — never repeat a failed approach.
- Create new plans for major new phases (e.g., `05_operator_console.md`, `06_judicial_watch.md`).

---

## Core Engineering Principles

1. **DRY** — Do not repeat yourself. Shared logic lives in services/libs, never duplicated across files.
2. **SRP** — Single Responsibility Principle. One module = one concern.
3. **YAGNI** — You Aren't Gonna Need It. Do not build abstractions for hypothetical future requirements. Build what is needed now, design for easy extension.
4. **~200 LOC per file** — Aim for files under 200 lines. When a file grows past this, split it. Exceptions: migrations, generated code, config schemas.
5. **Nothing manually created that can be scaffolded.** Use CLI tools. Never hand-write `pyproject.toml`, `package.json`, migration boilerplate, etc.
6. **Modular structure** — Every major concern is its own package/module. Easy to read, review, swap.

---

## Python Standards

**Package manager: `uv` — always, exclusively.**

```bash
# Initialize project
uv init

# Add dependencies
uv add fastapi supabase perplexipy

# Run anything
uv run pytest
uv run python -m briefing.worker baseline-extraction

# Sync deps
uv sync

# NEVER:
pip install <anything>          # Wrong
python -m pip install <anything> # Wrong
manually edit pyproject.toml    # Wrong (use uv add/remove)
poetry add <anything>           # Wrong
```

**Python rules:**
- Python 3.12+. Type hints everywhere (`def foo(x: str) -> dict:`).
- `pydantic` for all config/models. `pydantic-settings` for env config.
- Services in `briefing/services/<concern>/`. Each service one file, one responsibility.
- Workers in `briefing/worker/`. Jobs are async, idempotent, at-least-once safe.
- Tests via `pytest`. Run with `uv run pytest`. Golden sets for LLM output tests.
- Structured JSON logging. Log `job_id`, `candidate_id`, `entity_id` for traceability. Never log API keys (trim to prefix/hash).
- Error handling: log + raise; never swallow silently. 3-strike protocol in plans.

---

## JavaScript / TypeScript Standards

**Runtime: `bun` — always, exclusively (where applicable).**

```bash
# Install
bun install

# Run
bun run dev
bun run build
bun x <tool>     # equivalent of npx

# EXCEPTION: Directus extension scaffold ONLY
npx create-directus-extension@latest   # Directus CLI requires npx — this is the only allowed npx

# NEVER:
npm install      # Wrong
yarn add         # Wrong
node ...         # Wrong (use bun)
```

**TypeScript rules:**
- Strict mode always (`"strict": true` in tsconfig).
- No `any` types — use `unknown` + type guards if needed.
- Prefer named exports over default exports.
- Zod for runtime schema validation in frontends/CMS config.
- File size: ~200 LOC. Split components/hooks/utils aggressively.
- Components in `src/components/<feature>/`. Shared primitives in `src/components/ui/`.

---

## Database — Supabase

**Never use bare Postgres.** Always the Supabase stack.

**Local dev:** `supabase init` → `supabase start` (Docker). DB at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
**Migrations:** `supabase migration new <name>` → edit SQL → `supabase db push` or `supabase db reset`.
**Never:** manually edit `schema.sql` outside migrations. Never run raw ALTER/CREATE in prod without a migration file.
**RLS:** Enable on every user-reachable table. Workers use `service_role` (bypasses RLS — enforce in code for sensitive paths). Never ship `service_role` key to clients.
**pgvector:** Enabled via migration. Embeddings stored in `rag_chunks.embedding`. Similarity search via `match_*` RPCs.

**Official hierarchy schema rules:**
- All humans (candidates, officials, judges) are `officials` linked to `entities`.
- Jurisdiction ladder: `federal → state → county → city → district`.
- Office types: `senator`, `representative`, `governor`, `lt_governor`, `attorney_general`, `mayor`, `city_council`, `county_commissioner`, `county_clerk`, `county_mayor`, `state_supreme_justice`, `state_appellate_judge`, `state_district_judge`, `federal_judge`.
- Judges never have `party` (non-partisan by Utah law). `subject_alignment` for routing: `gop | opposition | neutral | nonpartisan`.
- Non-election years: incumbents are still displayed (from `officials.is_current = true`). Election/retention years: pull candidates/challengers.
- Cross-reference everything: `entity_edges` links officials to bills, opinions, issues, media, other officials.

---

## CMS — Directus

**Self-hosted Directus on existing Supabase Postgres.** Never a separate DB.

**Scaffold:**
```bash
# Main Directus project (use bun equivalent)
bunx create-directus-project@latest cms

# Directus extension scaffold (exception: use npx for this CLI)
npx create-directus-extension@latest
```

**Key rules:**
- Directus connects to the same Supabase Postgres DB via `DB_CLIENT=pg` and direct connection string.
- Schema is owned by Supabase migrations — Directus introspects it, does not own it.
- Directus system tables live in `directus` schema (configure `DB_SCHEMA=directus`), never polluting `public`.
- Custom interfaces/panels must use `@design/` CSS variables (navy/cream/gold, Newsreader+Inter, no borders, Lucide icons).
- Flows (Directus automations) trigger backend worker jobs (LLM refresh, correlation engine) via webhooks on item save/update.
- RBAC in Directus mirrors Supabase RLS roles: admins see all, operators see published content, viewers read-only.
- Extensions in `cms/extensions/`. Each extension one responsibility, ~200 LOC.

---

## Authentication — Clerk

**All user-facing routes protected by Clerk.** Backend uses service keys (Supabase `service_role`).

```bash
# Add Clerk to frontend
bun add @clerk/nextjs

# Environment
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

- Protect operator console routes with Clerk middleware (`authMiddleware`).
- Directus admin protected separately (Directus RBAC — do not expose to Clerk users directly unless building custom integration).
- JWT from Clerk can be validated server-side to scope Supabase RLS queries.

---

## AI & Intelligence Architecture

### Primary Provider: Perplexity

**Perplexity is the one-stop shop for all AI.** One API key, one abstraction.

```
Stage 1 — Evidence gathering:  Perplexity Sonar / Sonar Pro / Sonar Reasoning Pro
Stage 2 — Dossier writing:     Perplexity Agent API (frontier model: Claude 4 class)
Stage 3 — Adversarial review:  Perplexity Agent API (adversarial model: different pedigree, e.g. Grok 4 class)
Stage 4 — Synthesis:           Final pass resolving conflicts; human review queue
```

**Abstraction:** `briefing/services/llm/` contains `LLMService` protocol with methods for `retrieve`, `generate`, `critique`. Swap provider by updating config (`LLM_PROVIDER`, `WRITER_MODEL`, `ADVERSARIAL_MODEL`). Never hardcode provider names in business logic.

### Adversarial Report Architecture

For every final dossier/brief (judicial especially):

1. **Primary analysis pass** — e.g., Claude 4 class (via Perplexity Agent). Produces structured dossier sections grounded in Stage 1 evidence.
2. **Adversarial critique pass** — different pedigree (e.g., Grok 4 class via Perplexity Agent). Prompted to: find contradictions with sources, identify unsubstantiated claims, surface missing cross-references, challenge conclusions. Returns structured critique JSON.
3. **Debate synthesis** — Third call (or orchestrated multi-turn) reconciling primary + adversarial. "Where they agree = high confidence. Where they disagree = flag for human review."
4. **Human review queue** — Flagged items surface in Directus/Console with confidence score, primary claim, adversarial challenge, resolution status.

**Mitigations for adversarial accuracy risks:**
- Adversarial model must also cite Stage 1 sources only.
- Debate stays grounded — no new sources introduced in Stages 2-4.
- Automated `groundedness_score` (citation coverage) computed before human queue.
- Cheap correlation models (Sonar small) for bulk edge extraction; expensive models only for final dossier passes.

### X / Perplexity Feed Integration

- **Perplexity Sonar** for "latest news about Justice Hagen" → structured claim with source.
- **X API v2** (paid/elevated access when available) for direct posts feed. Store as `feed_items` or `dossier_claims` with `pipeline_stage = 'social_x'`.
- Feed items appear in dossier pages as a live tab (Palantir-style: "Latest activity").
- When X access unavailable: fall back to Perplexity for news aggregation. Design the service interface so both are handled by the same `FeedService` with configurable sources.

---

## Frontend / Operator Console

**Framework:** Next.js (App Router) + React + TypeScript. Runtime: `bun`.

**Design system is non-negotiable.** Reference `@design/README.md` before writing any UI code. Key rules:

- Import `design/colors_and_type.css` for all CSS variables — never hardcode color/spacing values.
- Fonts: Newsreader (serif display) + Inter (UI sans). Self-hosted from `design/fonts/`.
- Colors: `--primary` navy `#000f22`, `--surface` cream `#fbf9f5`, `--tertiary` gold `#d4af37`, `--secondary` crimson `#b6191a` (signal only).
- **No-Line Rule:** Do not use `1px solid` borders to separate content. Use tonal surface layering (`--surface-container-low`, `--surface-container-high`, etc.).
- Lucide icons, 1.5px stroke, 16/20/24/32px sizes only.
- Shadows: tinted navy, never gray. `--shadow-sm/md/lg/glow-gold`.
- Cards: `--radius-lg` (8px), shadow-sm at rest, shadow-md on hover, optional 2px `--tertiary` top border for featured.
- Copy: sentence case headlines, UPPERCASE tracked labels (`--label-md` 0.2em tracking), no emoji, no hype words. UTC fixtures (judges by name, not "Subject X").
- Portraits: grayscale at rest, colorize to full on hover (600ms ease).
- Animation: 3 families only — screen enter (opacity+y), list hover (left-accent pinstripe), data reveal (staggered). `prefers-reduced-motion` honored.
- The `design/ui_kits/operator_console/OperatorConsole.jsx` is **reference only** — do not copy directly, use as design guide for layout/patterns.

**Palantir UX patterns to implement:**
- Supreme Court main page: justices grid with key metrics + latest correlations + news feed teaser.
- Dossier pages: `/(judicial|officials|candidates)/[slug]` — full evidence view with claims, sources, graph cross-refs, adversarial flags, feed tab.
- Global search: semantic + entity-aware (Supabase full-text + pgvector).
- Graph view: officials ↔ opinions ↔ bills ↔ issues ↔ coverage. Navy/cream, gold edges on strong links.
- CMS admin: embedded Directus panels (custom-themed) or dedicated `/admin` route behind Clerk.

---

## Repository Structure (Target)

```
/
├── CLAUDE.md                        ← you are here
├── .cursor/rules/                   ← Cursor IDE rules
├── plans/                           ← all planning docs
├── design/                          ← design system (CSS, assets, previews, ui_kits reference)
├── backend/                         ← FastAPI + ARQ workers (Phase 1)
│   └── briefing/
│       ├── api/                     ← thin FastAPI routes
│       ├── worker/                  ← job entrypoints
│       └── services/                ← scrape, llm, db, feeds (SRP, ~200 LOC)
│           ├── llm/                 ← LLMService abstraction + PerplexityClient
│           ├── extraction/
│           ├── persistence/
│           └── feeds/               ← X + Perplexity news aggregation
├── supabase/                        ← Supabase CLI project
│   ├── migrations/                  ← numbered SQL migrations
│   └── seed.sql
├── cms/                             ← Directus project
│   ├── extensions/                  ← custom panels/flows (one per concern, ~200 LOC)
│   └── schema/                      ← Directus schema snapshots (not migrations)
├── console/                         ← Next.js operator console
│   └── src/
│       ├── app/                     ← App Router pages
│       ├── components/              ← by feature, ~200 LOC
│       └── lib/                     ← shared utils/hooks
└── docker-compose.yml               ← local orchestration: Supabase + Directus + backend
```

---

## Environment Variables

Never commit secrets. Use `.env.local` for local dev. Supabase local defaults:
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

DIRECTUS_DB_CONNECTION_STRING=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECTUS_SECRET=<generate with openssl rand -base64 32>

CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

PERPLEXITY_API_KEY=pplx-...
WRITER_MODEL=claude-sonnet-4-5               # primary dossier writer (via Agent API)
ADVERSARIAL_MODEL=grok-4                     # adversarial critique model
CORRELATION_MODEL=sonar                      # cheap model for bulk correlation

X_API_BEARER_TOKEN=...                       # X API v2 (when available)
```

---

## Governance Reminders (Non-Legal)

- Human review gate before distributing opposition or judicial dossiers.
- Retain `source_url` on every claim. No unsubstantiated assertions in final output.
- Adversarial debate logged in `intelligence_runs` with both model outputs + resolution.
- Do not expose `service_role` key in clients. Backend only.
- Before production: legal/compliance sign-off on data sources and outreach.

---

*Last updated: 2026-04-19. Update when major architectural decisions change.*
