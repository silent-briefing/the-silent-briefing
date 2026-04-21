"use client";

import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Browser Supabase client — injects Clerk `supabase` JWT template on each request. */
export function useSupabaseBrowser(): SupabaseClient<Database> {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          async accessToken() {
            return (await getToken({ template: "supabase" })) ?? null;
          },
        },
      ),
    [getToken],
  );
}
