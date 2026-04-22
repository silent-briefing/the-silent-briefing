/**
 * Public Supabase URL + anon key for browser and server clients.
 *
 * In development/test, falls back to the fixed local stack from `supabase start`
 * (`API_URL` / `ANON_KEY` from `supabase status -o env`). Production must set
 * `NEXT_PUBLIC_SUPABASE_*` explicitly.
 */

/** Matches default local API when `[api] port = 54321` in supabase/config.toml */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

/**
 * Legacy JWT anon role — still returned as `ANON_KEY` by Supabase CLI for local dev.
 * (Publishable `sb_publishable_*` keys are optional for newer clients; supabase-js accepts this.)
 */
export const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function devOrTestUsesLocalSupabaseDefaults(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

function missingProductionConfigMessage(): string {
  return (
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set " +
    "(e.g. copy console/.env.local.example to .env.local, or run `supabase status -o env`). " +
    "See https://supabase.com/dashboard/project/_/settings/api for hosted projects."
  );
}

export function getPublicSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url) return url;
  if (devOrTestUsesLocalSupabaseDefaults()) return LOCAL_SUPABASE_URL;
  throw new Error(missingProductionConfigMessage());
}

export function getPublicSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (key) return key;
  if (devOrTestUsesLocalSupabaseDefaults()) return LOCAL_SUPABASE_ANON_KEY;
  throw new Error(missingProductionConfigMessage());
}
