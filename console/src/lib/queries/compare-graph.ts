import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { pairKeySlug } from "./compare-slugs";
import { getAcceptedEdgesForEntity } from "./graph";
import type { OfficialCardRow } from "./schemas";

/** Direct accepted edges between each pair of officials (by `entity_id`). */
export async function computeSharedSlugPairs(
  supabase: SupabaseClient<Database>,
  officials: OfficialCardRow[],
): Promise<Set<string>> {
  const out = new Set<string>();
  const uniqueEntities = [...new Set(officials.map((o) => o.entity_id).filter(Boolean))] as string[];

  const edgeLists = new Map<string, Awaited<ReturnType<typeof getAcceptedEdgesForEntity>>>();
  for (const eid of uniqueEntities) {
    edgeLists.set(eid, await getAcceptedEdgesForEntity(supabase, eid));
  }

  for (let i = 0; i < officials.length; i++) {
    for (let j = i + 1; j < officials.length; j++) {
      const oi = officials[i]!;
      const oj = officials[j]!;
      const ei = oi.entity_id;
      const ej = oj.entity_id;
      if (!ei || !ej || ei === ej) continue;
      const edges = edgeLists.get(ei) ?? [];
      const hit = edges.some(
        (e) =>
          (e.source_entity_id === ei && e.target_entity_id === ej) ||
          (e.source_entity_id === ej && e.target_entity_id === ei),
      );
      if (hit) out.add(pairKeySlug(oi.slug, oj.slug));
    }
  }
  return out;
}
