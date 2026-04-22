import { afterEach, describe, expect, it, vi } from "vitest";

import { getClerkSupabaseAccessToken } from "./clerk-token";

const envKey = "NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE";

describe("getClerkSupabaseAccessToken", () => {
  afterEach(() => {
    delete process.env[envKey];
  });

  it("uses supabase template when it returns a token", async () => {
    const getToken = vi
      .fn()
      .mockImplementation(async (opts?: { template?: string }) =>
        opts?.template === "supabase" ? "jwt-a" : "jwt-default",
      );
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBe("jwt-a");
    expect(getToken).toHaveBeenCalledWith({ template: "supabase" });
  });

  it("returns null when template throws (do not send Clerk default JWT to PostgREST)", async () => {
    const getToken = vi.fn().mockImplementation(async (opts?: { template?: string }) => {
      if (opts?.template === "supabase") throw new Error("JWT template not found");
      return "jwt-default";
    });
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBeNull();
    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it("returns null when template resolves empty", async () => {
    const getToken = vi.fn().mockResolvedValue(null);
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBeNull();
  });

  it("returns null when getToken rejects", async () => {
    const getToken = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBeNull();
  });

  it("does not call getToken when template disabled via env (empty)", async () => {
    process.env[envKey] = " ";
    const getToken = vi.fn();
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });

  it("uses custom template name from env", async () => {
    process.env[envKey] = " my_tpl ";
    const getToken = vi
      .fn()
      .mockImplementation(async (opts?: { template?: string }) =>
        opts?.template === "my_tpl" ? "jwt-x" : null,
      );
    await expect(getClerkSupabaseAccessToken(getToken)).resolves.toBe("jwt-x");
    expect(getToken).toHaveBeenCalledWith({ template: "my_tpl" });
  });
});
