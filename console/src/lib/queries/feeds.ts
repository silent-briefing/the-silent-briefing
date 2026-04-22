import { bffJson } from "@/lib/bff/client";

import { officialFeedsResponseSchema } from "./schemas";

/**
 * Operator feeds (X / Perplexity aggregation) — `GET /v1/console/feeds/{official_id}`.
 * Backend route is a stub until Phase B.11; client + Zod are ready.
 */
export async function fetchOfficialFeedsViaBff(
  getToken: () => Promise<string | null>,
  officialId: string,
): Promise<ReturnType<typeof officialFeedsResponseSchema.parse>> {
  const id = encodeURIComponent(officialId);
  return bffJson({
    path: `/v1/console/feeds/${id}`,
    getToken,
    schema: officialFeedsResponseSchema,
  });
}
