import { expect, test } from "@playwright/test";

test.describe("admin correlations", () => {
  test("correlations page loads for admin", async ({ page }) => {
    await page.goto("/admin/correlations");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^correlations$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /apply filters/i })).toBeVisible();
  });
});
