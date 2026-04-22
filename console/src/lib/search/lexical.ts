import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

import { officialDossierHref } from "./hrefs";

export type LexicalSearchKind = "official" | "bill" | "opinion" | "media";

export type LexicalSearchHit = {
  kind: LexicalSearchKind;
  id: string;
  title: string;
  subtitle?: string;
  /** Primary navigation target when the hit is routable. */
  href: string;
};

function encodeSearchQuery(q: string): string {
  return encodeURIComponent(q.trim());
}

/**
 * Lexical `ilike` across operator-published tables (RLS-enforced).
 */
export async function searchLexicalAll(
  supabase: SupabaseClient<Database>,
  term: string,
  opts?: { limitPerKind?: number },
): Promise<LexicalSearchHit[]> {
  const q = term.trim();
  if (!q) return [];

  const limit = opts?.limitPerKind ?? 15;
  const pattern = `%${q}%`;

  const [offRes, billRes, opRes, mediaRes] = await Promise.all([
    supabase
      .from("officials")
      .select("id,slug,full_name,office_type")
      .is("deleted_at", null)
      .ilike("full_name", pattern)
      .order("full_name", { ascending: true })
      .limit(limit),
    supabase
      .from("bills")
      .select("id,bill_number,title")
      .eq("published", true)
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(limit),
    supabase
      .from("opinions")
      .select("id,slug,title,court")
      .eq("published", true)
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(limit),
    supabase
      .from("media_coverage")
      .select("id,headline,source_url")
      .eq("published", true)
      .ilike("headline", pattern)
      .order("headline", { ascending: true })
      .limit(limit),
  ]);

  throwIfPostgrestError(offRes.error);
  throwIfPostgrestError(billRes.error);
  throwIfPostgrestError(opRes.error);
  throwIfPostgrestError(mediaRes.error);

  const sq = encodeSearchQuery(q);
  const hits: LexicalSearchHit[] = [];

  for (const r of offRes.data ?? []) {
    hits.push({
      kind: "official",
      id: r.id,
      title: r.full_name,
      subtitle: r.office_type.replaceAll("_", " "),
      href: officialDossierHref(r.office_type, r.slug),
    });
  }

  for (const r of billRes.data ?? []) {
    hits.push({
      kind: "bill",
      id: r.id,
      title: r.title,
      subtitle: r.bill_number,
      href: `/search?q=${sq}`,
    });
  }

  for (const r of opRes.data ?? []) {
    const court = r.court?.trim();
    hits.push({
      kind: "opinion",
      id: r.id,
      title: r.title,
      subtitle: court || r.slug,
      href: `/search?q=${sq}`,
    });
  }

  for (const r of mediaRes.data ?? []) {
    hits.push({
      kind: "media",
      id: r.id,
      title: r.headline,
      subtitle: r.source_url ?? undefined,
      href: r.source_url?.startsWith("http") ? r.source_url : `/search?q=${sq}`,
    });
  }

  return hits;
}
