import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import {
  claimHasAdversarialFlag,
  dossierClaimRowSchema,
  type DossierClaimRow,
} from "./schemas";

const CLAIM_COLUMNS =
  "id, official_id, claim_text, category, pipeline_stage, source_url, published, groundedness_score, metadata, created_at, updated_at";

function parseClaims(data: unknown): DossierClaimRow[] {
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => dossierClaimRowSchema.parse(r));
}

export async function getDossierClaims(
  supabase: SupabaseClient<Database>,
  officialId: string,
  opts?: { limit?: number },
): Promise<DossierClaimRow[]> {
  const limit = opts?.limit ?? 200;
  const { data, error } = await supabase
    .from("dossier_claims")
    .select(CLAIM_COLUMNS)
    .eq("official_id", officialId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return parseClaims(data);
}

export async function getAdversarialFlags(
  supabase: SupabaseClient<Database>,
  officialId: string,
): Promise<DossierClaimRow[]> {
  const claims = await getDossierClaims(supabase, officialId, { limit: 500 });
  return claims.filter(claimHasAdversarialFlag);
}

/** Timeline = published claims ordered for display (same table as dossier; RLS enforces visibility). */
export async function getTimeline(
  supabase: SupabaseClient<Database>,
  officialId: string,
  opts?: { limit?: number },
): Promise<DossierClaimRow[]> {
  const limit = opts?.limit ?? 100;
  const { data, error } = await supabase
    .from("dossier_claims")
    .select(CLAIM_COLUMNS)
    .eq("official_id", officialId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return parseClaims(data);
}
