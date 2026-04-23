import { z } from "zod";

export const billRowSchema = z.object({
  id: z.string(),
  bill_number: z.string(),
  title: z.string(),
  published: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const billListResponseSchema = z.object({
  items: z.array(billRowSchema),
  total: z.number(),
});

export type BillRow = z.infer<typeof billRowSchema>;
