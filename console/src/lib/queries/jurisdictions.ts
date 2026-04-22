import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

export type JurisdictionOption = {
  id: string;
  name: string;
  slug: string;
  level: string;
  parent_id: string | null;
};

export async function listJurisdictionOptions(
  supabase: SupabaseClient<Database>,
): Promise<JurisdictionOption[]> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id, name, slug, level, parent_id")
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  throwIfPostgrestError(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    level: String(r.level),
    parent_id: r.parent_id == null ? null : String(r.parent_id),
  }));
}

export async function getJurisdictionLabel(
  supabase: SupabaseClient<Database>,
  jurisdictionId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("name, slug")
    .eq("id", jurisdictionId)
    .maybeSingle();
  if (error || !data) return null;
  if (typeof data.name === "string" && data.name.trim()) return data.name.trim();
  if (typeof data.slug === "string" && data.slug.trim()) return data.slug.trim();
  return null;
}
