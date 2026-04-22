# Silent Briefing — operator console

Next.js App Router + Clerk + Supabase (`@supabase/ssr` + Clerk JWT). Package name **`silent-briefing-console`** (npm reserves `console`).

## Dev

```bash
bun install
# From repo root: start local Postgres + API (port 54321 by default)
# supabase start
cp .env.local.example .env.local   # Clerk keys required; Supabase URL/anon filled for local CLI stack
bun run dev                        # webpack bundler — avoids Turbopack panics with Clerk on some Windows setups
```

- **Supabase:** With `NODE_ENV=development`, missing `NEXT_PUBLIC_SUPABASE_*` defaults to `http://127.0.0.1:54321` and the CLI’s demo anon JWT so the app boots; run **`supabase start`** from the repo root so the API is actually there. Override in `.env.local` for hosted projects.
- **`bun run dev:turbo`** — Turbopack (faster; may crash in dev on some setups).
- **LAN / phone testing:** add your machine IP in `next.config.ts` `allowedDevOrigins` or set `NEXT_PUBLIC_ALLOWED_DEV_ORIGINS` (comma-separated) and restart dev.
- **DB types:** with local Supabase running, `bun run types:db` regenerates `src/lib/supabase/types.ts`.
- **Guard:** `bun run check:secrets` ensures `console/src` never references `service_role`.
- **BFF:** `NEXT_PUBLIC_BFF_BASE_URL` (e.g. `http://127.0.0.1:8000`) — browser calls FastAPI with Clerk `Authorization: Bearer` via `src/lib/bff/client.ts`.

**E2E:** With dev server up (`bun run dev` on port 3000) and `.env.local` Clerk keys: `bun run test:e2e`.

**Design-system storyboard (dev only):** `/_/primitives` renders all shadcn primitives against design tokens. The route returns 404 in production builds; in development it is public (no sign-in) for axe/Playwright.

See repo root `README.md` and `CLAUDE.md` for full stack context.
