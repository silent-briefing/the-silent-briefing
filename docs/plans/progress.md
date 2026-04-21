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
