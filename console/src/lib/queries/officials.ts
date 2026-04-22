import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { officialCardRowSchema, type OfficialCardRow } from "./schemas";

export const OFFICIAL_CARD_COLUMNS =
  "id, slug, full_name, office_type, bio_summary, retention_year, subject_alignment, photo_url, jurisdiction_id, is_current";

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

  if (error) throw error;
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
  if (jErr || !jur?.id) return [];

  const { data, error } = await supabase
    .from("officials")
    .select(OFFICIAL_CARD_COLUMNS)
    .eq("jurisdiction_id", jur.id)
    .eq("office_type", officeType)
    .eq("is_current", true)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) return [];
  return parseOfficialRows(data);
}

/** Utah supreme court justices — same scope as BFF `GET /v1/console/judicial/supreme-court`. */
export async function listUtSupremeCourt(supabase: SupabaseClient<Database>): Promise<OfficialCardRow[]> {
  return listUtByOfficeType(supabase, "state_supreme_justice");
}

export async function listAppellate(supabase: SupabaseClient<Database>): Promise<OfficialCardRow[]> {
  return listByOfficeType(supabase, "state_appellate_judge");
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

  if (error) throw error;
  return parseOfficialRows(data);
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
