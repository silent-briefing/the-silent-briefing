import { expect, test } from "@playwright/test";

test.describe("admin users", () => {
  test("users page loads for admin", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in") || page.url().includes("denied=admin-required")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { name: /^users & roles$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /invite member/i })).toBeVisible();
  });
});
