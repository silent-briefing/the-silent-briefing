import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Axe on our App Router shell only (`iframes: false` — not Clerk’s embedded account UI).
 * Gate: **critical** impact only so hosted Clerk redirects (off-origin sign-in) do not fail CI.
 * For WCAG serious/mod violations on fully rendered operator pages, add a signed-in `storageState` and tighten this assert.
 */
const routes = [
  "/",
  "/judicial",
  "/judicial/supreme-court",
  "/judicial/court-of-appeals",
  "/judicial/district",
  "/judicial/justice-hagen",
  "/officials",
  "/officials/justice-hagen",
  "/search",
  "/graph",
  "/saved",
  "/alerts",
  "/compare",
  "/admin",
] as const;

test.describe("axe — top routes", () => {
  for (const path of routes) {
    test(`no critical violations on app shell ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const results = await new AxeBuilder({ page })
        .options({ iframes: false })
        .analyze();
      const critical = results.violations.filter((v) => v.impact === "critical");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }
});
