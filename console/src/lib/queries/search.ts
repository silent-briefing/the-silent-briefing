import type { SupabaseClient } from "@supabase/supabase-js";

import { bffJson } from "@/lib/bff/client";
import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

import { OFFICIAL_CARD_COLUMNS } from "./officials";
import { officialCardRowSchema, type OfficialCardRow, semanticSearchResponseSchema } from "./schemas";

/**
 * Lexical search on `officials.full_name` (RLS: non-deleted rows the user can read).
 */
export async function searchOfficialsLexical(
  supabase: SupabaseClient<Database>,
  term: string,
  opts?: { limit?: number },
): Promise<OfficialCardRow[]> {
  const q = term.trim();
  if (!q) return [];

  const limit = opts?.limit ?? 50;
  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .is("deleted_at", null)
    .ilike("full_name", pattern)
    .order("full_name", { ascending: true })
    .limit(limit);

  throwIfPostgrestError(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => officialCardRowSchema.parse(r));
}

/**
 * Semantic search via BFF (`POST /v1/search/semantic`) — Perplexity embed + `match_rag_chunks_public`.
 */
export async function semanticSearchViaBff(
  getToken: () => Promise<string | null>,
  query: string,
): Promise<ReturnType<typeof semanticSearchResponseSchema.parse>> {
  return bffJson({
    path: "/v1/search/semantic",
    method: "POST",
    body: { query },
    getToken,
    schema: semanticSearchResponseSchema,
  });
}
