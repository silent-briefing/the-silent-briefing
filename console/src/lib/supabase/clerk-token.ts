/**
 * Resolves a Clerk JWT for Supabase without throwing when the `supabase` JWT template
 * is missing (common in keyless / fresh dashboards).
 */
export async function getClerkSupabaseAccessToken(
  getToken: (opts?: { template?: string }) => Promise<string | null | undefined>,
): Promise<string | null> {
  try {
    const t = await getToken({ template: "supabase" });
    if (t) return t;
  } catch {
    /* JWT template "supabase" not created in Clerk */
  }
  try {
    const t = await getToken();
    return t ?? null;
  } catch {
    return null;
  }
}
