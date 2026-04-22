import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

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
