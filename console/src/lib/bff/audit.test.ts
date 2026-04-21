import { describe, expect, it } from "vitest";

import { recordAdminAudit } from "@/lib/bff/audit";

describe("recordAdminAudit", () => {
  it("accepts a valid draft (Phase A stub — no network)", async () => {
    await expect(
      recordAdminAudit(async () => "tok", {
        action: "settings.update",
        target_type: "feature_flag",
        target_id: "semantic_search",
        after: { enabled: true },
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects invalid draft", async () => {
    await expect(
      recordAdminAudit(async () => "tok", {
        action: "",
        target_type: "x",
      }),
    ).rejects.toThrow();
  });
});
