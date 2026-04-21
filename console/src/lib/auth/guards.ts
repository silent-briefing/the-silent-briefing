import type { Role } from "./roles";

/** Resolve app role from Clerk session claims (`public_metadata.role`). */
export function roleFromSessionClaims(claims: unknown): Role | undefined {
  if (!claims || typeof claims !== "object") return undefined;
  const c = claims as { public_metadata?: { role?: string } };
  const r = c.public_metadata?.role;
  if (r === "admin" || r === "operator" || r === "viewer") return r;
  return undefined;
}
