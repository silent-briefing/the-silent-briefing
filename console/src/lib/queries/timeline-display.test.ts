import { describe, expect, it } from "vitest";

import { denverCalendarDayKey, groupClaimsByDenverDay } from "./timeline-display";
import type { DossierClaimRow } from "./schemas";

function row(id: string, created_at: string): DossierClaimRow {
  return {
    id,
    official_id: null,
    claim_text: "x",
    category: "Bio",
    pipeline_stage: "writer_sonar",
    source_url: null,
    published: true,
    metadata: {},
    created_at,
    updated_at: created_at,
  };
}

describe("timeline-display", () => {
  it("denverCalendarDayKey uses Mountain Time", () => {
    const k = denverCalendarDayKey("2026-06-15T06:00:00.000Z");
    expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("groups by day and sorts days chronologically", () => {
    const g = groupClaimsByDenverDay([
      row("b", "2026-01-02T12:00:00Z"),
      row("a", "2026-01-01T12:00:00Z"),
      row("c", "2026-01-01T18:00:00Z"),
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]!.claims.map((c) => c.id)).toContain("a");
    expect(g[0]!.claims.map((c) => c.id)).toContain("c");
    expect(g[1]!.claims.map((c) => c.id)).toEqual(["b"]);
  });
});
