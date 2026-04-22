/**
 * Clerk JWT template name for Supabase third-party auth, or `null` to skip fetching
 * (no `getToken({ template })` call — avoids Clerk FAPI 404 + console noise when the
 * template is not created yet).
 *
 * - **Unset:** use template name `"supabase"` (Clerk Dashboard → JWT Templates).
 * - **Empty, `0`, or `false`:** skip — Supabase client uses anon key only (RLS as `anon`).
 * - **Any other string:** use as template name.
 */
export function getClerkSupabaseJwtTemplateName(): string | null {
  const raw = process.env.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE;
  if (raw === undefined) return "supabase";
  const t = raw.trim();
  if (t === "" || t === "0" || t.toLowerCase() === "false") return null;
  return t;
}

/**
 * Resolves a Clerk JWT for Supabase when a JWT template is configured and exists.
 *
 * We intentionally do **not** fall back to `getToken()` without a template: Clerk's
 * default session JWT is not signed for PostgREST. Sending it as `Authorization:
 * Bearer …` makes Supabase reject the request (JWT invalid / wrong audience).
 *
 * When the template is disabled via env, missing, or throws, return `null` so `@supabase/supabase-js`
 * falls back to the anon key (see `fetch` wrapper in supabase-js) — correct for
 * RLS policies granted to `anon`.
 */
export async function getClerkSupabaseAccessToken(
  getToken: (opts?: { template?: string }) => Promise<string | null | undefined>,
): Promise<string | null> {
  const template = getClerkSupabaseJwtTemplateName();
  if (template === null) return null;

  try {
    const t = await getToken({ template });
    return t ?? null;
  } catch {
    /* JWT template missing or Clerk error */
    return null;
  }
}
