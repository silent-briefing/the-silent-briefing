# `docs/plans/` — Plan Index

> **Authoritative index** of all planning documents for *The Silent Briefing*. Read this first to know what is active, what is archived, and where to look.
>
> **Last re-indexed:** 2026-04-20 (GUI + admin re-plan after discovery that the Step 3 + Phase 3 plan treated the operator console as a 6-task skeleton and omitted the admin surface entirely).
>
> **Rule:** Do not edit archived/superseded plans. They stay as historical record. New work goes in the "Active" set below.

---

## Active plans — work from these

| File | Status | Purpose |
|---|---|---|
| `README.md` | active | This index |
| `task_plan.md` | **active — master** | Manus-style master task plan for the **GUI + Admin programme** (phases A–D). Read before any GUI work. |
| `findings.md` | active — living | Research + decisions for GUI/admin (stack, role model, data path, design reconciliation, Directus sunset). Append new findings; never delete. |
| `progress.md` | active — living | Session log for the GUI programme. One entry per session. |
| `2026-04-20-gui-phase-a-console-foundation.md` | active | **Phase A** — scaffold Next.js 15 + Clerk orgs/roles + design-token primitives + data layer + CI |
| `2026-04-20-gui-phase-b-operator-console.md` | active | **Phase B** — public/operator surfaces (briefing, judicial watch, officials hub, dossier, comparison, search, graph, feeds, saved views, alerts) |
| `2026-04-20-gui-phase-c-admin-console.md` | active | **Phase C** — `/admin` (officials CRUD, dossier review, intel runs, correlations, sources, users/roles, opinions/bills, media, engine ops, settings) |
| `2026-04-20-gui-phase-d-directus-sunset.md` | active | **Phase D** — parity verification → Directus decommission |

## Archived / superseded — do not edit

These remain as historical record. Backend Phase 1 (Steps 0–2, partial Step 3) is complete per `03_progress.md`; the content below is reference only.

| File | Status | Why archived |
|---|---|---|
| `00_task_plan.md` | **superseded** | Backend Phase 1 essentially complete (Steps 0–2, U3.1–U3.6 backend landed — see `03_progress.md` 2026-04-19 entries). Its UI/CMS phases (7–8) are replaced by the GUI A–D plans. |
| `01_expanded_silent_briefing_platform_plan.md` | **superseded** | Expansion doc merged into the A–D plans; Phase 8 (Next.js console) is fully re-scoped here (the old version had no admin). |
| `02_findings.md` | **historical reference** | Research notes that informed the backend choices. Kept for provenance. New findings go in `findings.md`. |
| `03_progress.md` | **historical reference — backend log** | Full session log of Phase 1 backend work through 2026-04-21. Do not append new GUI entries here; use `progress.md`. |
| `04_foundation_supabase_directus.md` | **partially historical** | Foundation (Supabase CLI, Directus Docker, Clerk→Supabase JWT RLS tranche) is complete. Still contains the authoritative operational runbook for `dev-db-migrate.*` / `dev-db-reset.*` and the Clerk JWT template — those sections remain canonical until superseded by a new ops doc. |
| `2026-04-21-step-2-phase-2-cohesive-implementation.md` | **superseded** | Step 2 / Phase 2 Directus work — Directus is on the sunset path (see Phase D). |
| `2026-04-21-step-3-phase-3-cohesive-implementation.md` | **superseded for Phase 3 (UI); retained for Step 3 (backend)** | Step 3 backend tasks U3.1–U3.6 shipped (see `03_progress.md`). The Phase 3 UI tasks P3.1–P3.6 are **superseded by GUI Phases A–C** which deliver a real, complete console including the admin surface that P3.* omitted entirely. |

---

## How the active plans relate

```text
task_plan.md  (master tracker — phases A, B, C, D with status + gates)
  │
  ├── findings.md  (decisions log — why we chose shadcn-themed, hybrid data path, 3 roles, etc.)
  ├── progress.md  (session log — what shipped each day)
  │
  ├── Phase A: 2026-04-20-gui-phase-a-console-foundation.md
  │     └─ Scaffold, Clerk orgs + 3 roles, design-token primitives, data layer,
  │        role-aware middleware, CI. Blocks B and C.
  │
  ├── Phase B: 2026-04-20-gui-phase-b-operator-console.md       ┐
  │     └─ Operator-facing screens. Depends on A.                │  Run B and C
  │                                                               ├─ in parallel
  ├── Phase C: 2026-04-20-gui-phase-c-admin-console.md           │  as subagent
  │     └─ /admin CRUD + workflows. Depends on A.                │  streams.
  │                                                               ┘
  └── Phase D: 2026-04-20-gui-phase-d-directus-sunset.md
        └─ Parity audit → decommission Directus. Depends on C.
```

## Convention

- New planning docs: `docs/plans/YYYY-MM-DD-<slug>.md`.
- Every plan must open with the `writing-plans` header block (goal, architecture, tech stack, "read first").
- Task status: `pending → in_progress → complete`. Never silently skip.
- Log every error to `progress.md` with a new approach (3-strike protocol from `planning-with-files`).
- Re-read this README and `task_plan.md` before starting a new session or phase.
