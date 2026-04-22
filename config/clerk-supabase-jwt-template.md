# Clerk JWT template for Supabase (Silent Briefing)

Use this in **Clerk Dashboard → JWT Templates**. Create a template named `**supabase`** (or set `NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE` in the console to your name).

## 1) Integrate Clerk with Supabase

**Clerk Dashboard → Integrations → Supabase**

- **JWT Secret:** must match the Supabase project JWT secret.
  - **Local:** `super-secret-jwt-token-with-at-least-32-characters-long` (pinned in `supabase/config.toml` as `[auth].jwt_secret`; also `JWT_SECRET` from `supabase status -o env`).
  - **Production:** Supabase Dashboard → **Project Settings → API → JWT Secret** (not the local string).

## 2) Claims (JSON template body)

Clerk’s editor uses **claims** / shortcodes. Minimal shape RLS expects:


| Claim      | Purpose                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `role`     | Must be `**authenticated`** so PostgREST uses the `authenticated` Postgres role.                                               |
| `aud`      | `**authenticated**` (Supabase convention).                                                                                     |
| `sub`      | Clerk user id (maps to `auth.jwt()->>'sub'`).                                                                                  |
| `app_role` | `**admin` | `operator` | `viewer**` from `public_metadata.role` (see migration `20260426200000_rls_clerk_app_role_claim.sql`). |
| `org_id`   | Active Clerk **Organization** id (for org-scoped rows such as `alerts`). Omit or null if unused.                               |


Example **Claims** JSON (adjust shortcodes to match your Clerk version; see [Clerk Supabase](https://clerk.com/docs/integrations/databases/supabase)):

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}",
  "app_role": "{{user.public_metadata.role}}",
  "org_id": "{{org.id}}",
  "email": "{{user.primary_email_address}}"
}
```

If `{{org.id}}` is empty when no organization is active, policies that require `org_id` may hide org data until the user selects an org — expected.

## 3) User metadata

Set `**public_metadata.role**` on each user (`admin`, `operator`, or `viewer`). Middleware already treats missing role as `viewer` for routes; JWT should still carry `app_role` for RLS.