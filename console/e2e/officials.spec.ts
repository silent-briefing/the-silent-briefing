import { expect, test } from "@playwright/test";

test.describe("officials hub", () => {
  test("loads roster chrome", async ({ page }) => {
    await page.goto("/officials");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1, name: /^officials$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/^loading officials/i)).toBeHidden({ timeout: 30_000 });
  });
});
