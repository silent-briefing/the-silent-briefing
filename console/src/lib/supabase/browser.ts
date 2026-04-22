"use client";

import { useAuth } from "@clerk/nextjs";
import { createBrowserClient } from "@supabase/ssr";
import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClerkSupabaseAccessToken } from "./clerk-token";
import type { Database } from "./types";
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from "./public-env";

/** Browser Supabase client — Clerk JWT when JWT template is configured (`NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE`), else anon. */
export function useSupabaseBrowser(): SupabaseClient<Database> {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createBrowserClient<Database>(
        getPublicSupabaseUrl(),
        getPublicSupabaseAnonKey(),
        {
          async accessToken() {
            return getClerkSupabaseAccessToken(getToken);
          },
        },
      ),
    [getToken],
  );
}
