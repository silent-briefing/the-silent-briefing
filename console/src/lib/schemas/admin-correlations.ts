import { z } from "zod";

/** TanStack Query prefix for `GET /v1/admin/correlations/proposed` (all filter variants). */
export const ADMIN_CORRELATIONS_QUERY_PREFIX = "admin-correlations-proposed" as const;

export const entityRefSchema = z.object({
  id: z.string(),
  canonical_name: z.string(),
  entity_type: z.string().nullable().optional(),
});

export const proposedEdgeItemSchema = z.object({
  id: z.string(),
  source_entity_id: z.string(),
  target_entity_id: z.string(),
  source: entityRefSchema,
  target: entityRefSchema,
  relation: z.string(),
  confidence: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  provenance: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProposedEdgeItem = z.infer<typeof proposedEdgeItemSchema>;

export const proposedEdgesResponseSchema = z.object({
  items: z.array(proposedEdgeItemSchema),
  total: z.number(),
});

export type ProposedEdgesResponse = z.infer<typeof proposedEdgesResponseSchema>;

export const batchAcceptResponseSchema = z.object({
  updated: z.number(),
});
