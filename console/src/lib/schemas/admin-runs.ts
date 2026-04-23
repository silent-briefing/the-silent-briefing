import { z } from "zod";

/** One row from `public.intelligence_runs` (admin BFF). */
export const intelRunRowSchema = z.object({
  id: z.string(),
  candidate_id: z.string().nullable().optional(),
  official_id: z.string().nullable().optional(),
  model_id: z.string().nullable().optional(),
  pipeline_stage: z.string(),
  status: z.string(),
  error_message: z.string().nullable().optional(),
  tokens_input: z.number().nullable().optional(),
  tokens_output: z.number().nullable().optional(),
  cost_usd: z.union([z.string(), z.number()]).nullable().optional(),
  raw_response: z.unknown().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  groundedness_score: z.union([z.string(), z.number()]).nullable().optional(),
  requires_human_review: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type IntelRunRow = z.infer<typeof intelRunRowSchema>;

export const intelRunsListResponseSchema = z.object({
  items: z.array(intelRunRowSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type IntelRunsListResponse = z.infer<typeof intelRunsListResponseSchema>;

export const intelRunDetailResponseSchema = z.object({
  run: intelRunRowSchema,
});

export type IntelRunDetailResponse = z.infer<typeof intelRunDetailResponseSchema>;

export const triggerCatalogJobSchema = z.object({
  job_id: z.string(),
  title: z.string(),
  description: z.string(),
  requires_official_id: z.boolean(),
  requires_subject: z.boolean(),
  requires_correlation_text: z.boolean(),
});

export const triggerCatalogResponseSchema = z.object({
  jobs: z.array(triggerCatalogJobSchema),
});

export type TriggerCatalogJob = z.infer<typeof triggerCatalogJobSchema>;

export const triggerRunResponseSchema = z.object({
  run_id: z.string(),
  status: z.string(),
  idempotency_key: z.string(),
});

export function isTerminalRunStatus(status: string): boolean {
  return status === "succeeded" || status === "failed" || status === "partial";
}
