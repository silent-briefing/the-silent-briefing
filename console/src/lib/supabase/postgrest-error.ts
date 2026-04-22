import type { PostgrestError } from "@supabase/supabase-js";

export function throwIfPostgrestError(error: PostgrestError | null): void {
  if (!error) return;
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  throw new Error(parts.length ? parts.join(" — ") : "Supabase request failed");
}
