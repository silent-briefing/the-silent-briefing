import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

import { officialCardRowSchema, type OfficialCardRow } from "./schemas";
import type { OfficialsUrlFilters } from "./officials-url-filters";

export const OFFICIAL_CARD_COLUMNS =
  "id, slug, full_name, office_type, bio_summary, retention_year, subject_alignment, photo_url, jurisdiction_id, is_current, entity_id, party";

function parseOfficialRows(data: unknown): OfficialCardRow[] {
  const rows = Array.isArray(data) ? data : [];
  const out: OfficialCardRow[] = [];
  for (const r of rows) {
    const p = officialCardRowSchema.safeParse(r);
    if (p.success) out.push(p.data);
  }
  return out;
}

async function listByOfficeType(
  supabase: SupabaseClient<Database>,
  officeType: string,
): Promise<OfficialCardRow[]> {
  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .eq("office_type", officeType)
    .eq("is_current", true)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  throwIfPostgrestError(error);
  return parseOfficialRows(data);
}

export async function listSupremeCourt(supabase: SupabaseClient<Database>): Promise<OfficialCardRow[]> {
  return listByOfficeType(supabase, "state_supreme_justice");
}

/** Current Utah officials for a given `office_type` (jurisdiction slug `ut`). */
export async function listUtByOfficeType(
  supabase: SupabaseClient<Database>,
  officeType: string,
): Promise<OfficialCardRow[]> {
  const { data: jur, error: jErr } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("slug", "ut")
    .maybeSingle();
  throwIfPostgrestError(jErr);
  if (!jur?.id) return [];

  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .eq("jurisdiction_id", jur.id)
    .eq("office_type", officeType)
    .eq("is_current", true)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  throwIfPostgrestError(error);
  return parseOfficialRows(data);
}

/** Utah supreme court justices — same scope as BFF `GET /v1/console/judicial/supreme-court`. */
export async function listUtSupremeCourt(supabase: SupabaseClient<Database>): Promise<OfficialCardRow[]> {
  return listUtByOfficeType(supabase, "state_supreme_justice");
}

export async function listAppellate(supabase: SupabaseClient<Database>): Promise<OfficialCardRow[]> {
  return listByOfficeType(supabase, "state_appellate_judge");
}

/** Filtered roster for the operator officials hub (URL-driven filters). */
export async function listOfficialsFiltered(
  supabase: SupabaseClient<Database>,
  filters: OfficialsUrlFilters,
): Promise<OfficialCardRow[]> {
  let q = supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (filters.jurisdictionId) q = q.eq("jurisdiction_id", filters.jurisdictionId);
  if (filters.officeType) q = q.eq("office_type", filters.officeType);
  if (filters.party) q = q.eq("party", filters.party);
  if (filters.subjectAlignment) q = q.eq("subject_alignment", filters.subjectAlignment);
  if (filters.isCurrent !== null) q = q.eq("is_current", filters.isCurrent);

  const { data, error } = await q;
  throwIfPostgrestError(error);
  return parseOfficialRows(data);
}

export async function listByJurisdiction(
  supabase: SupabaseClient<Database>,
  jurisdictionId: string,
): Promise<OfficialCardRow[]> {
  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .eq("jurisdiction_id", jurisdictionId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  throwIfPostgrestError(error);
  return parseOfficialRows(data);
}

/** Resolve many slugs in one round-trip; order matches `slugs` (missing slugs omitted). */
export async function getBySlugs(
  supabase: SupabaseClient<Database>,
  slugs: string[],
): Promise<OfficialCardRow[]> {
  const uniq = [...new Set(slugs.filter(Boolean))];
  if (uniq.length === 0) return [];

  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .in("slug", uniq)
    .is("deleted_at", null);

  throwIfPostgrestError(error);
  const rows = parseOfficialRows(Array.isArray(data) ? data : []);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is OfficialCardRow => Boolean(r));
}

export async function getBySlug(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<OfficialCardRow | null> {
  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  const p = officialCardRowSchema.safeParse(data);
  return p.success ? p.data : null;
}
