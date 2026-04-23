import { z } from "zod";

export const queueOfficialEmbedSchema = z.object({
  full_name: z.string(),
  slug: z.string(),
});

export const dossierQueueItemSchema = z.object({
  id: z.string().uuid(),
  claim_text: z.string(),
  category: z.string(),
  official_id: z.string().uuid().nullable(),
  groundedness_score: z.number().nullable().optional(),
  requires_human_review: z.boolean(),
  pipeline_stage: z.string(),
  published: z.boolean(),
  created_at: z.string(),
  critique: z.record(z.string(), z.unknown()).nullable().optional(),
  officials: queueOfficialEmbedSchema.nullable().optional(),
});

export type DossierQueueItem = z.infer<typeof dossierQueueItemSchema>;

export const dossierQueueResponseSchema = z.object({
  items: z.array(dossierQueueItemSchema),
  total: z.number(),
});

export type DossierQueueResponse = z.infer<typeof dossierQueueResponseSchema>;

export const claimDetailSchema = z.object({
  id: z.string().uuid(),
  claim_text: z.string(),
  category: z.string(),
  official_id: z.string().uuid().nullable(),
  source_url: z.string().nullable().optional(),
  pipeline_stage: z.string(),
  published: z.boolean(),
  requires_human_review: z.boolean(),
  groundedness_score: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  review_note: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  reviewed_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  critique: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ClaimDetail = z.infer<typeof claimDetailSchema>;

export const officialDossierResponseSchema = z.object({
  official: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    full_name: z.string(),
  }),
  claims: z.array(claimDetailSchema),
});

export type OfficialDossierResponse = z.infer<typeof officialDossierResponseSchema>;
