import { describe, expect, it, vi } from "vitest";

import { countUnreadAlerts, listOrgAlerts, markAlertRead } from "./alerts";
import { createSupabaseQueryMock } from "./test-utils";

const sampleAlert = {
  id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  org_id: "org_123",
  kind: "retrieval_complete",
  target_type: "official",
  target_id: "550e8400-e29b-41d4-a716-446655440000",
  payload: { title: "Done", body: "Stages written", href: "/judicial/foo" },
  delivered_at: "2026-01-01T00:00:00.000Z",
  read_at: null,
};

describe("alerts queries", () => {
  it("listOrgAlerts returns parsed rows", async () => {
    const client = createSupabaseQueryMock({ data: [sampleAlert], error: null });
    const rows = await listOrgAlerts(client, "org_123");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("retrieval_complete");
    expect(rows[0]!.payload.href).toBe("/judicial/foo");
    expect(client.from).toHaveBeenCalledWith("alerts");
  });

  it("countUnreadAlerts returns count", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => Promise.resolve({ count: 4, error: null })),
          })),
        })),
      })),
    } as never;
    const n = await countUnreadAlerts(client, "org_123");
    expect(n).toBe(4);
  });

  it("markAlertRead updates row", async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const update = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ update })) } as never;
    await markAlertRead(client, sampleAlert.id, "2026-01-02T00:00:00.000Z");
    expect(update).toHaveBeenCalledWith({ read_at: "2026-01-02T00:00:00.000Z" });
    expect(eq).toHaveBeenCalledWith("id", sampleAlert.id);
  });
});
