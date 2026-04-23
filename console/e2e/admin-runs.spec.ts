import { expect, test } from "@playwright/test";

test.describe("admin intel runs", () => {
  test("runs list loads for admin", async ({ page }) => {
    await page.goto("/admin/runs");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^intel runs$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /trigger run/i })).toBeVisible();
  });
});
