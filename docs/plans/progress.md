# Progress — GUI + Admin Programme

> Fresh session log for the GUI programme. Backend Phase 1 history lives in `03_progress.md` (historical). Append one block per working session; never mutate past entries.

---

## 2026-04-20 — Re-plan after GUI gap discovered

**What happened:**
- User flagged that the prior Step 3 + Phase 3 plan (`2026-04-21-step-3-phase-3-cohesive-implementation.md`) contained only a 6-task Next.js skeleton (scaffold, judicial page, dossier shell, search, graph, feed tab) and **zero admin surface**, despite `design/` containing a full editorial system and UI kit for the operator console.
- Scoped the gap with the user. Confirmed: admin must be first-class so operators do not have to touch Directus; Directus moves to sunset.

**Decisions (full rationale in `findings.md`):**
1. Single Next.js app, admin under `/admin` route group.
2. Hybrid data path — `supabase-js` (RLS) for reads + simple writes; FastAPI BFF for admin mutations + orchestration.
3. shadcn/ui + Radix re-themed with design tokens for admin primitives; bespoke components for operator surfaces.
4. Three roles (`admin`, `operator`, `viewer`) via Clerk Organizations.
5. Directus sunset in Phase D after parity audit.

**Files created (`docs/plans/`):**
- `README.md` — plan index, archive status
- `task_plan.md` — master tracker, phases A/B/C/D
- `findings.md` — living decision log
- `progress.md` — this file
- `2026-04-20-gui-phase-a-console-foundation.md`
- `2026-04-20-gui-phase-b-operator-console.md`
- `2026-04-20-gui-phase-c-admin-console.md`
- `2026-04-20-gui-phase-d-directus-sunset.md`

**Files NOT modified (per instruction):** every existing plan in `docs/plans/` is untouched; their status is tracked in the new `README.md`.

**Errors encountered:** none (planning session).

**Next session:** begin Phase A task A.1 (scaffold). Execution mode to be chosen by user: subagent-driven (this session) vs parallel (new session with `executing-plans`).

---

## 2026-04-20 — Bill summarization programme added

**What happened:**
- User requested an AI summary feature for bills with chunking, source-page/line linkage, version tracking, and anti-hallucination guarantees.
- Scoped with user: Utah Legislature only (v1), all versions tracked, hybrid citation (atomic → chunk-level, summaries → section-level), human review required on every bill, scheduled scrape.

**Decisions (delegated to me, recorded in the new plan):**
1. Separate `bill_chunks` schema (not `rag_chunks` reuse) — bills have structure opinions don't (sections, line ranges, version linkage for diffs).
2. Five-stage LLM pipeline: **map → section → rollup → adversarial → synthesis**, with forced claim citation at every stage, substring-verified quotes, cite-integrity retry, groundedness score at every stage. Anti-hallucination in data, not just in prompts.

**Files created:**
- `docs/plans/2026-04-20-bill-summarization.md` — full plan, 22 tasks across 3 phases

**Files modified:**
- `docs/plans/README.md` — added the bill plan as active; updated the plan-graph diagram
- `docs/plans/task_plan.md` — added "Bill Programme Tracker" parallel to the GUI phase tracker

**Files NOT modified** (per user's earlier "don't break existing plans"): every other plan, including the GUI A/B/C/D phase plans. The bill plan cross-references them without editing them.

**Errors encountered:** none (planning session).

**Next session:** choose execution mode for Bill P1 (recommend subagent-driven for backend DB-schema tasks). Bill P1 can run in parallel with GUI Phase A — no file conflicts.

---

## 2026-04-21 — Phase A tranche 1 (A.1–A.3) subagent-driven execution

**Phase / tasks:** A.1 scaffold, A.2 design tokens + Tailwind `@theme`, A.3 Clerk Organizations + three-role middleware + `RoleGate`.

**What shipped:**
- `console/` — Next.js **16.2.4** (current `create-next-app` default; plan text says 15 — noted below), App Router, Tailwind v4, `src/` layout, Bun lockfile.
- Dependencies per plan: `@clerk/nextjs`, `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `@tanstack/react-table`, `zod`, `lucide-react`, `@xyflow/react`; dev: Vitest 4, Playwright, `@axe-core/playwright`, `@vitejs/plugin-react`, `jsdom`.
- **Naming:** npm forbids package name `console`; scaffold used `tsb-operator-console` then renamed folder to `console/`; `package.json` name `silent-briefing-console`.
- Design: `src/styles/tokens.css` re-exports `design/colors_and_type.css`; `globals.css` `@theme` maps palette + radii + shadows + font stacks; `next/font` Newsreader + Inter; home page verifies serif headline + cream surface.
- Auth: `src/middleware.ts` — public `/sign-in`, `/sign-up`, `GET /api/health`; signed-in users default **viewer** when `public_metadata.role` absent; `/admin/*` requires **admin**; denial → `/?denied=admin-required` + structured `role_denied` console.error.
- `src/lib/auth/roles.ts`, `guards.ts`, `RoleGate.tsx`, `roles.test.ts`, `tokens.test.ts` (reads `design/colors_and_type.css` for `--primary: #000f22`).
- Root `.gitignore` — `console/.next`, `console/node_modules`, `console/.env.local`; `console/.env.local.example`; `README.md` console section; `CLAUDE.md` § Authentication updated.

**Verification:**
- `cd console && bun run build` → success (CSS warning: Google Fonts `@import` inside imported design file order — non-fatal).
- `cd console && bun run test` → 13 passed.
- `cd console && bun run lint` → success (required `zod@4` for `eslint-config-next`).

**Errors / notes:**
| Note | Resolution |
|------|------------|
| `create-next-app` rejects project name `console` (npm reserved) | Scaffold to `tsb-operator-console`, rename dir to `console/`. |
| Next 15 vs 16 | Scaffold installs Next 16; aligned with current template. Downgrade to 15 only if CI/product requires it. |
| CSS `@import` order warning | Accept for now; optional follow-up: split `design/colors_and_type.css` or drop duplicate font import when self-hosting WOFF2. |

**Status updates:**
- Phase A tasks **A.1–A.3** implemented in repo; **A.4+** not started (Supabase clients, migrations, shell, shadcn, BFF admin, React Query, CI).

**Next session:** A.4 Supabase browser/server clients + service-role grep guard; A.5 migrations.

---

## 2026-04-21 — Phase A tranche 2 (A.4–A.5) + Next.js 16 `proxy` + dev stability

**Phase / tasks:** A.4 Supabase clients + whoami + no-service-role guard + `types:db`; A.5 GUI tables migration + psycopg RLS tests; fix **`middleware` → `proxy`** deprecation; mitigate **Turbopack panic** + **LAN dev** warnings.

**What shipped:**
- **`src/middleware.ts` deleted** → **`src/proxy.ts`** (same `clerkMiddleware` logic — Next.js 16 convention rename).
- **`package.json`:** `"dev": "next dev --webpack"`; optional `"dev:turbo": "next dev --turbopack"`.
- **`next.config.ts`:** `allowedDevOrigins` includes `192.168.1.211` + env `NEXT_PUBLIC_ALLOWED_DEV_ORIGINS` (comma-separated).
- **Supabase:** `createServerSupabaseClient()` + `useSupabaseBrowser()` (Clerk `supabase` JWT template); `GET /api/whoami` smoke; `scripts/check-no-service-role.mjs`, `scripts/gen-supabase-types.mjs`, `bun run types:db` / `check:secrets`.
- **DB:** `supabase/migrations/20260423120000_gui_support_tables.sql` — `admin_audit_log`, `user_saved_views`, `alerts`, `settings`, `feature_flags` + RLS.
- **Backend:** `uv add psycopg`; `tests/test_rls_gui_tables.py` (4 tests against local Postgres when reachable).

**Verification:**
- `.\scripts\dev-db-migrate.ps1` → migration applied.
- `uv run pytest tests/test_rls_gui_tables.py` → 4 passed.
- `cd console && bun run build && bun run check:secrets && bun run test && bun run lint` → green.

**Next session:** A.6 app shell + route groups.

---

## 2026-04-21 — Phase A tranche 3 (A.6 shell + A.7 shadcn primitives)

**Phase / tasks:** A.6 app shell + operator/admin route groups; A.7 shadcn/ui primitives re-themed + dev storyboard + tests.

**What shipped (A.6 — summary):**
- Route groups `(operator)/` and `(admin)/admin/` with `OperatorShell` / `AdminShell`, `TopBar`, `Sidebar`, `AuditLogFooter`; Lucide 24px nav; gold focus rings; Playwright smoke `e2e/shell.spec.ts` (manual `bun run dev` + `test:e2e`).
- `next.config.ts` `allowedDevOrigins` includes `127.0.0.1`.

**What shipped (A.7):**
- `bunx shadcn@latest init` (base-nova + `@base-ui/react`) + added button, input, label, select, dialog, dropdown-menu, table, tabs, checkbox, switch, popover, command, badge, textarea, input-group, sonner; **`toast.tsx`** re-exports Sonner (`toast` + `Toaster`) because registry deprecated Radix toast.
- **`form.tsx`** — react-hook-form + `@radix-ui/react-slot` (`@hookform/resolvers` + zod).
- **`globals.css`** — removed neutral oklch overrides; single `@theme` maps shadcn semantics to `design/colors_and_type.css` tokens (gold `--ring` / `--color-ring`; tonal `--color-secondary` = surface ladder — avoids clashing with design `--secondary` crimson).
- Focus rings normalized to **2px ring + 4px offset** on interactive primitives; badge pill uses **`rounded-full`**.
- **Dev-only** `/_/primitives` storyboard (`primitives-board.tsx`); **`proxy.ts`** allows `/_/*` without auth in development for axe.
- **`AppProviders`:** `ThemeProvider` (light) + `<Toaster />` for Sonner.
- **Tests:** `src/components/ui/primitives.tokens.test.tsx` (class guards); `vitest.config.ts` `@` alias + `vitest.setup.ts` (jest-dom); `e2e/primitives.spec.ts` (axe critical violations when page reachable).
- **`README.md`** — documents `/_/primitives`.

**Verification:**
- `cd console && bun run build && bun run test && bun run lint` → green.

**Next session:** A.8 BFF admin namespace + Clerk JWT verification (`deps_auth.py`, `/v1/admin/health`, pytest).

---

## 2026-04-21 — Phase A tranche 4 (A.8 BFF auth + operator UI ↔ design kit)

**Phase / tasks:** A.8 Clerk JWT verification + `/v1/admin` namespace; align operator chrome with `design/ui_kits/operator_console` (visual + typography).

**What shipped (A.8):**
- `backend/briefing/config.py` — `clerk_jwt_issuer`, `clerk_jwks_url`.
- `backend/briefing/api/deps_auth.py` — `PyJWKClient`, `decode_clerk_jwt`, `require_clerk_user`, `require_role`, `ClerkUser`, `role_at_least` (viewer / operator / admin).
- `backend/briefing/api/routes/admin/` — `GET /v1/admin/health` → `{ user_id, role }` (admin-only).
- `backend/briefing/api/main.py` — include admin router.
- `backend/tests/test_auth_deps.py` — role matrix + FastAPI dependency overrides (403 viewer / 200 admin).

**What shipped (UI — design kit parity):**
- Sidebar: `--primary-container` + star texture (`operator-chrome.css`), gold right border, shield mark (`/public/branding/shield.svg`), gold active item (left border + tertiary text), footer “Extraction pipeline · Online” pulse.
- Operator top bar: kit-style search strip + bell/clock placeholders + `UserButton` (hero headline moved to page body).
- Briefing home: hero kicker + **Newsreader** display headline (sentence case, italic emphasis), lede, 3 stat cards, priority section placeholder — patterned on `OperatorConsole.jsx` / `operator.css`.
- Root layout: **Inter + Newsreader only** (removed extra Geist variable that fought the design system).
- Playwright `shell.spec.ts` — assert H1 “Salt Lake briefing” instead of old top-bar “Morning brief”.

**Verification:**
- `cd backend && uv run pytest -q` → 53 passed.
- `cd console && bun run build && bun run test && bun run lint` → green.

**Next session:** A.9 React Query + BFF client (`lib/bff/client.ts`) + audit stub; optional real JWKS integration test once Clerk env is set locally.

---

## Template for future entries

```markdown
## YYYY-MM-DD — <short title>

**Phase / tasks:** <e.g. A.3 Clerk orgs + roles>

**What shipped:**
- <file created/modified with one-line why>

**Verification:**
- <command> → <expected output>

**Errors:**
| Error | Attempt | Resolution |
|---|---|---|

**Status updates:**
- task_plan.md Phase X task Y: pending → in_progress / complete

**Next session:** <what's next>
```
