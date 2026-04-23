import { expect, test } from "@playwright/test";

test.describe("admin sources", () => {
  test("sources list loads for admin", async ({ page }) => {
    await page.goto("/admin/sources");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^source urls$/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
