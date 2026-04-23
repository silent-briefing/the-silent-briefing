import type { Role } from "./roles";

const RANK: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

function maxRole(a: Role | undefined, b: Role | undefined): Role | undefined {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

/** App roles from Clerk user `public_metadata.role` or legacy top-level `role` claim. */
export function roleFromPublicAndUserClaims(claims: unknown): Role | undefined {
  if (!claims || typeof claims !== "object") return undefined;
  const c = claims as { public_metadata?: { role?: string }; role?: string };
  const fromMeta = c.public_metadata?.role;
  if (fromMeta === "admin" || fromMeta === "operator" || fromMeta === "viewer") return fromMeta;
  const top = c.role;
  if (top === "admin" || top === "operator" || top === "viewer") return top;
  return undefined;
}

/**
 * When an **active** Clerk organization is selected, organization admins get `org_role`
 * (`org:admin` or legacy `admin`) on the session JWT — distinct from Dashboard "org admin"
 * unless the user has switched into that org.
 */
export function roleFromClerkOrganizationClaims(claims: unknown): Role | undefined {
  if (!claims || typeof claims !== "object") return undefined;
  const c = claims as { org_role?: string; o?: { rol?: string } };
  const raw = typeof c.org_role === "string" ? c.org_role.trim().toLowerCase() : "";
  if (raw === "org:admin" || raw === "admin") return "admin";
  const nested = c.o?.rol;
  if (typeof nested === "string" && nested.trim().toLowerCase() === "admin") return "admin";
  return undefined;
}

/**
 * Effective Silent Briefing role for routing and UI: highest of user metadata role and
 * Clerk organization admin (when present on the token).
 */
export function roleFromSessionClaims(claims: unknown): Role | undefined {
  return maxRole(roleFromPublicAndUserClaims(claims), roleFromClerkOrganizationClaims(claims));
}
