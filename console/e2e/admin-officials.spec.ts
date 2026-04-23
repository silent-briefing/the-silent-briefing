import { expect, test } from "@playwright/test";

test.describe("admin officials", () => {
  test("list or stub loads when signed in as admin", async ({ page }) => {
    await page.goto("/admin/officials");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^officials$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("link", { name: /new official/i })).toBeVisible();
  });

  test("new official form reachable for admin", async ({ page }) => {
    await page.goto("/admin/officials/new");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || !page.url().includes("/admin/officials/new")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /new official/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });
});
