import { describe, expect, it, vi } from "vitest";

import { fetchOfficialFeedsViaBff } from "./feeds";

describe("feeds queries", () => {
  it("fetchOfficialFeedsViaBff GETs console feeds path", async () => {
    const envKey = "NEXT_PUBLIC_BFF_BASE_URL";
    const prev = process.env[envKey];
    process.env[envKey] = "http://127.0.0.1:8000";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [{ source: "Perplexity", url: "https://example.com", headline: "Utah court" }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const res = await fetchOfficialFeedsViaBff(async () => "jwt", "550e8400-e29b-41d4-a716-446655440000");
      expect(res.items).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      const url = String(fetchMock.mock.calls[0]![0]);
      expect(url).toContain("/v1/console/feeds/");
      expect(url).toContain("550e8400-e29b-41d4-a716-446655440000");
    } finally {
      vi.unstubAllGlobals();
      if (prev === undefined) delete process.env[envKey];
      else process.env[envKey] = prev;
    }
  });
});
