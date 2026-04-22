import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { entityEdgeRowSchema, type EntityEdgeRow } from "./schemas";

const EDGE_COLUMNS =
  "id, source_entity_id, target_entity_id, relation, confidence, status, created_at";

export async function getAcceptedEdgesForEntity(
  supabase: SupabaseClient<Database>,
  entityId: string,
): Promise<EntityEdgeRow[]> {
  const { data, error } = await supabase
    .from("entity_edges")
    .select(EDGE_COLUMNS)
    .eq("status", "accepted")
    .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);

  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => entityEdgeRowSchema.parse(r));
}
