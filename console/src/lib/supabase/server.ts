import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/** Server Supabase client — Clerk session token (`supabase` template) + cookie storage for SSR. */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { getToken } = await auth();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Components may not mutate cookies */
          }
        },
      },
      async accessToken() {
        return (await getToken({ template: "supabase" })) ?? null;
      },
    },
  );
}
