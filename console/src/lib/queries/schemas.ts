import { z } from "zod";

/** Row shape for operator lists (subset of `officials`). */
export const officialCardRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  full_name: z.string(),
  office_type: z.string(),
  bio_summary: z.string().nullable(),
  retention_year: z.number().nullable(),
  subject_alignment: z.string().nullable(),
  photo_url: z.string().nullable().optional(),
  jurisdiction_id: z.string().uuid(),
  is_current: z.boolean(),
  entity_id: z.string().uuid().nullable().optional(),
  party: z.string().nullable().optional(),
});

export const entityTypeSchema = z.enum(["person", "bill", "issue", "organization", "race"]);

export const entityRowSchema = z.object({
  id: z.string().uuid(),
  type: entityTypeSchema,
  canonical_name: z.string(),
});

export type EntityRow = z.infer<typeof entityRowSchema>;

export type OfficialCardRow = z.infer<typeof officialCardRowSchema>;

export const pipelineStageSchema = z.enum([
  "retrieval_sonar",
  "writer_sonar",
  "critique_sonar",
  "human_edit",
]);

export const dossierClaimRowSchema = z.object({
  id: z.string().uuid(),
  official_id: z.string().uuid().nullable(),
  claim_text: z.string(),
  category: z.string(),
  pipeline_stage: pipelineStageSchema,
  source_url: z.string().nullable(),
  published: z.boolean(),
  /** DB column is text; may encode a numeric score from intelligence runs. */
  groundedness_score: z.string().nullable().optional(),
  metadata: z.preprocess(
    (v) => (v && typeof v === "object" ? v : {}),
    z.record(z.string(), z.unknown()),
  ),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DossierClaimRow = z.infer<typeof dossierClaimRowSchema>;

export const entityEdgeRowSchema = z.object({
  id: z.string().uuid(),
  source_entity_id: z.string().uuid(),
  target_entity_id: z.string().uuid(),
  relation: z.string(),
  confidence: z.number().nullable().optional(),
  status: z.enum(["proposed", "accepted", "rejected"]),
  created_at: z.string(),
});

export type EntityEdgeRow = z.infer<typeof entityEdgeRowSchema>;

export const savedViewKindSchema = z.enum(["officials", "dossier", "search"]);

export const userSavedViewRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  org_id: z.string(),
  name: z.string(),
  kind: savedViewKindSchema,
  query: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export type UserSavedViewRow = z.infer<typeof userSavedViewRowSchema>;

export const alertRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string(),
  kind: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  payload: z.record(z.string(), z.unknown()),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
});

export type AlertRow = z.infer<typeof alertRowSchema>;

export const semanticSearchHitSchema = z.object({
  title: z.string(),
  score: z.number().optional(),
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  source_url: z.string().nullable().optional(),
  source_type: z.string().nullable().optional(),
});

export type SemanticSearchHit = z.infer<typeof semanticSearchHitSchema>;

export const semanticSearchResponseSchema = z.object({
  results: z.array(semanticSearchHitSchema),
  semantic_available: z.boolean().optional(),
});

export type SemanticSearchResponse = z.infer<typeof semanticSearchResponseSchema>;

export const officialFeedsResponseSchema = z.object({
  items: z.array(
    z.object({
      source: z.string(),
      url: z.string(),
      headline: z.string().optional(),
      published_at: z.string().optional(),
    }),
  ),
});

export type OfficialFeedsResponse = z.infer<typeof officialFeedsResponseSchema>;

export function claimHasAdversarialFlag(row: DossierClaimRow): boolean {
  const m = row.metadata;
  if (m && typeof m === "object" && "adversarial" in m && m.adversarial === true) return true;
  if (row.category.toLowerCase().includes("adversarial")) return true;
  return false;
}
