import { expect, test } from "@playwright/test";

test.describe("admin media", () => {
  test("media page loads for admin", async ({ page }) => {
    await page.goto("/admin/media");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^media coverage$/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
