import { describe, expect, it } from "vitest";

import { officialsFiltersFromSearchParams, officialsFiltersToSearchParams } from "./officials-url-filters";

describe("officials-url-filters", () => {
  it("defaults current to true when param missing", () => {
    const f = officialsFiltersFromSearchParams(new URLSearchParams());
    expect(f.isCurrent).toBe(true);
  });

  it("round-trips jurisdiction + office", () => {
    const f = {
      jurisdictionId: "550e8400-e29b-41d4-a716-446655440000",
      officeType: "state_supreme_justice",
      party: null,
      subjectAlignment: null,
      isCurrent: null,
    };
    const sp = officialsFiltersToSearchParams(f);
    expect(officialsFiltersFromSearchParams(sp)).toEqual(f);
  });
});
