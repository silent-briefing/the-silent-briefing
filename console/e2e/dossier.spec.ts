import { expect, test } from "@playwright/test";

test.describe("dossier tabs", () => {
  test("justice-hagen claims tab settles after load", async ({ page }) => {
    await page.goto("/judicial/justice-hagen");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole("region", { name: /dossier overview/i })).toBeVisible();

    await page.getByRole("tab", { name: /^claims$/i }).click();

    const loading = page.getByText(/^loading claims/i);
    await expect(loading).toBeHidden({ timeout: 30_000 });

    const region = page.getByRole("region", { name: /dossier claims/i });
    await expect(region).toBeVisible();
    await expect(region.getByText(/^loading claims/i)).toHaveCount(0);
  });

  test("justice-hagen timeline tab settles after load", async ({ page }) => {
    await page.goto("/judicial/justice-hagen");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /^timeline$/i }).click();

    const loading = page.getByText(/^loading timeline/i);
    await expect(loading).toBeHidden({ timeout: 30_000 });

    const region = page.getByRole("region", { name: /dossier timeline/i });
    await expect(region).toBeVisible();
    await expect(region.getByText(/^loading timeline/i)).toHaveCount(0);
  });

  test("justice-hagen adversarial tab settles after load", async ({ page }) => {
    await page.goto("/judicial/justice-hagen");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /^adversarial$/i }).click();

    const loading = page.getByText(/^loading adversarial review/i);
    await expect(loading).toBeHidden({ timeout: 30_000 });

    const region = page.getByRole("region", { name: /adversarial review/i });
    await expect(region).toBeVisible();
    await expect(region.getByText(/^loading adversarial review/i)).toHaveCount(0);
  });

  test("justice-hagen graph tab settles after load", async ({ page }) => {
    await page.goto("/judicial/justice-hagen");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /^graph$/i }).click();

    const loading = page.getByText(/^loading graph/i);
    await expect(loading).toBeHidden({ timeout: 30_000 });

    const region = page.getByRole("region", { name: /entity graph/i });
    await expect(region).toBeVisible();
    await expect(
      region.getByTestId("graph-canvas").or(region.getByText(/no entity is linked/i)),
    ).toBeVisible();
  });

  test("justice-hagen feed tab settles after load", async ({ page }) => {
    await page.goto("/judicial/justice-hagen");
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("sign-in")) {
      test.skip();
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /^feed$/i }).click();

    const loading = page.getByText(/^loading feeds/i);
    await expect(loading).toBeHidden({ timeout: 30_000 });

    const region = page.getByRole("region", { name: /news and feeds/i });
    await expect(region).toBeVisible();
    await expect(region.getByText(/^loading feeds/i)).toHaveCount(0);
  });
});
