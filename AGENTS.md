## Learned User Preferences

- Keep planning working files (`task_plan.md`, `findings.md`, `progress.md`) in the project `plans/` directory.
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