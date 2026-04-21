# Phase D — Directus Sunset

> **For Claude:** REQUIRED SUB-SKILL: `superpowers:executing-plans`. **Depends on Phase C exit gate**. This phase is deliberately small and reversible — every step is its own commit and the full removal is one revertable commit.

**Goal:** Verify the admin console has full functional parity with Directus for every concern we actually used, then decommission Directus cleanly.

**Architecture:** No new architecture — subtraction. App tables stay schema-owned by Supabase migrations (always were). Directus's own metadata schema gets dropped. `cms/` tree is removed. CI stops running Directus sync scripts. Documentation repoints operators to `/admin`.

**Tech Stack:** Supabase CLI, `docker compose`, git.

**Read first:**
- `docs/plans/findings.md` §5
- `CLAUDE.md` § CMS — Directus (authoritative list of what Directus was doing)
- `docs/plans/04_foundation_supabase_directus.md` (runbook — the parts we're decommissioning)
- `cms/scripts/register-app-collections.*` (what collections Directus was tracking — one-to-one with our parity audit)

---

## Task D.1 — Parity audit

**Files:**
- Create: `docs/plans/2026-04-20-directus-parity-audit.md` (audit artifact; preserves the comparison for history)

**Process:**

| Directus capability | Admin-console equivalent | Status |
|---|---|---|
| Content browsing (`officials`, `jurisdictions`, `dossier_claims`, `entity_edges`, `rag_chunks`, `intelligence_runs`) | Admin tables in C.2–C.5, C.8, C.10 | verify each renders and paginates |
| Item create/edit | Admin forms in C.2, C.3, C.8, C.9 | verify |
| Flow: PATCH `officials` → `POST /v1/intelligence/refresh` | Admin "Trigger run" in C.4 + automatic trigger on PATCH | verify |
| Role-based access | Clerk roles + RLS + BFF guard | verify |
| Themed UI | Admin console design-token adherence | verify |
| Schema introspection | n/a (admin uses generated types from Supabase migrations) | n/a |
| Bulk operations | TanStack Table multi-select + BFF batch endpoints where they exist (C.5 accept batch) | verify per concern; gaps documented |
| API Tokens / external integrations | **gap**: if anyone was using Directus's REST API externally, replace with FastAPI BFF (Clerk JWT) or a new Supabase service-role-only internal-use endpoint | document any callers |

**Step 1:** Walk each row in person (or subagent); screenshot or record cmd output where helpful. Any "verify" row that fails blocks D.2 until the corresponding Phase C task is patched.

**Step 2:** Record results in the audit artifact; link from `progress.md`.

**Step 3:** Commit: `docs: Directus → admin console parity audit`.

---

## Task D.2 — Announce decommission window

**Files:**
- Modify: `README.md` — "Directus decommission scheduled — admin console is authoritative" note
- Modify: `CLAUDE.md` § CMS — flag section as "historical after D.4"

**Step 1:** Commit: `docs: announce Directus decommission`.

---

## Task D.3 — Disable Directus in dev orchestration

**Files:**
- Modify: `docker-compose.yml` — comment-out the `directus` service (keep the block, prefix with `# DEPRECATED per Phase D; remove in D.5`)
- Modify: `scripts/dev-db-migrate.sh` / `.ps1` — remove call to `cms/scripts/sync-directus-after-migration.*`
- Modify: `scripts/dev-db-reset.sh` / `.ps1` — remove Directus repair path (or guard behind `ENABLE_DIRECTUS=1` for break-glass)

**Step 1:** Commit: `chore: disable Directus in dev orchestration (still present, dormant)`.

**Step 2:** Run `.\scripts\dev-db-migrate.ps1` on a clean DB to confirm nothing breaks without Directus repair.

---

## Task D.4 — Drop Directus schema (migration)

**Files:**
- Create: `supabase/migrations/<timestamp>_drop_directus_schema.sql`

**Content:**
```sql
-- Directus owned its own metadata schema; app data was in public and is untouched.
drop schema if exists directus cascade;
```

**Step 1:** Apply with `.\scripts\dev-db-migrate.ps1`.

**Step 2:** Verify `public.officials` et al. unaffected (spot-check SELECT counts before + after).

**Step 3:** Commit: `feat(db): drop directus schema`.

---

## Task D.5 — Remove Directus from the tree

**Files (delete):**
- `cms/` (entire directory)
- `docker-compose.yml` — remove the Directus block entirely (not just comment)
- `scripts/` references to Directus — delete any Directus-only scripts
- `.github/workflows/` — remove Directus-specific jobs if any

**Files (modify):**
- `CLAUDE.md` — replace the "CMS — Directus" section with a one-paragraph historical note pointing to `docs/plans/2026-04-20-gui-phase-d-directus-sunset.md` and the admin console
- `AGENTS.md` — remove stale Directus facts; add "Directus retired on <date>, admin console is authoritative"
- `.cursor/rules/supabase-directus.mdc` — split: keep Supabase part, remove Directus rules; rename to `.cursor/rules/supabase.mdc` (or inline into `python.mdc` / `typescript.mdc`)
- `docs/plans/README.md` — mark `04_foundation_supabase_directus.md` as fully historical
- `docs/plans/task_plan.md` — Phase D complete

**Step 1:** One focused commit for maximum revertability:
```
chore(directus): sunset — remove cms/, compose entry, scripts, and docs refs

Admin console has parity (see docs/plans/2026-04-20-directus-parity-audit.md).
Revertable via `git revert <this sha>` if a gap surfaces post-merge.
```

**Step 2:** Smoke test: fresh clone → `bun install && bun run dev` (console) and `uv sync && uv run pytest` (backend) → no Directus references, all green.

---

## Task D.6 — Progress + learnings

**Files:**
- Modify: `docs/plans/progress.md` — Phase D entry with date + audit-artifact link + commit SHAs for each step
- Append to `docs/plans/findings.md` §5 — "Directus decommissioned on <date>; rollback commit: `<sha>` if needed"

**Step 1:** Commit: `docs: Phase D Directus sunset complete`.

---

## Phase D exit gate

1. Parity audit artifact committed; every "verify" row passes.
2. Fresh clone of the repo has no `cms/` directory; `rg -n "directus" --type-add 'all:*' -tall` returns only historical plan files + audit artifact + `findings.md §5`.
3. `.\scripts\dev-db-reset.ps1` + `.\scripts\dev-db-migrate.ps1` both run clean without Directus.
4. Admin console renders and handles every former Directus concern under a single role-gated domain.
5. Rollback path documented (revert single commit from D.5 + re-apply `cms/scripts/sync-directus-after-supabase-reset.*`).

---

## Rollback note

If Phase D surfaces a parity gap post-merge:
1. `git revert <D.5 sha>` restores `cms/`, compose entry, scripts, rules, docs.
2. Re-run `.\scripts\dev-db-reset.ps1` to re-bootstrap Directus (`KEY`/`SECRET` from `cms/.env` still valid).
3. Open a new plan: `docs/plans/YYYY-MM-DD-directus-restore-<reason>.md` explaining what was missing and how to close the gap before retrying D.
4. Keep `supabase/migrations/<timestamp>_drop_directus_schema.sql` reverted via a follow-up `down`-style migration (or re-bootstrap will recreate Directus's schema).
