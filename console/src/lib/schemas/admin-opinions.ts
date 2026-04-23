import { z } from "zod";

export const opinionRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  court: z.string().nullable().optional(),
  published: z.boolean(),
  pdf_storage_path: z.string().nullable().optional(),
  ingestion_status: z.string(),
  entity_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const opinionListResponseSchema = z.object({
  items: z.array(opinionRowSchema),
  total: z.number(),
});

export const ragChunkItemSchema = z.object({
  id: z.string(),
  chunk_index: z.number(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().nullable().optional(),
});

export const opinionDetailResponseSchema = z.object({
  opinion: opinionRowSchema,
  chunks: z.array(ragChunkItemSchema),
});

export const opinionCreateResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  run_id: z.string(),
});

export const opinionEdgeCreateResponseSchema = z.object({
  edge_id: z.string(),
});

export type OpinionRow = z.infer<typeof opinionRowSchema>;
