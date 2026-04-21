# Silent Briefing — operator console

Next.js App Router + Clerk + Supabase (`@supabase/ssr` + Clerk JWT). Package name **`silent-briefing-console`** (npm reserves `console`).

## Dev

```bash
bun install
cp .env.local.example .env.local   # Clerk + Supabase anon URL/key
bun run dev                        # webpack bundler — avoids Turbopack panics with Clerk on some Windows setups
```

- **`bun run dev:turbo`** — Turbopack (faster; may crash in dev on some setups).
- **LAN / phone testing:** add your machine IP in `next.config.ts` `allowedDevOrigins` or set `NEXT_PUBLIC_ALLOWED_DEV_ORIGINS` (comma-separated) and restart dev.
- **DB types:** with local Supabase running, `bun run types:db` regenerates `src/lib/supabase/types.ts`.
- **Guard:** `bun run check:secrets` ensures `console/src` never references `service_role`.

See repo root `README.md` and `CLAUDE.md` for full stack context.
