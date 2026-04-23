import { expect, test } from "@playwright/test";

test.describe("admin feeds", () => {
  test("feeds config loads for admin", async ({ page }) => {
    await page.goto("/admin/feeds");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^feeds configuration$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /save feeds config/i })).toBeVisible();
  });
});
