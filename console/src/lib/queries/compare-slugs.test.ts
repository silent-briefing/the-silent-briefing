import { describe, expect, it } from "vitest";

import {
  compareSlugsToSearchParams,
  MAX_COMPARE_OFFICIALS,
  parseCompareSlugs,
  pairKeySlug,
} from "./compare-slugs";

describe("compare-slugs", () => {
  it("parses comma list and de-dupes", () => {
    const sp = new URLSearchParams("s=a,b,a");
    expect(parseCompareSlugs(sp)).toEqual(["a", "b"]);
  });

  it("caps at max", () => {
    const many = Array.from({ length: 10 }, (_, i) => `j${i}`).join(",");
    const sp = new URLSearchParams(`s=${many}`);
    expect(parseCompareSlugs(sp)).toHaveLength(MAX_COMPARE_OFFICIALS);
  });

  it("round-trips", () => {
    const sp = compareSlugsToSearchParams(["justice-hagen", "justice-pohlman"]);
    expect(parseCompareSlugs(sp)).toEqual(["justice-hagen", "justice-pohlman"]);
  });

  it("pairKeySlug is stable", () => {
    expect(pairKeySlug("b", "a")).toBe("a::b");
  });
});
