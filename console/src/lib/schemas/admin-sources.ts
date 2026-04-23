import { z } from "zod";

export const adminSourceUrlItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  kind: z.string(),
  default: z.string(),
  environment_value: z.string(),
  effective: z.string(),
  override_from_database: z.boolean(),
});

export const adminSourcesListResponseSchema = z.object({
  items: z.array(adminSourceUrlItemSchema),
});

export type AdminSourceUrlItem = z.infer<typeof adminSourceUrlItemSchema>;
