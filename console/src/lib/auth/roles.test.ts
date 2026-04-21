import { describe, expect, it } from "vitest";
import { roleAtLeast, type Role } from "./roles";

const cases: [Role | undefined, Role, boolean][] = [
  ["viewer", "viewer", true],
  ["viewer", "operator", false],
  ["viewer", "admin", false],
  ["operator", "viewer", true],
  ["operator", "operator", true],
  ["operator", "admin", false],
  ["admin", "viewer", true],
  ["admin", "operator", true],
  ["admin", "admin", true],
  [undefined, "viewer", false],
  [undefined, "operator", false],
  [undefined, "admin", false],
];

describe("roleAtLeast", () => {
  it.each(cases)("actual=%s required=%s → %s", (actual, required, expected) => {
    expect(roleAtLeast(actual, required)).toBe(expected);
  });
});
