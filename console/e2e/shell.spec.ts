import { expect, test } from "@playwright/test";

test.describe("auth gate + chrome", () => {
  test("GET /api/health is public", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  test("home is either Clerk sign-in or operator shell (keyless dev shows shell)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    if (url.includes("sign-in")) {
      await expect(page).toHaveURL(/sign-in/);
    } else {
      await expect(
        page.getByRole("navigation", { name: /operator navigation/i }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: /morning brief/i })).toBeVisible();
    }
  });

  test("admin is either Clerk sign-in or admin shell", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    if (url.includes("sign-in")) {
      await expect(page).toHaveURL(/sign-in/);
    } else {
      await expect(
        page.getByRole("navigation", { name: /admin navigation/i }),
      ).toBeVisible();
      await expect(page.getByText("ADMIN")).toBeVisible();
    }
  });
});
