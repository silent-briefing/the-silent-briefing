import { describe, expect, it, vi } from "vitest";

import { getClerkSupabaseAccessToken } from "./clerk-token";

describe("getClerkSupabaseAccessToken", () => {
  it("uses supabase template when it returns a token", async () => {
    const getToken = vi
      .fn()
      .mockImplementation(async (opts?: { template?: string }) =>
        opts?.template === "supabase" ? "jwt-a" : "jwt-default",
      );
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBe("jwt-a");
  });

  it("falls back to default session token when template throws", async () => {
    const getToken = vi.fn().mockImplementation(async (opts?: { template?: string }) => {
      if (opts?.template === "supabase") throw new Error("JWT template not found");
      return "jwt-default";
    });
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBe("jwt-default");
  });

  it("returns null when both paths fail", async () => {
    const getToken = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBeNull();
  });
});
