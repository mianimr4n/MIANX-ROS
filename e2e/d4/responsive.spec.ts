import { test, expect } from "@playwright/test";
import { browserLogin, enterpriseAccount, writeEvidence } from "../d3/helpers";

test.describe("D4 responsive smoke", () => {
  test("branch manager dashboard at mobile/tablet/desktop widths", async ({ page }) => {
    const acct = enterpriseAccount("branch.manager@telepizza.pk");
    await browserLogin(page, acct.email, acct.password);

    const widths = [
      { name: "mobile", width: 390, height: 844 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1440, height: 900 },
    ];
    const rows: Array<{ viewport: string; overflowX: boolean; result: string }> = [];

    for (const vp of widths) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/admin/branch");
      await page.waitForTimeout(1500);
      const overflowX = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth > el.clientWidth + 2;
      });
      rows.push({
        viewport: vp.name,
        overflowX,
        result: overflowX ? "PARTIAL" : "PASS",
      });
      expect(overflowX).toBeFalsy();
    }

    writeEvidence("d4-responsive.json", { rows, accessibilityNote: "Focus/contrast manual follow-up required for full a11y gate." });
  });
});
