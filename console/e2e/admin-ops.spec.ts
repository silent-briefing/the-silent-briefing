import { expect, test } from "@playwright/test";

test.describe("admin engine ops", () => {
  test("ops dashboard loads for admin", async ({ page }) => {
    await page.goto("/admin/ops");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^engine ops$/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
