import { z } from "zod";

/** `GET /v1/admin/health` */
export const adminHealthResponseSchema = z.object({
  user_id: z.string(),
  role: z.string().nullable(),
});

export type AdminHealthResponse = z.infer<typeof adminHealthResponseSchema>;
