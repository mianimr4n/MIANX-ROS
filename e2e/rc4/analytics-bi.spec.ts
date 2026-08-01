/**
 * RC4-2 Analytics & BI — Playwright + axe (local stack).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-analytics-bi/screenshots");
mkdirSync(SHOTS, { recursive: true });

async function axeSerious(page: import("@playwright/test").Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("RC4-2 Analytics & BI", () => {
  test("Owner BI workspace: server envelopes, deferred schedules, axe", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/reports`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/reports`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Owner BI|Business Intelligence|Analytics/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/DEFERRED|deferred|registry|Sales Analytics|Gross sales/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: resolve(SHOTS, "owner-bi-workspace-desktop.png"), fullPage: true });
    const seriousDesktop = await axeSerious(page);
    expect(seriousDesktop, JSON.stringify(seriousDesktop.map((v) => v.id))).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(SHOTS, "owner-bi-workspace-mobile.png"), fullPage: true });
    const seriousMobile = await axeSerious(page);
    expect(seriousMobile, JSON.stringify(seriousMobile.map((v) => v.id))).toEqual([]);
  });

  test("Cashier is denied analytics manage surface", async ({ page }) => {
    const cashier = enterpriseAccount("cashier@telepizza.pk");
    await browserLogin(page, cashier.email, cashier.password);
    await page.goto(`${WEB}/admin/reports`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const url = page.url();
    const denied =
      /login/i.test(url) ||
      (await page.getByText(/access denied|not authorized|permission/i).count()) > 0 ||
      (await page.getByText(/Owner BI Workspace|Gross sales/i).count()) === 0;
    expect(denied).toBeTruthy();
    await page.screenshot({ path: resolve(SHOTS, "analytics-cashier-denial.png"), fullPage: true });
  });
});
