import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Top-level shells (sign-in redirect or chrome) — fail on new critical axe issues only. */
const routes = ["/", "/judicial", "/judicial/supreme-court", "/admin"] as const;

test.describe("axe — top routes", () => {
  for (const path of routes) {
    test(`no critical violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const results = await new AxeBuilder({ page }).analyze();
      const critical = results.violations.filter((v) => v.impact === "critical");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }
});
