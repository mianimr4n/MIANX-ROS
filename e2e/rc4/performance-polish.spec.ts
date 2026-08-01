/**
 * RC4-7 Performance & Polish — Playwright + axe on critical surfaces.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-performance-polish/screenshots");
mkdirSync(SHOTS, { recursive: true });

async function axeSerious(page: import("@playwright/test").Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("RC4-7 Performance & Polish", () => {
  test("Login axe + Home no horizontal overflow @390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${WEB}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: resolve(SHOTS, "login-mobile.png"), fullPage: true });
    expect(await axeSerious(page), "login axe").toEqual([]);

    await page.goto(`${WEB}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.screenshot({ path: resolve(SHOTS, "home-mobile.png"), fullPage: true });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow, "home horizontal overflow").toBeFalsy();
  });

  test("Admin dashboard + loyalty: lazy route + axe @1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);

    const started = Date.now();
    await page.goto(`${WEB}/admin/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Executive|Owner|Dashboard|Command/i).first()).toBeVisible({
      timeout: 60_000,
    });
    const dashboardMs = Date.now() - started;
    await page.screenshot({ path: resolve(SHOTS, "admin-dashboard-desktop.png"), fullPage: true });
    expect(await axeSerious(page), JSON.stringify((await axeSerious(page)).map((v) => v.id))).toEqual([]);

    const loyaltyStarted = Date.now();
    await page.goto(`${WEB}/admin/loyalty`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByText(/Reward catalogue|Loyalty|LIVE/i).first()).toBeVisible({ timeout: 60_000 });
    const loyaltyMs = Date.now() - loyaltyStarted;
    await page.screenshot({ path: resolve(SHOTS, "admin-loyalty-desktop.png"), fullPage: true });
    expect(await axeSerious(page)).toEqual([]);

    // Soft timing evidence (not a load-test certification).
    expect(dashboardMs).toBeLessThan(90_000);
    expect(loyaltyMs).toBeLessThan(90_000);
  });

  test("Planned modules removed from primary nav; deep link remains honest", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: /^Support$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /AI Command Center/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Integrations$/i })).toHaveCount(0);

    await page.goto(`${WEB}/admin/support`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByText(/^Planned$/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/not part of the current operating release/i)).toBeVisible();
    await page.screenshot({ path: resolve(SHOTS, "support-planned-deeplink.png"), fullPage: true });
    expect(await axeSerious(page)).toEqual([]);
  });
});
