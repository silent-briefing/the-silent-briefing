export const ROLES = ["admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const order: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

export function roleAtLeast(actual: Role | undefined, required: Role): boolean {
  if (!actual) return false;
  return order[actual] >= order[required];
}
