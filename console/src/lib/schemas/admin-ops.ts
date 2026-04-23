import { z } from "zod";

export const extractionSourceStatSchema = z.object({
  source_type: z.string(),
  last_fetched_at: z.string().nullable().optional(),
  sample_chunks: z.number(),
});

export const failedRunItemSchema = z.object({
  id: z.string(),
  pipeline_stage: z.string(),
  status: z.string(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const runBriefSchema = z.object({
  id: z.string(),
  pipeline_stage: z.string(),
  status: z.string(),
  model_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  tokens_input: z.number().nullable().optional(),
  tokens_output: z.number().nullable().optional(),
});

export const stageLatencySchema = z.object({
  pipeline_stage: z.string(),
  avg_duration_seconds: z.number().nullable().optional(),
  sample_count: z.number(),
});

export const dataQualitySchema = z.object({
  dossier_claims_without_official: z.number(),
  current_officials_total: z.number(),
  distinct_officials_with_claims: z.number(),
  claims_scan_truncated: z.boolean(),
  stale_officials_in_sample: z.number(),
  stale_officials_sample_size: z.number(),
  retrieval_stale_days: z.number(),
});

export const opsSummaryResponseSchema = z.object({
  api_status: z.string(),
  api_version: z.string(),
  worker_cli: z.record(z.string(), z.unknown()),
  links: z.record(z.string(), z.string().nullable().optional()),
  perplexity_last_24h: z.object({
    tokens_input: z.number(),
    tokens_output: z.number(),
    tokens_total: z.number(),
    truncated_sample: z.boolean(),
  }),
  extraction_by_source: z.array(extractionSourceStatSchema),
  recent_failed_runs: z.array(failedRunItemSchema),
  runs_by_stage: z.record(z.string(), z.array(runBriefSchema)),
  stage_latency: z.array(stageLatencySchema),
  data_quality: dataQualitySchema,
});

export type OpsSummaryResponse = z.infer<typeof opsSummaryResponseSchema>;
