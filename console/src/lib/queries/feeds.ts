import { bffJson } from "@/lib/bff/client";

import { officialFeedsResponseSchema } from "./schemas";

/**
 * Operator feeds (X / Perplexity aggregation) — `GET /v1/feeds/{official_id}`.
 * Backend returns `items: []` until Phase B.11; validates shape with Zod.
 */
export async function fetchOfficialFeedsViaBff(
  getToken: () => Promise<string | null>,
  officialId: string,
): Promise<ReturnType<typeof officialFeedsResponseSchema.parse>> {
  const id = encodeURIComponent(officialId);
  return bffJson({
    path: `/v1/feeds/${id}`,
    getToken,
    schema: officialFeedsResponseSchema,
  });
}
