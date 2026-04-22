import { expect, test } from "@playwright/test";

test.describe("compare matrix", () => {
  test("page loads when signed in", async ({ page }) => {
    await page.goto("/compare");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1, name: /^comparison$/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
