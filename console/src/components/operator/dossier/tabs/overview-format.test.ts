import { describe, expect, it } from "vitest";

import type { OfficialCardRow } from "@/lib/queries/schemas";

import { formatOfficeTypeLabel, overviewKeyFacts } from "./overview-format";

const baseOfficial: OfficialCardRow = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "justice-x",
  full_name: "Justice X",
  office_type: "state_supreme_justice",
  bio_summary: null,
  retention_year: 2026,
  subject_alignment: "GOP",
  photo_url: null,
  jurisdiction_id: "00000000-0000-4000-8000-000000000002",
  is_current: true,
};

describe("overview-format", () => {
  it("formats office type", () => {
    expect(formatOfficeTypeLabel("state_supreme_justice")).toBe("state supreme justice");
  });

  it("overviewKeyFacts passes jurisdiction and flags", () => {
    const f = overviewKeyFacts(baseOfficial, "Utah");
    expect(f.jurisdictionName).toBe("Utah");
    expect(f.retentionYear).toBe(2026);
    expect(f.isCurrent).toBe(true);
  });
});
