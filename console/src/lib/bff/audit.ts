import { z } from "zod";

/** Draft aligned with `admin_audit_log` columns (Phase C persists via BFF). */
export const auditDraftSchema = z.object({
  action: z.string().min(1),
  target_type: z.string().min(1),
  target_id: z.string().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});

export type AuditDraft = z.infer<typeof auditDraftSchema>;

/**
 * Phase C: POST to `/v1/admin/audit-log` (or equivalent) with Clerk bearer token.
 * Phase A: validates `draft` only — no network.
 */
export async function recordAdminAudit(
  _getToken: () => Promise<string | null>,
  draft: AuditDraft,
): Promise<void> {
  auditDraftSchema.parse(draft);
  void _getToken;
}
