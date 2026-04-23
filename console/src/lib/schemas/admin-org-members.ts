import { z } from "zod";

export const appRoleSchema = z.enum(["admin", "operator", "viewer"]);

export const orgMemberRowSchema = z.object({
  user_id: z.string(),
  email: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  clerk_org_role: z.string(),
  app_role: appRoleSchema,
});

export const orgMembersListResponseSchema = z.object({
  items: z.array(orgMemberRowSchema),
  total_count: z.number(),
});

export type OrgMemberRow = z.infer<typeof orgMemberRowSchema>;
export type AppRole = z.infer<typeof appRoleSchema>;
