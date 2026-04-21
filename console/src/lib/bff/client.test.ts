import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BffHttpError, bffJson } from "@/lib/bff/client";

const envKey = "NEXT_PUBLIC_BFF_BASE_URL";

describe("bffJson", () => {
  const prev = process.env[envKey];

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prev === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = prev;
    }
  });

  it("throws when base URL missing", async () => {
    delete process.env[envKey];
    await expect(
      bffJson({
        path: "/v1/admin/health",
        getToken: async () => "tok",
        schema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toThrow(/NEXT_PUBLIC_BFF_BASE_URL/);
  });

  it("throws when not signed in", async () => {
    process.env[envKey] = "http://127.0.0.1:8000";
    await expect(
      bffJson({
        path: "/v1/admin/health",
        getToken: async () => null,
        schema: z.object({ user_id: z.string() }),
      }),
    ).rejects.toThrow(/Not signed in/);
  });

  it("parses JSON with schema on success", async () => {
    process.env[envKey] = "http://127.0.0.1:8000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ user_id: "u_1", role: "admin" }),
      }),
    );

    const data = await bffJson({
      path: "/v1/admin/health",
      getToken: async () => "jwt",
      schema: z.object({
        user_id: z.string(),
        role: z.string().nullable(),
      }),
    });

    expect(data).toEqual({ user_id: "u_1", role: "admin" });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/admin/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
        }),
      }),
    );
  });

  it("throws BffHttpError on non-OK response", async () => {
    process.env[envKey] = "http://127.0.0.1:8000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ detail: "Insufficient role" }),
      }),
    );

    await expect(
      bffJson({
        path: "/v1/admin/health",
        getToken: async () => "jwt",
        schema: z.object({ user_id: z.string() }),
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BffHttpError && e.status === 403,
    );
  });

  it("rejects response that fails schema parse", async () => {
    process.env[envKey] = "http://127.0.0.1:8000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ wrong: true }),
      }),
    );

    await expect(
      bffJson({
        path: "/x",
        getToken: async () => "jwt",
        schema: z.object({ user_id: z.string() }),
      }),
    ).rejects.toThrow();
  });
});
