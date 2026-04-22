import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { bffJson } from "@/lib/bff/client";
import type { Database } from "@/lib/supabase/types";

import { claimHasAdversarialFlag, type DossierClaimRow, type OfficialCardRow } from "./schemas";

export const intelligenceRunRowSchema = z.object({
  id: z.string().uuid(),
  pipeline_stage: z.string(),
  status: z.string(),
  created_at: z.string(),
  error_message: z.string().nullable().optional(),
  official_id: z.string().uuid().nullable().optional(),
  requires_human_review: z.boolean().optional(),
});

export const briefingIntelSummarySchema = z.object({
  total_runs: z.number(),
  recent_runs: z.array(intelligenceRunRowSchema),
});

export type BriefingIntelSummary = z.infer<typeof briefingIntelSummarySchema>;
export type IntelligenceRunRow = z.infer<typeof intelligenceRunRowSchema>;

export async function fetchBriefingIntelSummaryFromBff(
  getToken: () => Promise<string | null>,
  opts?: { recentLimit?: number },
): Promise<BriefingIntelSummary> {
  const lim = opts?.recentLimit ?? 20;
  return bffJson({
    path: `/v1/console/briefing/intel-summary?recent_limit=${lim}`,
    getToken,
    schema: briefingIntelSummarySchema,
  });
}

/** BFF-backed intel tail + total; empty when unsigned, misconfigured, or fetch fails. */
export async function loadBriefingIntelSummaryOrEmpty(
  getToken: () => Promise<string | null>,
  opts?: { recentLimit?: number },
): Promise<BriefingIntelSummary> {
  const empty: BriefingIntelSummary = { total_runs: 0, recent_runs: [] };
  const base = process.env.NEXT_PUBLIC_BFF_BASE_URL;
  if (!base?.trim()) return empty;
  try {
    const token = await getToken();
    if (!token) return empty;
    return await fetchBriefingIntelSummaryFromBff(getToken, opts);
  } catch {
    return empty;
  }
}

export type BriefingPriorityItem = {
  official: OfficialCardRow;
  reasons: Array<"adversarial" | "retention">;
};

function stubClaimForAdversarialCheck(row: {
  official_id: string | null;
  metadata: unknown;
  category: string;
}): DossierClaimRow {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    official_id: row.official_id,
    claim_text: "",
    category: row.category,
    pipeline_stage: "writer_sonar",
    source_url: null,
    published: true,
    groundedness_score: null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: "",
    updated_at: "",
  };
}

/**
 * Top priority Utah supreme justices: adversarial-flagged published claims or retention year in the current/next calendar year.
 */
export async function getBriefingPriorityOfficials(
  supabase: SupabaseClient<Database>,
  utSupreme: OfficialCardRow[],
): Promise<BriefingPriorityItem[]> {
  if (utSupreme.length === 0) return [];
  const ids = utSupreme.map((o) => o.id);
  const { data, error } = await supabase
    .from("dossier_claims")
    .select("official_id, metadata, category")
    .eq("published", true)
    .in("official_id", ids);
  if (error) return [];

  const adversarialIds = new Set<string>();
  for (const row of data ?? []) {
    if (!row.official_id) continue;
    if (claimHasAdversarialFlag(stubClaimForAdversarialCheck(row))) {
      adversarialIds.add(row.official_id);
    }
  }

  const y = new Date().getFullYear();
  const retentionWindow = (ry: number | null) => ry != null && ry >= y && ry <= y + 1;

  const items: BriefingPriorityItem[] = [];
  for (const o of utSupreme) {
    const reasons: Array<"adversarial" | "retention"> = [];
    if (adversarialIds.has(o.id)) reasons.push("adversarial");
    if (retentionWindow(o.retention_year)) reasons.push("retention");
    if (reasons.length) items.push({ official: o, reasons });
  }

  items.sort((a, b) => {
    const aAdv = a.reasons.includes("adversarial") ? 0 : 1;
    const bAdv = b.reasons.includes("adversarial") ? 0 : 1;
    if (aAdv !== bAdv) return aAdv - bAdv;
    const ar = a.official.retention_year ?? 9999;
    const br = b.official.retention_year ?? 9999;
    return ar - br;
  });

  return items.slice(0, 5);
}
