import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("primitives storyboard", () => {
  test("no critical axe issues when dev page is reachable", async ({ page }) => {
    const response = await page.goto("/_/primitives");
    if (!response || response.status() === 404) {
      test.skip();
      return;
    }
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("heading", { name: /ui primitives storyboard/i }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
