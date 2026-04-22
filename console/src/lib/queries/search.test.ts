import { describe, expect, it, vi } from "vitest";

import { semanticSearchViaBff, searchOfficialsLexical } from "./search";
import { createSupabaseQueryMock } from "./test-utils";

const sampleOfficial = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  slug: "justice-hagen",
  full_name: "Justice Hagen",
  office_type: "state_supreme_justice",
  bio_summary: null,
  retention_year: null,
  subject_alignment: null,
  photo_url: null,
  jurisdiction_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  is_current: true,
};

describe("search queries", () => {
  it("searchOfficialsLexical returns empty for blank term", async () => {
    const client = createSupabaseQueryMock({ data: [], error: null });
    const rows = await searchOfficialsLexical(client, "   ");
    expect(rows).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("searchOfficialsLexical queries ilike", async () => {
    const client = createSupabaseQueryMock({ data: [sampleOfficial], error: null });
    const rows = await searchOfficialsLexical(client, "Hagen");
    expect(rows).toHaveLength(1);
    expect(client.from).toHaveBeenCalledWith("officials");
  });

  it("semanticSearchViaBff posts to BFF", async () => {
    const envKey = "NEXT_PUBLIC_BFF_BASE_URL";
    const prev = process.env[envKey];
    process.env[envKey] = "http://127.0.0.1:8000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            results: [
              { id: "550e8400-e29b-41d4-a716-446655440000", title: "Dossier preview", score: 0.9 },
            ],
            semantic_available: true,
          }),
      }),
    );

    try {
      const res = await semanticSearchViaBff(async () => "jwt", "utah supreme");
      expect(res.results[0]!.title).toBe("Dossier preview");
      expect(res.semantic_available).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      if (prev === undefined) delete process.env[envKey];
      else process.env[envKey] = prev;
    }
  });
});
