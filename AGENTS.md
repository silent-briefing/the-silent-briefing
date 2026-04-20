## Learned User Preferences

- Keep planning working files in `plans/` (`00_task_plan.md` for numbered steps and current phase, `findings.md`, `progress.md`; expanded roadmap in `01_expanded_silent_briefing_platform_plan.md`).
- Prefer Clerk over Supabase Auth when choosing an authentication provider.
- For product UX and information architecture, aim for Palantir-style integration and cross-referencing between related entities.
- Initial domain emphasis: United States Supreme Court (a hub for justices with supporting context and news).
- Design news and research integrations around X (Twitter) and Perplexity as primary external sources.
- Prefer self-hosted development infrastructure except where an external dependency is unavoidable.
- For Python in this repo, use `uv` (`uv add`, `uv sync`, `uv run`) rather than ad-hoc virtualenv and pip workflows.
- Prefer scaffolding for Directus and Supabase (for example `npx create-directus-extension@latest`, Supabase CLI, and Supabase MCP) instead of hand-writing boilerplate that tools generate.

## Learned Workspace Facts

- GitHub organization for this repository: `silent-briefing`.
- Local Supabase in this project commonly uses API `http://127.0.0.1:54321`, Postgres on `127.0.0.1:54322`, and Studio on `http://127.0.0.1:54323`.
- Recent Supabase CLI releases print Publishable/Secret-style keys from `supabase status` rather than legacy JWT-shaped anon/service strings; client code and environment variables may need to align with that format.
- Directus 11 connecting to local Supabase Postgres often uses the `postgres` database user for local development to avoid bootstrap issues seen with a restricted `directus_user` role; migrations may still define `directus_user` for production-like setups.
- Foundation layout includes `supabase/migrations/`, `docker-compose.yml` for Directus, `cms/` for Directus configuration and extensions/schema artifacts, and a FastAPI package under `backend/briefing/` exposing `POST /v1/intelligence/refresh` as a stub for CMS-triggered work.
- Directus loads local extensions only from immediate subfolders of `cms/extensions/`, each with its own `package.json`; nested layouts like `cms/extensions/themes/<name>` or `cms/extensions/hooks/<name>` are not discovered because the parent directory is not a valid extension package.
- Directus theme extensions declare one `appearance` each (`light` or `dark`); matching Studio mode requires a separate extension per appearance (this repo: **Silent Briefing** for light, **Silent Briefing (Dark)** for dark).
- Directus Insights starts from an empty “No Dashboards” state until you create a dashboard; custom panels (for example official intelligence refresh) are added inside a dashboard layout, not from the Insights landing page alone.
- Supabase/Directus foundation work (local CLI, migrations, Docker, hooks) is tracked task-by-task in `plans/04_foundation_supabase_directus.md` (Phase 0 there).
- Configurable **source URLs** (vote.utah, SLCO, utcourts, Ballotpedia, Google Civic) default in `backend/briefing/defaults/source_urls.py` and override via matching `UPPER_SNAKE` env vars on `Settings` (see `CLAUDE.md` Environment Variables).
- **Step 3 staged retrieval** lives under `backend/briefing/services/intelligence/`: `evidence_bundle.py` (Pydantic + Sonar JSON schema), `retrieval_stages.py` (A/B/C passes → `dossier_claims` with `category` `Research / Stage *` and `metadata.evidence_bundle`), `dossier_writer.py` (latest bundles + optional `match_rag_chunks_public` → `writer_sonar` claim `Dossier / Draft`). Workers: `python -m briefing.worker retrieval-pass`, `dossier-write`. Env: `RETRIEVAL_MODEL` (default `sonar`) alongside existing `WRITER_MODEL` / `CORRELATION_MODEL`.