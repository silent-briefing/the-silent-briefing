import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type AdminDashboardStats = {
  officialsActive: number;
  claimsNeedReview: number;
  proposedEdges: number;
};

/**
 * Best-effort counts for `/admin` tiles. Fails soft (zeros) if RLS denies a table or columns drift.
 */
export async function fetchAdminDashboardStats(
  supabase: SupabaseClient<Database>,
): Promise<AdminDashboardStats> {
  const empty: AdminDashboardStats = {
    officialsActive: 0,
    claimsNeedReview: 0,
    proposedEdges: 0,
  };

  try {
    const [o, c, e] = await Promise.all([
      supabase.from("officials").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("dossier_claims").select("id", { count: "exact", head: true }).eq("requires_human_review", true),
      supabase.from("entity_edges").select("id", { count: "exact", head: true }).eq("status", "proposed"),
    ]);

    if (o.error || c.error || e.error) {
      return {
        officialsActive: o.error ? 0 : (o.count ?? 0),
        claimsNeedReview: c.error ? 0 : (c.count ?? 0),
        proposedEdges: e.error ? 0 : (e.count ?? 0),
      };
    }

    return {
      officialsActive: o.count ?? 0,
      claimsNeedReview: c.count ?? 0,
      proposedEdges: e.count ?? 0,
    };
  } catch {
    return empty;
  }
}
