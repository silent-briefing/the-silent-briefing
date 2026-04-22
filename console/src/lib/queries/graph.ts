import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfPostgrestError } from "@/lib/supabase/postgrest-error";
import type { Database } from "@/lib/supabase/types";

import {
  entityEdgeRowSchema,
  entityRowSchema,
  type EntityEdgeRow,
  type EntityRow,
} from "./schemas";

const EDGE_COLUMNS =
  "id, source_entity_id, target_entity_id, relation, confidence, status, created_at";

const ENTITY_COLUMNS = "id, type, canonical_name";

export async function getAcceptedEdgesForEntity(
  supabase: SupabaseClient<Database>,
  entityId: string,
): Promise<EntityEdgeRow[]> {
  const { data, error } = await supabase
    .from("entity_edges")
    .select(EDGE_COLUMNS)
    .eq("status", "accepted")
    .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`);

  throwIfPostgrestError(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => entityEdgeRowSchema.parse(r));
}

export async function getEntitiesByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<EntityRow[]> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length === 0) return [];

  const { data, error } = await supabase.from("entities").select(ENTITY_COLUMNS).in("id", uniq);

  throwIfPostgrestError(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => entityRowSchema.parse(r));
}

/** Aggregate accepted edges for each id in `fetchRootIds`, then load all endpoint entities (+ root). */
export async function loadEntityGraphSnapshot(
  supabase: SupabaseClient<Database>,
  rootEntityId: string,
  fetchRootIds: Iterable<string>,
): Promise<{ edges: EntityEdgeRow[]; entities: EntityRow[] }> {
  const roots = [...new Set(fetchRootIds)];
  const edgeMap = new Map<string, EntityEdgeRow>();
  await Promise.all(
    roots.map(async (id) => {
      const rows = await getAcceptedEdgesForEntity(supabase, id);
      for (const e of rows) edgeMap.set(e.id, e);
    }),
  );
  const edges = [...edgeMap.values()];
  const ids = new Set<string>([rootEntityId]);
  for (const e of edges) {
    ids.add(e.source_entity_id);
    ids.add(e.target_entity_id);
  }
  const entities = await getEntitiesByIds(supabase, [...ids]);
  return { edges, entities };
}
