import { describe, expect, it } from "vitest";

import { getBySlug, listSupremeCourt } from "./officials";
import { createSupabaseQueryMock } from "./test-utils";

const sampleOfficial = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  slug: "justice-hagen",
  full_name: "Justice Hagen",
  office_type: "state_supreme_justice",
  bio_summary: null,
  retention_year: 2026,
  subject_alignment: "neutral",
  photo_url: null,
  jurisdiction_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  is_current: true,
};

describe("officials queries", () => {
  it("listSupremeCourt queries officials table", async () => {
    const client = createSupabaseQueryMock({ data: [sampleOfficial], error: null });
    const rows = await listSupremeCourt(client);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.slug).toBe("justice-hagen");
    expect(client.from).toHaveBeenCalledWith("officials");
  });

  it("getBySlug returns null when no row", async () => {
    const client = createSupabaseQueryMock({ data: null, error: null });
    const row = await getBySlug(client, "missing");
    expect(row).toBeNull();
  });

  it("getBySlug parses row", async () => {
    const client = createSupabaseQueryMock({ data: sampleOfficial, error: null });
    const row = await getBySlug(client, "justice-hagen");
    expect(row?.full_name).toBe("Justice Hagen");
  });
});
