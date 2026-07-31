/**
 * RC4-5 Documents — Playwright scaffold (local stack).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-documents/screenshots");
mkdirSync(SHOTS, { recursive: true });

test.describe("RC4-5 Documents", () => {
  test("HR documents panel exposes upload dropzone", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/hr`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/hr`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Employee documents/i).first()).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: resolve(SHOTS, "hr-documents.png"), fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
