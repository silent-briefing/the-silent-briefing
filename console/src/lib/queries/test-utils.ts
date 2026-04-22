import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

import type { Database } from "@/lib/supabase/types";

/** Minimal thenable PostgREST chain for Vitest (list + maybeSingle + single). */
export function createSupabaseQueryMock(result: { data: unknown; error: null }): SupabaseClient<Database> {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  for (const m of [
    "select",
    "eq",
    "is",
    "ilike",
    "or",
    "order",
    "limit",
    "insert",
    "update",
    "delete",
  ]) {
    chain[m] = self;
  }

  chain.maybeSingle = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);

  chain.then = (
    onfulfilled?: ((value: unknown) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onfulfilled as never, onrejected as never);

  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
}
