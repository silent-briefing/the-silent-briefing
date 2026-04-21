# Phase A — Console Foundation

> **For Claude:** REQUIRED SUB-SKILL: `superpowers:executing-plans` (new session) or `superpowers:subagent-driven-development` (this session). Execute tasks **in order** — later tasks assume earlier ones. Re-read `docs/plans/task_plan.md` and `docs/plans/findings.md` before each task.

**Goal:** Stand up the Next.js 15 operator console foundation: auth (Clerk Orgs + 3 roles), data access (Supabase via Clerk JWT + BFF), design-token-faithful primitives, role-aware middleware, audit log table, feature flags, and CI. Everything Phases B and C need is landed and tested.

**Architecture:** Single Bun-managed Next.js 15 App Router app at `console/` at repo root. Tailwind v4 `@theme` binds `design/colors_and_type.css` tokens as utilities. Clerk Organizations on; `public_metadata.role` stores app role. Two Supabase clients: browser (`supabase-js` with Clerk JWT) and server (`@supabase/ssr`). FastAPI BFF extended with `/v1/admin/*` namespace protected by Clerk JWT verification. New Supabase migrations add `admin_audit_log`, `user_saved_views`, `alerts`, `settings` tables with RLS.

**Tech Stack:** Bun, Next.js 15, TypeScript strict, Tailwind v4, `@clerk/nextjs` v6 (Organizations), `@supabase/ssr` + `supabase-js`, shadcn/ui (copy-in), Radix primitives, `@tanstack/react-query`, Zod, Vitest, Playwright, axe-core, Lighthouse CI. Backend: `uv`, FastAPI, `respx`, `pyjwt` (Clerk JWT verification).

**Read first:**
- `CLAUDE.md` (engineering + auth + design rules)
- `docs/plans/task_plan.md` (phase tracker)
- `docs/plans/findings.md` §1–§7
- `design/README.md` (full) + `design/colors_and_type.css`
- `docs/plans/04_foundation_supabase_directus.md` § Clerk + Supabase JWT (runbook for the template)
- `backend/briefing/api/routes/console.py` (existing BFF we extend)

---

## Task A.1 — Scaffold Next.js 15 app

**Files:**
- Create: `console/` (via `bunx create-next-app@latest`)
- Create: `console/.env.local.example`
- Modify: root `README.md` — Console section (how to run)
- Modify: `.gitignore` — `console/.next`, `console/node_modules`, `console/.env.local`

**Step 1:** From repo root, run `bunx create-next-app@latest console --typescript --tailwind --app --src-dir --import-alias "@/*" --use-bun --no-eslint` and accept defaults otherwise. Expected: new `console/` tree with Tailwind v4 + App Router.

**Step 2:** `cd console && bun add @clerk/nextjs @supabase/ssr @supabase/supabase-js @tanstack/react-query @tanstack/react-table zod lucide-react @xyflow/react`.

**Step 3:** `cd console && bun add -d vitest @vitest/ui @playwright/test @axe-core/playwright`.

**Step 4:** Record resolved versions in `docs/plans/progress.md` under today's entry.

**Step 5:** Run: `cd console && bun run dev`. Open http://localhost:3000. Expected: Next.js default page.

**Step 6:** Commit: `feat(console): scaffold Next.js 15 + Clerk + Supabase + design deps`.

---

## Task A.2 — Design tokens + Tailwind v4 `@theme`

**Files:**
- Create: `console/src/styles/tokens.css` (re-exports `design/colors_and_type.css`)
- Modify: `console/src/app/globals.css` — import tokens + Tailwind `@theme` block mapping tokens to utility keys
- Create: `console/src/styles/fonts.css` — `@font-face` from `design/fonts/` (self-hosted Newsreader + Inter WOFF2)
- Modify: `console/tailwind.config.ts` or `console/src/app/globals.css` (v4 prefers CSS-side config)

**Step 1:** Copy `design/colors_and_type.css` contents into `console/src/styles/tokens.css` via `@import "../../../design/colors_and_type.css";` (relative path) so the source stays single. If relative import breaks in Next/Turbopack, fall back to a build-time copy script `console/scripts/sync-tokens.mjs` and call from `predev`/`prebuild`.

**Step 2:** In `globals.css`:
```css
@import "tailwindcss";
@import "./styles/tokens.css";
@import "./styles/fonts.css";

@theme {
  --color-primary: var(--primary);
  --color-surface: var(--surface);
  --color-tertiary: var(--tertiary);
  --color-secondary: var(--secondary);
  --color-surface-1: var(--surface-container-low);
  --color-surface-2: var(--surface-container);
  --color-surface-3: var(--surface-container-high);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --font-serif: "Newsreader", Georgia, serif;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

**Step 3:** Replace `app/page.tsx` default content with a single `<main>` that renders a Newsreader heading ("The Silent Briefing") and an Inter paragraph to visually verify tokens.

**Step 4:** Run `bun run dev`; confirm serif + cream background.

**Step 5:** Add Vitest test `console/src/styles/tokens.test.ts` that imports `tokens.css` as a string and asserts `--primary: #000f22` (regex match) — guards against accidental token drift.

**Step 6:** Commit: `feat(console): bind design tokens via Tailwind v4 @theme`.

---

## Task A.3 — Clerk with Organizations + three-role model

**Files:**
- Create: `console/src/middleware.ts`
- Create: `console/src/lib/auth/roles.ts`
- Create: `console/src/lib/auth/guards.ts`
- Create: `console/src/components/auth/RoleGate.tsx`
- Modify: `console/src/app/layout.tsx` — wrap with `<ClerkProvider>`
- Modify: `console/.env.local.example` — Clerk keys
- Modify: `CLAUDE.md` § Authentication — note Organizations on + role metadata schema

**Step 1:** Follow Clerk Next.js quickstart (use `clerk:setup` skill if available): enable Organizations in Clerk Dashboard; create JWT template named **`supabase`** matching `docs/plans/04_foundation_supabase_directus.md` § Clerk JWT (claims: `role`, `org_id`, `sub`, `aud: "authenticated"`).

**Step 2:** `roles.ts`:
```ts
export const ROLES = ["admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export function roleAtLeast(actual: Role | undefined, required: Role): boolean {
  const order: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
  if (!actual) return false;
  return order[actual] >= order[required];
}
```

**Step 3:** `middleware.ts` with `clerkMiddleware`:
- Public: `/sign-in`, `/sign-up`, `/api/health`
- `viewer+`: everything else under `/`
- `admin`: `/admin/*`, `/api/admin/*`
- On role denial: `redirect` to `/` with `?denied=admin-required` and log a structured `role_denied` event to console.error (wired to observability later).

**Step 4:** `RoleGate.tsx` — client component that hides children when `useUser().user.publicMetadata.role` < required. Belt-and-braces only; never the sole auth boundary.

**Step 5:** Write a Vitest test for `roleAtLeast` covering all 9 permutations.

**Step 6:** Manual verify: sign in as a test user with `public_metadata.role = "operator"`; `/admin` redirects. Flip to `admin`; `/admin` loads (will 404 until A.6 scaffolds the route group — that's fine, the 404 proves middleware passed).

**Step 7:** Commit: `feat(console): Clerk Organizations + role middleware + RoleGate`.

---

## Task A.4 — Supabase clients (browser + server) with Clerk JWT

**Files:**
- Create: `console/src/lib/supabase/browser.ts`
- Create: `console/src/lib/supabase/server.ts`
- Create: `console/src/lib/supabase/types.ts` (generated types target)
- Create: `console/scripts/gen-supabase-types.sh` (wraps `supabase gen types typescript --local > src/lib/supabase/types.ts`)
- Modify: `console/package.json` — `scripts.types:db`

**Step 1:** `browser.ts` — `createBrowserClient` from `@supabase/ssr`; pulls Clerk session token via `window.Clerk.session?.getToken({ template: 'supabase' })` in an `accessToken` getter.

**Step 2:** `server.ts` — `createServerClient` from `@supabase/ssr`, reads Clerk session via `auth().getToken({ template: 'supabase' })`, wires cookies helper per `@supabase/ssr` App Router guide.

**Step 3:** Add ESLint rule (or a simple `scripts/check-service-role.mjs` run in CI) that greps `console/src/**/*.{ts,tsx}` for `SERVICE_ROLE` / `service_role` and fails the build if found.

**Step 4:** Run `bun run types:db` once Supabase local is up; commit generated `types.ts`.

**Step 5:** Smoke test: create `app/api/whoami/route.ts` that uses `server.ts` and returns `auth.uid()`. Sign in, hit it, confirm Clerk user id returned.

**Step 6:** Commit: `feat(console): Supabase browser + server clients via Clerk JWT`.

---

## Task A.5 — Core admin/app tables + RLS (migration)

**Files:**
- Create: `supabase/migrations/<timestamp>_gui_support_tables.sql`
- Test: `backend/tests/test_rls_gui_tables.py` (psycopg checks via `service_role` and simulated `authenticated`)

**Tables:**
- `admin_audit_log` — `id uuid pk`, `actor_user_id text` (Clerk id), `actor_role text`, `org_id text`, `action text`, `target_type text`, `target_id text`, `before jsonb`, `after jsonb`, `created_at timestamptz default now()`. RLS: insert by `service_role` only; select by role `admin`.
- `user_saved_views` — `id uuid pk`, `user_id text`, `org_id text`, `name text`, `kind text` (`officials`|`dossier`|`search`), `query jsonb`, `created_at`. RLS: owner + org admins.
- `alerts` — `id uuid pk`, `org_id text`, `kind text`, `target_type text`, `target_id text`, `payload jsonb`, `delivered_at`, `read_at`. RLS: org members.
- `settings` — `key text pk`, `value jsonb`, `updated_at`, `updated_by`. RLS: read authenticated, write `service_role` only.
- `feature_flags` — `key text pk`, `enabled_for jsonb` (e.g. `{"all": true}` or `{"orgs": ["org_abc"]}`). Same RLS as `settings`.

**Step 1:** Write the migration with `(select auth.uid())` and `(select (auth.jwt() ->> 'org_id'))` patterns per Supabase RLS perf guide.

**Step 2:** `.\scripts\dev-db-migrate.ps1` — apply.

**Step 3:** Write pytest in `backend/tests/test_rls_gui_tables.py` using two psycopg connections (service role + a JWT-mock role) to verify policy matrix.

**Step 4:** `cd backend && uv run pytest tests/test_rls_gui_tables.py -q` → expect pass.

**Step 5:** Commit: `feat(db): admin audit log, saved views, alerts, settings, flags`.

---

## Task A.6 — App shell + route groups

**Files:**
- Create: `console/src/app/layout.tsx` (wrap ClerkProvider + QueryClientProvider + design-token font vars on `<body>`)
- Create: `console/src/app/(operator)/layout.tsx` — operator chrome (sidebar, top bar per `design/ui_kits/operator_console/OperatorConsole.jsx` intent; do not copy code)
- Create: `console/src/app/(operator)/page.tsx` — placeholder Briefing home (Phase B fills it)
- Create: `console/src/app/(admin)/admin/layout.tsx` — admin chrome (distinct top bar with "ADMIN" UPPERCASE tracked label in gold; sidebar lists admin concerns)
- Create: `console/src/app/(admin)/admin/page.tsx` — placeholder admin dashboard
- Create: `console/src/components/chrome/Sidebar.tsx`
- Create: `console/src/components/chrome/TopBar.tsx`
- Create: `console/src/components/chrome/AuditLogFooter.tsx` (32px navy footer with mono tracked microlabels — per design)

**Constraints:**
- Every chrome component ≤ 200 LOC.
- No 1px solid borders for section breaks — tonal surface only (cream `--surface` main, `--surface-container-low` cards, navy `--primary` sidebar).
- Focus ring gold 2px / 4px offset.
- Sidebar icons from Lucide 24px; nav labels UPPERCASE 0.2em tracked.

**Step 1:** Build chrome components; render shells in each group layout.

**Step 2:** Playwright smoke: sign-in as operator → hits `/` → shows operator chrome; sign-in as admin → hits `/admin` → shows admin chrome; operator hitting `/admin` → redirected.

**Step 3:** Commit: `feat(console): app shell + operator/admin route groups`.

---

## Task A.7 — Shadcn primitives, re-themed

**Files:**
- Create: `console/src/components/ui/button.tsx`
- Create: `console/src/components/ui/input.tsx`
- Create: `console/src/components/ui/label.tsx`
- Create: `console/src/components/ui/select.tsx`
- Create: `console/src/components/ui/dialog.tsx`
- Create: `console/src/components/ui/dropdown-menu.tsx`
- Create: `console/src/components/ui/table.tsx` (shell only; TanStack table wraps)
- Create: `console/src/components/ui/form.tsx` (react-hook-form + Zod wiring)
- Create: `console/src/components/ui/toast.tsx`
- Create: `console/src/components/ui/tabs.tsx`
- Create: `console/src/components/ui/checkbox.tsx`
- Create: `console/src/components/ui/switch.tsx`
- Create: `console/src/components/ui/popover.tsx`
- Create: `console/src/components/ui/command.tsx`
- Create: `console/src/components/ui/badge.tsx` (pill chip — the one rounded-full exception)

**Process per primitive:**
1. Copy shadcn source (`bunx shadcn@latest add <name>` — uses Bun).
2. Open the file; strip all class names that reference `gray-*`, `blue-*`, `slate-*`, `ring-*` defaults.
3. Rewire with design tokens via Tailwind utilities (`bg-surface`, `bg-surface-1`, `text-primary`, `border-[rgba(0,15,34,0.08)]`, `focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-4`).
4. Replace `rounded-md` → `rounded-[var(--radius-md)]`.
5. Replace `shadow-*` → `shadow-[var(--shadow-sm)]` etc.
6. Run axe in Playwright against a storyboard page (`/_/primitives` — dev-only) that renders each primitive.

**Step 1:** Scaffold + rewire all 15 primitives.

**Step 2:** Vitest: render test for each primitive asserting it applies token-backed utilities (snapshot on class list is acceptable).

**Step 3:** Commit: `feat(console): shadcn primitives re-themed with design tokens`.

---

## Task A.8 — BFF admin namespace + Clerk JWT verification

**Files:**
- Create: `backend/briefing/api/deps_auth.py` — `require_clerk_user`, `require_role`
- Create: `backend/briefing/api/routes/admin/__init__.py` — mounts `/v1/admin` router
- Create: `backend/briefing/api/routes/admin/health.py` — `GET /v1/admin/health` returns `{role, user_id}` (smoke for auth)
- Modify: `backend/briefing/api/main.py` — include admin router
- Modify: `backend/briefing/config.py` — `CLERK_JWT_ISSUER`, `CLERK_JWKS_URL`
- Create: `backend/tests/test_auth_deps.py`

**Step 1:** `uv add pyjwt cryptography`.

**Step 2:** `deps_auth.py`: fetch and cache JWKS from `CLERK_JWKS_URL`; verify `Authorization: Bearer <token>`; extract `sub`, `role` (from public_metadata claim), `org_id`. `require_role(role)` dependency.

**Step 3:** Test with `respx` mocking JWKS + hand-signed JWT (test keys).

**Step 4:** `cd backend && uv run pytest tests/test_auth_deps.py -q` → pass.

**Step 5:** Smoke from console: server action calls `/v1/admin/health` with Clerk token → returns role. Operator gets 403. Admin gets 200.

**Step 6:** Commit: `feat(api): Clerk JWT verification + /v1/admin namespace`.

---

## Task A.9 — React Query provider + BFF client + audit-log helper

**Files:**
- Create: `console/src/lib/query/provider.tsx` — QueryClientProvider
- Create: `console/src/lib/bff/client.ts` — fetch wrapper adding Clerk token
- Create: `console/src/lib/bff/audit.ts` — helper for admin mutations that writes an `admin_audit_log` entry via BFF
- Modify: `console/src/app/layout.tsx` — mount provider

**Step 1:** Client wrapper validates responses with Zod (per-route schemas in `bff/schemas/`).

**Step 2:** Server-side audit helper called by every admin BFF route (implemented fully in Phase C; here we stub the signature + unit test).

**Step 3:** Commit: `feat(console): React Query provider + BFF client with Clerk token`.

---

## Task A.10 — CI

**Files:**
- Create: `.github/workflows/gui-ci.yml`
- Modify: root `README.md` — CI section

**Jobs:**
1. `console-typecheck-lint` — `bun install && bun run typecheck && bun run lint`
2. `console-unit` — `bun run test` (Vitest)
3. `console-e2e` — Playwright against `bun run build && bun run start`, with a seeded Supabase local + mocked Clerk (use Clerk test tokens)
4. `console-a11y` — `axe` in Playwright against `/`, `/judicial/supreme-court` (stub), `/admin` (stub)
5. `console-lighthouse` — Lighthouse CI on the same routes; budget assertions per `findings.md §8`
6. `console-no-service-role` — grep check from A.4 step 3
7. `backend-pytest` — ensure existing + new backend tests pass

**Step 1:** Write workflow. Use matrix on Node-free Bun setup (`oven-sh/setup-bun`).

**Step 2:** Push branch; verify all jobs green.

**Step 3:** Commit: `ci: GUI typecheck + tests + a11y + lighthouse + service-role guard`.

---

## Task A.11 — Docs

**Files:**
- Modify: root `README.md` — Console section (install, dev, test, build)
- Modify: `CLAUDE.md` § Frontend — record A-phase decisions (Clerk Orgs, 3 roles, hybrid data path, shadcn re-themed)
- Modify: `AGENTS.md` — learned facts from Phase A
- Modify: `docs/plans/progress.md` — Phase A completion entry
- Modify: `docs/plans/task_plan.md` — Phase A status → complete

**Step 1:** Write docs, commit.

**Step 2:** Commit: `docs: Phase A foundation complete`.

---

## Phase A exit gate (all must pass before starting B or C)

1. `bun run dev` → `/` loads with design tokens, Newsreader serif headline, cream background.
2. Sign in (Clerk) as operator → `/` shows operator chrome; `/admin` redirects with `?denied=admin-required`.
3. Promote same user to admin in Clerk → `/admin` loads admin chrome.
4. `console/src/**` contains zero `SERVICE_ROLE` strings (CI guard).
5. `cd backend && uv run pytest` → all green (new `test_auth_deps.py`, `test_rls_gui_tables.py` included).
6. `cd console && bun run build` → success; `bun run test` → green; Playwright smoke → green; axe → 0 violations on rendered shells; Lighthouse → budgets met.
7. `gui-ci.yml` all jobs green on the merge commit.

Record gate verification in `progress.md` with command outputs (verification-before-completion).
