# Master Task Plan — GUI + Admin Programme

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (fresh session) or `superpowers:subagent-driven-development` (this session) to implement **Phases A → B+C (parallel) → D**. Re-read `docs/plans/README.md`, this file, `findings.md`, and the phase plan you're executing before each work block.

**Goal:** Deliver a complete, design-system-faithful Next.js 15 operator console with a **first-class admin surface** that fully replaces Directus for day-to-day content curation. Zero-touch Directus for operators; Directus retained only as a break-glass fallback until Phase D decommissions it.

**Architecture:**
- **Single Next.js 15 App Router app** at `console/` with `/admin` as a role-gated route group — not a separate app. Rationale in `findings.md §1`.
- **Clerk** for authentication with **Organizations** enabled for multi-tenant routing; **three roles** (`admin`, `operator`, `viewer`) enforced in middleware + RLS.
- **Hybrid data path:** reads + simple mutations via `supabase-js` with the Clerk→Supabase JWT template (RLS does the heavy lifting); orchestration, service-role operations, heavy joins, and auditable mutations go through the existing FastAPI BFF (`backend/briefing/api/routes/console.py`, extended).
- **Design system:** public/operator screens are bespoke against `design/colors_and_type.css`; admin uses **shadcn/ui + Radix primitives re-themed with design tokens** (no SaaS defaults — no gray shadows, no default-blue focus, no rounded-full, no 1px solid borders for section breaks). See `findings.md §3`.
- **BFF:** FastAPI routes under `/v1/console/*` (reads) and `/v1/admin/*` (mutations + orchestration). Never embed `service_role` in the browser.

**Tech Stack:** Bun, Next.js 15 (App Router, RSC, Server Actions), TypeScript strict, Tailwind v4, `@clerk/nextjs` with Organizations, `@supabase/ssr` + `supabase-js`, shadcn/ui (copied in, themed), Radix primitives, Lucide icons, `@xyflow/react` (graph), `@tanstack/react-table` (admin tables), `@tanstack/react-query` (BFF mutations), Zod (runtime schemas), Playwright (E2E), Vitest (unit), Storybook (design-system components — optional), `uv` + FastAPI + `pytest` + `respx` (backend BFF extensions).

**Read first (zero context):**
1. `CLAUDE.md` — engineering standards, auth, design, env vars
2. `AGENTS.md` — learned preferences + workspace facts
3. `docs/plans/README.md` — plan index
4. `docs/plans/findings.md` — decisions + rationale (read once, re-read before architectural choices)
5. `design/README.md` — design system (non-negotiable)
6. `design/ui_kits/operator_console/` — reference UI (style guide, do not copy)
7. `.cursor/rules/design-system.mdc`, `.cursor/rules/typescript.mdc`, `.cursor/rules/supabase-directus.mdc`
8. `docs/plans/04_foundation_supabase_directus.md` § Clerk JWT + RLS — authoritative runbook
9. Archived Phase-3 plan `docs/plans/2026-04-21-step-3-phase-3-cohesive-implementation.md` — context only; **superseded** by Phases A–C

---

## Scope (from 2026-04-20 scoping session)

| Concern | In scope? | Which phase | Notes |
|---|---|---|---|
| Operator: Briefing home | yes | B | Matches `design/ui_kits/operator_console` BriefingScreen |
| Operator: Judicial Watch hub + Supreme Court + appellate + district | yes | B | Supreme Court ships first (data exists) |
| Operator: Officials hub (federal/state/county/city rosters) | yes | B | Filter + search + virtualized list |
| Operator: Full dossier (Overview, Claims, Adversarial, Graph, Feed, Timeline) | yes | B | 6 tabs |
| Operator: Comparison matrix | yes | B | Per `design` ComparisonScreen |
| Operator: Global search (semantic + entity-aware) | yes | B | Server action → BFF; feature-flag semantic half |
| Operator: Entity graph (React Flow) | yes | B | Accepted edges only for operator; admin sees proposed |
| Operator: Live feeds (X + Perplexity) | yes | B | Per-official tab; BFF endpoint |
| Operator: Saved views / watchlists / bookmarks | yes | B | Per-user, stored in new `user_saved_views` table |
| Operator: Alerts / notifications | yes | B | New filings, new opinions, new adversarial flags; in-app + email later |
| Admin: Officials CRUD (entities, jurisdictions, offices, alignment) | yes | C | |
| Admin: Dossier review & approval queue | yes | C | Groundedness score + claim-by-claim approve/reject/edit |
| Admin: Intel runs observability + re-run | yes | C | Wrap `retrieval-pass`, `dossier-write`, adversarial |
| Admin: Correlations review (accept/reject `entity_edges`) | yes | C | Proposed → accepted via BFF |
| Admin: Sources & feeds config | yes | C | X, Perplexity, source-URL overrides |
| Admin: Users & roles (Clerk org members) | yes | C | Via Clerk Backend API |
| Admin: Opinions / bills ingestion | yes | C | Upload, tag, link |
| Admin: Media coverage curation | yes | C | |
| Admin: Engine ops dashboard | yes | C | Per `design/ui_kits/engine_ops` intent (doesn't exist yet) |
| Admin: System settings (model tiers, staleness, flags) | yes | C | |
| Directus sunset | yes | D | After parity audit |
| Multi-tenant via Clerk Orgs | **yes** | A | County party A vs PAC B — org-scoped saved views + alerts |

---

## Phase Tracker

| Phase | Status | Owner | Depends on | Gate to next |
|---|---|---|---|---|
| **A — Console foundation** | in_progress | A.1–A.9 shipped | Clerk JWT template (exists), `authenticated` RLS tranche (exists), GUI tables migration | Clerk sign-in works; `/` loads design tokens; `proxy.ts` + Supabase clients + GUI support tables + app shell + shadcn primitives + BFF client + `/v1/admin/health`; CI green |
| **B — Operator console** | pending | — | A | All 10 operator surfaces shippable; Playwright smoke green |
| **C — Admin console** | pending | — | A | All 10 admin concerns CRUD-complete; mutations audit-logged; BFF tests green |
| **D — Directus sunset** | pending | — | C | Parity audit signed off; Directus container stopped; docs updated |

B and C may run in parallel as two subagent streams once A ships.

## Bill Programme Tracker (parallel to GUI)

Full plan: `docs/plans/2026-04-20-bill-summarization.md`.

| Phase | Status | Depends on | Gate to next |
|---|---|---|---|
| **Bill P1 — Backend pipeline** | pending | nothing (standalone) | Ingestion + map + section + rollup + adversarial + synthesis produce a valid `bill_summaries` row for one real Utah bill end-to-end; chunk + cite integrity checks pass; pytest green |
| **Bill P2 — Admin workflow** | pending | Bill P1 + GUI Phase A exit gate | Admin can trigger ingest, review + edit + publish/reject a summary; every mutation audit-logged; Playwright green |
| **Bill P3 — Operator surfaces** | pending | Bill P2 + GUI Phase B.2 primitives | `/bills` hub + detail split-view + version diff + Ask-this-bill + annotations + PDF export + sponsor dossier tab all shipping; Playwright + axe + Lighthouse green |

Recommended sequencing: Bill P1 runs **in parallel with GUI Phase A** (no shared files). Bill P2 starts once both Bill P1 and GUI Phase A exit gates clear. Bill P3 starts once Bill P2 and GUI Phase B.2 (operator primitives) are both green.

---

## Cross-cutting requirements (enforced in every phase)

1. **~200 LOC/file.** Split aggressively. Shared UI primitives in `console/src/components/ui/`; feature components in `console/src/components/<feature>/`.
2. **No `any`.** `unknown` + Zod guards at trust boundaries (Supabase responses, BFF responses, URL params).
3. **No hardcoded colors/spacing.** Import tokens from `console/src/styles/tokens.css` (which imports `design/colors_and_type.css`).
4. **No Tailwind color utilities that bypass tokens.** Configure Tailwind v4 `@theme` to expose design tokens as utilities; PR-reject raw hex in components.
5. **No `service_role` key in client bundles.** Enforced by a `console/src/lib/supabase/*` boundary + ESLint rule.
6. **RLS is the primary auth boundary.** Middleware checks are belt-and-braces. Every new table gets an RLS policy in the same migration.
7. **Audit log.** Every admin mutation writes a row to `admin_audit_log` (new table in Phase C.1).
8. **Feature flags.** New feature defaults off; flipped on per-env in `settings` table (Phase C.10).
9. **Accessibility.** Keyboard nav, visible focus rings (design-system gold 2px/4px offset), `prefers-reduced-motion`, axe-clean on every page.
10. **Commit discipline.** One logical change per commit. Conventional commit prefix (`feat(console):`, `feat(admin):`, `feat(api):`, `feat(db):`, `test:`, `docs:`).

## Role model (Phase A.2)

| Role | Clerk `public_metadata.role` | Allowed |
|---|---|---|
| `admin` | `admin` | Everything operator can do + `/admin/*` + destructive mutations + user management within their org |
| `operator` | `operator` | All operator surfaces; trigger intel runs; propose correlations (not accept); save personal views |
| `viewer` | `viewer` | Read-only across operator surfaces; no triggers, no saves beyond bookmarks |

Clerk Organizations enabled; `org:admin` Clerk system role maps to app `admin`; `org:member` defaults to `operator`; explicit downgrade to `viewer` via admin UI. Middleware reads `auth().sessionClaims.org_role` + `public_metadata.role` and denies + logs on mismatch.

---

## Execution modes

**Option 1 — Subagent-driven (this session):** dispatch fresh subagent per task; review between tasks; ideal for Phase A where ordering matters.

**Option 2 — Parallel sessions:** Phases B and C as two separate sessions in the same worktree once A merges. Each session uses `superpowers:executing-plans`.

**Recommended:** A solo (this session, subagent-driven) → B+C parallel → D solo.

---

## Status log (brief — full log in `progress.md`)

| Date | Event |
|---|---|
| 2026-04-20 | Master plan written; phases A/B/C/D scoped; legacy plans marked superseded in README |
| 2026-04-21 | Phase A.6–A.7: operator/admin shell + re-themed shadcn primitives + dev `/_/primitives` storyboard |
| 2026-04-21 | Phase A.8: `/v1/admin/health` + Clerk JWT deps; operator UI aligned to `design/ui_kits/operator_console` |
| 2026-04-21 | Phase A.9: `QueryProvider` + `bffJson` (Zod) + audit stub; `NEXT_PUBLIC_BFF_BASE_URL` |

---

## Open questions deferred to phase plans

- Clerk Organizations: self-serve creation vs admin-provisioned? → **Phase A.2** decides.
- Graph library: React Flow vs vis-network vs D3? → **Phase B.7** decides (recommendation: `@xyflow/react`).
- Comparison matrix: fixed 2-up vs configurable N-up? → **Phase B.5** decides.
- Alerts transport: in-app only v1, email v2, webhook v3? → **Phase B.10** decides.
- Admin audit log retention + PII policy? → **Phase C.1** decides.
