import { z } from "zod";

export const mediaRowSchema = z.object({
  id: z.string(),
  headline: z.string(),
  outlet: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  published: z.boolean(),
  published_at: z.string().nullable().optional(),
  fetched_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  official_ids: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const mediaListResponseSchema = z.object({
  items: z.array(mediaRowSchema),
  total: z.number(),
});

export type MediaRow = z.infer<typeof mediaRowSchema>;

/** Create + edit form payload (edit sends PATCH with only defined fields from parent). */
export const mediaFormSchema = z
  .object({
    headline: z.string().min(1, "Headline required"),
    outlet: z.string().optional(),
    source_url: z.string().optional(),
    summary: z.string().optional(),
    published: z.boolean(),
    published_at: z.string().optional(),
    fetched_at: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const u = val.source_url?.trim();
    if (u && !URL.canParse(u)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid URL", path: ["source_url"] });
    }
  });

export type MediaFormValues = z.infer<typeof mediaFormSchema>;
