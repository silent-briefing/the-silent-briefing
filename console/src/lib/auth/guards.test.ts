import { describe, expect, it } from "vitest";

import {
  roleFromClerkOrganizationClaims,
  roleFromPublicAndUserClaims,
  roleFromSessionClaims,
} from "./guards";

describe("roleFromSessionClaims", () => {
  it("merges public_metadata admin", () => {
    expect(roleFromSessionClaims({ public_metadata: { role: "admin" } })).toBe("admin");
  });

  it("maps Clerk org admin org_role", () => {
    expect(roleFromClerkOrganizationClaims({ org_role: "org:admin" })).toBe("admin");
    expect(roleFromClerkOrganizationClaims({ org_role: "admin" })).toBe("admin");
  });

  it("maps nested o.rol admin", () => {
    expect(roleFromClerkOrganizationClaims({ o: { rol: "admin" } })).toBe("admin");
  });

  it("picks higher of operator metadata and org admin", () => {
    expect(
      roleFromSessionClaims({
        public_metadata: { role: "operator" },
        org_role: "org:admin",
      }),
    ).toBe("admin");
  });

  it("does not treat org member as admin", () => {
    expect(roleFromClerkOrganizationClaims({ org_role: "org:member" })).toBeUndefined();
  });

  it("exposes metadata-only helper", () => {
    expect(roleFromPublicAndUserClaims({ public_metadata: { role: "viewer" } })).toBe("viewer");
    expect(roleFromPublicAndUserClaims({ role: "operator" })).toBe("operator");
  });
});
