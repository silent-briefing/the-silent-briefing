import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { getClerkSupabaseAccessToken } from "./clerk-token";
import type { Database } from "./types";
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from "./public-env";

/**
 * Server Supabase client — Clerk JWT when available (`supabase` template, else default session).
 *
 * Uses `createClient` + `accessToken`, not `createServerClient` from `@supabase/ssr`:
 * the SSR helper always calls `auth.onAuthStateChange`, which is forbidden when
 * `accessToken` is set (third-party auth).
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient<Database>(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    accessToken: async () => getClerkSupabaseAccessToken(getToken),
  });
}
