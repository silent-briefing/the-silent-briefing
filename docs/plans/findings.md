# Findings — GUI + Admin Programme

> Living document. Append new findings; never delete. Cite sources. Every finding should be actionable or explain a decision.

---

## §1 — Admin location: single app, `/admin` route group

**Decision:** one Next.js 15 app under `console/`; admin lives at `/admin/*` inside it, gated by Clerk middleware + role check.

**Why:**
- **Design coherence.** Operator and admin share the design system (`design/colors_and_type.css`). Duplicating tokens/fonts/icons across two apps invites drift.
- **Auth simplicity.** One Clerk app, one Supabase client, one JWT template, one middleware. Splitting means two Clerk "applications" or shared secrets across apps — both worse.
- **Shared primitives.** Admin forms validate against the same Zod schemas used to render operator cards. Cross-app imports would force a package extraction we don't need yet (YAGNI).
- **~200 LOC/file rule is unaffected.** The constraint is per-file, not per-repo.
- **Blast radius is a route-group concern, not a process concern.** `app/(admin)/admin/*` can have its own `layout.tsx`, its own error boundaries, its own feature flags. Middleware denies non-admins before any admin code loads.

**Rejected:** monorepo with `apps/console` + `apps/admin`. Reconsider only when (a) deploy cadence diverges materially, (b) a non-TypeScript admin is needed, or (c) team size forces code-owner separation.

**Source:** 2026-04-20 scoping session with product owner.

---

## §2 — Data path: hybrid (Supabase-js for reads/simple writes, FastAPI BFF for orchestration)

**Decision:**

| Operation class | Path | Auth |
|---|---|---|
| Operator reads (lists, dossier views, search) | `supabase-js` from RSC/Server Action | Clerk JWT → Supabase `authenticated` role + RLS |
| Operator simple writes (bookmarks, saved views) | `supabase-js` from Server Action | Clerk JWT + RLS |
| Admin reads (queues, tables) | `supabase-js` with `admin` role-check in RLS | Clerk JWT + RLS |
| Admin CRUD (officials, opinions, media, correlations) | FastAPI BFF `/v1/admin/*` | Clerk JWT verified server-side by FastAPI; FastAPI uses `service_role` |
| Orchestration (`retrieval-pass`, `dossier-write`, `adversarial-dossier`, `correlation-pass`) | FastAPI BFF `/v1/admin/runs/*` | same |
| Semantic search RPC | FastAPI BFF | `service_role` (RPC grant scope tight) |
| Feed fetches (X, Perplexity) | FastAPI BFF `/v1/feeds/*` | `service_role` |

**Why:**
- **U3.5 already landed** the `authenticated` RLS tranche (`supabase/migrations/20260422103000_authenticated_console_reads.sql`). Reads should use it — less code, RLS proves access.
- **U3.6 already landed** the BFF (`backend/briefing/api/routes/console.py`). Mutations and orchestration extend it cleanly.
- **Service-role stays server-side.** Admin mutations often need to touch tables that are read-only to `authenticated` (e.g. `dossier_claims` publish, `entity_edges.status` transitions). Routing those through FastAPI keeps the key off the browser and gives us one place to audit-log.
- **Clerk→FastAPI JWT verification** uses the same JWKS Clerk→Supabase uses (`CLERK_JWT_ISSUER`). Backend helper added in Phase C.1.

**Rejected:**
- *BFF-only:* too much plumbing for reads that RLS already gates correctly.
- *Supabase-js everywhere:* either requires handing `service_role` to the browser (no), or broadening RLS so much that `authenticated` effectively becomes admin.

**Source:** 2026-04-20 scoping + current repo state.

---

## §3 — Admin UI components: shadcn/ui + Radix, re-themed with design tokens

**Decision:** copy shadcn/ui primitives into `console/src/components/ui/` (Button, Input, Select, Dialog, DropdownMenu, Table shell, Form, Toast, Tabs, Toggle, Switch, Checkbox, Popover, Command), then **strip SaaS defaults and rebind every token to `design/colors_and_type.css`**:

- Remove `rounded-md` / `rounded-full` defaults; use `--radius-md` (4px) for inputs/buttons, `--radius-lg` (8px) for cards, `--radius-sm` (2px) for chips. No pill unless it's a true chip.
- Replace gray-500 shadows with `--shadow-sm`/`--shadow-md` (tinted navy).
- Replace default-blue focus ring with `2px solid var(--tertiary)` + 4px offset.
- Replace default-gray borders with tonal surface shifts (`--surface-container-low` on `--surface`) where possible; use `1px solid rgba(0,15,34,0.08)` (ghost) only when a border is required for accessibility.
- Typography: Inter for UI (labels UPPERCASE 0.2em tracked where appropriate per design), Newsreader for section headings.
- Icons: swap Radix/Lucide defaults to Lucide 1.5px stroke at the approved sizes (16/20/24/32).

**Why:**
- **Shadcn is copy-in, not a dependency.** We own the source — no API surface risk, no upgrade pain, fits the ~200 LOC/file rule (each primitive is a small file).
- **Radix is unopinionated.** It ships behavior (keyboard nav, focus trap, ARIA) with near-zero visuals — exactly what we want when the visual language is prescriptive.
- **TanStack Table** for admin tables (server-side pagination/sort/filter, virtualization). Not shadcn's default.
- **TanStack Query** for mutations against the BFF (optimistic updates, retry, cache invalidation).

**Public/operator screens do NOT use shadcn primitives.** They use bespoke components against the design system directly (Card, DossierHeader, ClaimRow, GraphCanvas, FeedItem). Shadcn is an admin convenience, not a brand compromise.

**Rejected:**
- **Refine.dev / Directus-in-iframe:** too opinionated, fights the design system.
- **Fully bespoke admin primitives:** 3–4 weeks of work we don't need to do; shadcn's Radix foundations are the right abstraction.
- **MUI / Mantine / Chakra:** all ship opinionated visuals that fight the editorial brand.

**Source:** 2026-04-20 decision.

---

## §4 — Role model: three roles via Clerk Organizations

**Decision:** `admin`, `operator`, `viewer` stored in Clerk `public_metadata.role`. Clerk **Organizations enabled** — every user belongs to at least one org (county party, PAC, candidate committee). `org:admin` Clerk role maps to app `admin`; `org:member` defaults to `operator`; `viewer` is an explicit downgrade set by an app admin.

**Enforcement layers:**
1. **Middleware** (`console/src/middleware.ts`): route prefix allow-lists per role. `/admin/*` requires `admin`. `/` + `/judicial/*` + `/officials/*` + `/search` + `/dossier/*` require `viewer+`.
2. **RLS**: the Clerk→Supabase JWT template embeds `role` + `org_id`. Policies use `(select (auth.jwt() ->> 'role'))` and `(select (auth.jwt() ->> 'org_id'))`. Per-org data (saved views, alerts, bookmarks) is org-scoped.
3. **BFF**: FastAPI dependency `require_role('admin')` verifies Clerk JWT server-side before any admin handler runs.
4. **UI**: `<RoleGate role="admin">` component hides admin-only controls so operators never see a 403. Belt-and-braces — the BFF check is authoritative.

**Why 3 not 2:** the user wants delegates and campaign staff who can see dossiers but not trigger expensive LLM runs or publish claims. `viewer` is a real persona.

**Source:** 2026-04-20 scoping.

---

## §5 — Directus: sunset path

**Decision:** Directus stays available in Phase A–C as a safety net. Phase D performs a **parity audit** (every Directus-managed concern has an equivalent in `/admin`), then decommissions:

1. Stop the Directus container (`docker compose stop directus`).
2. Remove Directus from `docker-compose.yml`.
3. Drop the `directus` schema via migration (keep `public` intact — Directus never owned app tables).
4. Delete `cms/` from the tree in a dedicated commit for easy revert.
5. Remove `scripts/dev-db-*` Directus repair paths; add a guarded note that the scripts were retired on date X.
6. Update `CLAUDE.md` "CMS — Directus" section to mark the section historical and point to the admin console.

**Why:**
- Per 2026-04-20 decision: operators should not have to learn two UIs. Directus's Studio does not follow our design system and never will without sustained effort that is better spent on the admin console itself.
- Directus cost us time on bootstrap/`KEY`/`SECRET` fragility after DB resets (see `03_progress.md` errors table). Removing it removes that class of error.
- App tables are already schema-owned by Supabase migrations. Directus was only introspecting — nothing of ours is trapped in it.

**Rollback plan:** the Directus removal commit is isolated and revertable; `cms/schema/snapshot-baseline.yaml` stays in git history. If Phase D surfaces a parity gap we missed, `git revert <sha>` restores Directus while we close the gap.

**Source:** 2026-04-20 scoping.

---

## §6 — Frontend tooling version pins (to be fixed in Phase A.1)

Pin exact versions in `console/package.json`; upgrade deliberately, not opportunistically.

- **Next.js**: `^15` (latest 15.x at time of scaffold; App Router, RSC, PPR experimental OFF until deliberately enabled).
- **React**: whichever Next 15 ships with; do not override.
- **TypeScript**: `^5.6` strict.
- **Tailwind**: `^4` (v4's `@theme` blocks are what we use to expose design tokens as utilities).
- **@clerk/nextjs**: `^6` (Organizations API stable).
- **@supabase/ssr**: latest stable.
- **@tanstack/react-table**, **@tanstack/react-query**: latest stable majors.
- **@xyflow/react**: latest (React Flow rebrand).
- **lucide-react**: latest.
- **zod**: `^3`.
- **Playwright**: latest.
- **Vitest**: latest.

Resolve exact versions at scaffold time; record them in `progress.md` once `bun install` succeeds.

---

## §7 — Accessibility minimums (non-negotiable)

- **WCAG 2.2 AA.** Colour contrast checked against `design/colors_and_type.css` pairings (cream/navy/gold combos pass; crimson-on-cream needs size check).
- **Keyboard:** every interactive element reachable; visible focus ring (gold, per design); skip-to-content link on every page.
- **Motion:** honor `prefers-reduced-motion` — swap the three animation families for instant fades.
- **Screen readers:** semantic landmarks; Radix primitives already ship correct ARIA; custom components get aria reviewed against axe.
- **Testing:** `axe-core` run in Playwright against every top-level route; CI fails on new violations.

---

## §8 — Performance budgets (per route)

- **LCP:** < 2.5s on a simulated 4G connection (Next 15 PPR off; we rely on RSC + streaming).
- **INP:** < 200ms.
- **JS bundle** (client, per route): < 180kB gzipped. Admin tables budget +40kB for TanStack Table / virtualization.
- **Graph view:** lazy-loaded, off the main bundle.

Measured via Lighthouse CI in the `gui-ci.yml` workflow (Phase A.7).

---

## §9 — Bill summarization programme (2026-04-20)

**Context:** user requested an AI summary feature for Utah bills with anti-hallucination guarantees, source linkage, and version tracking. Full plan: `docs/plans/2026-04-20-bill-summarization.md`.

1. **Scope locked to Utah Legislature only in v1.** Federal + local deferred — nail one source than half-nail three.
2. **All versions tracked** (introduced through enrolled/signed). Re-summarize each; diff UI surfaces the drift. Cost increase acceptable because mandatory human review makes stale summaries worse than re-runs.
3. **Separate `bill_chunks` table (not `rag_chunks` reuse).** Bills carry structure opinions don't — section numbers, line ranges, version linkage, amendment strikethroughs. Shoving this into `rag_chunks.metadata` breaks the ANN RPC simplicity and complicates RLS (opinions public; bill_chunks service-role-only). Consistent with the existing `dossier_claims` / `rag_chunks` / `entity_edges` split.
4. **Five-stage LLM pipeline with claim-FK integrity at every stage:** map → section → rollup → adversarial → synthesis. Rejected alternatives: plain map-reduce (no adversarial = load-bearing anti-hallucination gap); single-pass long-context (Utah appropriation bills > 400 pages, citation fidelity degrades, no per-chunk durable artifact); refine/streaming-accumulator (no parallelism, hides where hallucinations enter).
5. **Page + line positions are authoritative from the chunk, not the model.** Model produces `source_quote` verbatim; insert transaction rejects on substring-normalize mismatch. Positions physically cannot be hallucinated.
6. **Every summary requires human review.** No auto-publish. Matches CLAUDE.md's adversarial-human-gate stance for dossiers; user explicitly chose `human_gate_all`.
7. **Plan integration strategy:** standalone plan doc + parallel programme row in the master tracker. GUI A/B/C/D plans cross-referenced but untouched (per user directive "don't break existing plans").
8. **UI citation interaction:** split-view with a PDF pane via `react-pdf` (client dynamic import, off main bundle). Every rollup/provision/FAQ element carries `cited_claim_ids`; click resolves claim → chunk → page and scrolls the PDF pane.
9. **PDF export tooling TBD at Task 20:** weasyprint preferred (pure Python); fallback to headless Chromium via Playwright if weasyprint Windows deps are painful. Decide when we get there; record the pick here.

---

## §10 — Deferred / TBD (will become findings as we decide)

- Email transport for alerts (Resend? Supabase SMTP? Clerk's transactional?).
- Storage for media uploads (Supabase Storage vs R2).
- Analytics (PostHog self-hosted? none for v1?).
- Export formats (PDF dossier export — paged HTML + print CSS vs server render?).

Decide before the first phase that needs them. Record the decision back here as a numbered finding.
