import type { DossierClaimRow } from "./schemas";
import { claimHasAdversarialFlag } from "./schemas";

/** Matches `ClaimStatus` in `StatusDot` — kept here to avoid lib importing UI. */
export type EditorialClaimStatus = "vetted" | "pending" | "flagged";

/** Operator RLS surfaces writer + human_edit; map to editorial status dots. */
export function pipelineStageToClaimStatus(stage: DossierClaimRow["pipeline_stage"]): EditorialClaimStatus {
  if (stage === "human_edit") return "vetted";
  if (stage === "writer_sonar") return "pending";
  if (stage === "critique_sonar") return "flagged";
  return "pending";
}

/** B.6: icon when metadata flags human review or adversarial signal. */
export function claimShowsAdversarialBadge(row: DossierClaimRow): boolean {
  const m = row.metadata;
  if (m && typeof m === "object" && "requires_human_review" in m && m.requires_human_review === true) {
    return true;
  }
  return claimHasAdversarialFlag(row);
}

export type ClaimCategoryGroup = { category: string; claims: DossierClaimRow[] };

export function groupClaimsByCategory(claims: DossierClaimRow[]): ClaimCategoryGroup[] {
  const map = new Map<string, DossierClaimRow[]>();
  for (const c of claims) {
    const key = c.category?.trim() || "Uncategorized";
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  }
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b, "en"));
  return keys.map((category) => ({
    category,
    claims: map.get(category)!,
  }));
}

export type ClaimVirtualRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "claim"; key: string; claim: DossierClaimRow };

export function flattenClaimsForVirtual(groups: ClaimCategoryGroup[]): ClaimVirtualRow[] {
  const out: ClaimVirtualRow[] = [];
  for (const g of groups) {
    out.push({ kind: "header", key: `h:${g.category}`, label: g.category });
    for (const c of g.claims) {
      out.push({ kind: "claim", key: c.id, claim: c });
    }
  }
  return out;
}
