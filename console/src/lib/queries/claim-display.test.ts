import { describe, expect, it } from "vitest";

import {
  claimShowsAdversarialBadge,
  flattenClaimsForVirtual,
  groupClaimsByCategory,
  pipelineStageToClaimStatus,
} from "./claim-display";
import type { DossierClaimRow } from "./schemas";

function row(partial: Partial<DossierClaimRow> & Pick<DossierClaimRow, "id">): DossierClaimRow {
  return {
    official_id: null,
    claim_text: "x",
    category: "Bio",
    pipeline_stage: "writer_sonar",
    source_url: null,
    published: true,
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("claim-display", () => {
  it("maps pipeline stages", () => {
    expect(pipelineStageToClaimStatus("human_edit")).toBe("vetted");
    expect(pipelineStageToClaimStatus("writer_sonar")).toBe("pending");
    expect(pipelineStageToClaimStatus("critique_sonar")).toBe("flagged");
  });

  it("groups and sorts categories", () => {
    const grouped = groupClaimsByCategory([
      row({ id: "1", category: "Zebra" }),
      row({ id: "2", category: "Alpha" }),
      row({ id: "3", category: "Alpha" }),
    ]);
    expect(grouped.map((g) => g.category)).toEqual(["Alpha", "Zebra"]);
    expect(grouped[0]!.claims).toHaveLength(2);
  });

  it("flattens for virtual list", () => {
    const flat = flattenClaimsForVirtual(
      groupClaimsByCategory([row({ id: "a", category: "One" }), row({ id: "b", category: "One" })]),
    );
    expect(flat[0]).toMatchObject({ kind: "header", label: "One" });
    expect(flat.filter((r) => r.kind === "claim")).toHaveLength(2);
  });

  it("detects adversarial badge from metadata", () => {
    expect(claimShowsAdversarialBadge(row({ id: "1", metadata: { requires_human_review: true } }))).toBe(
      true,
    );
    expect(claimShowsAdversarialBadge(row({ id: "2", metadata: { adversarial: true } }))).toBe(true);
    expect(claimShowsAdversarialBadge(row({ id: "3", metadata: {} }))).toBe(false);
  });
});
