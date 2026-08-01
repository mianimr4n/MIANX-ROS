/**
 * RC4-8 Finance Phase 2 — Playwright + axe scaffold.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-finance-phase2/screenshots");
mkdirSync(SHOTS, { recursive: true });

test.describe("RC4-8 Finance Phase 2", () => {
  test("finance AR/tax honesty surfaces axe clean", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/finance`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/finance`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Accounts receivable — LIVE foundation|Receivables/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: resolve(SHOTS, "finance-ar.png"), fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
