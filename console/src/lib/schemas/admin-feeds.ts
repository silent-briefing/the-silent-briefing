import { z } from "zod";

export const operatorFeedsStateSchema = z.object({
  cache_seconds: z.number(),
  x_enabled: z.boolean(),
  perplexity_enabled: z.boolean(),
  opt_out_official_ids: z.array(z.string()),
});

export const operatorFeedsResponseSchema = z.object({
  stored: operatorFeedsStateSchema,
  effective: operatorFeedsStateSchema,
});

export type OperatorFeedsResponse = z.infer<typeof operatorFeedsResponseSchema>;
