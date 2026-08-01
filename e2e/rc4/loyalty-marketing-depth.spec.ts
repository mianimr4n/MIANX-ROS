/**
 * RC4-11 Loyalty & Marketing Depth — Playwright + axe (local stack).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-loyalty-marketing-depth/screenshots");
mkdirSync(SHOTS, { recursive: true });

async function axeSerious(page: import("@playwright/test").Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("RC4-11 Loyalty & Marketing Depth", () => {
  test("Admin loyalty: rewards catalogue LIVE + tiers/liability honesty + axe", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/loyalty`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/loyalty`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    await expect(page.getByText(/LIVE rewards \+ tiers|Reward catalogue/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/LIVE catalogue API|No rewards configured|Reward catalogue/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Tier definitions|Liability snapshot/i).first()).toBeVisible();
    await expect(page.getByText(/Planned for Phase 2/i)).toHaveCount(0);

    await page.screenshot({ path: resolve(SHOTS, "loyalty-rewards-desktop.png"), fullPage: true });
    const seriousDesktop = await axeSerious(page);
    expect(seriousDesktop, JSON.stringify(seriousDesktop.map((v) => v.id))).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(SHOTS, "loyalty-rewards-mobile.png"), fullPage: true });
    const seriousMobile = await axeSerious(page);
    expect(seriousMobile, JSON.stringify(seriousMobile.map((v) => v.id))).toEqual([]);
  });

  test("Admin marketing: segments/templates honesty + provider note + axe", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/marketing`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/marketing`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }

    await expect(page.getByText(/Audience segments|Message templates/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/provider is not configured|never claim delivered/i).first()).toBeVisible();
    await expect(page.getByText(/awaiting_approval/i).first()).toBeVisible();
    // Honesty: UI must not present fabricated delivery metrics (ok to mention "never claim delivered").
    await expect(page.getByText(/messages delivered|open rate|click rate/i)).toHaveCount(0);

    await page.screenshot({ path: resolve(SHOTS, "marketing-depth-desktop.png"), fullPage: true });
    const serious = await axeSerious(page);
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });

  test("Cashier is denied loyalty manage surface", async ({ page }) => {
    const cashier = enterpriseAccount("cashier@telepizza.pk");
    await browserLogin(page, cashier.email, cashier.password);
    await page.goto(`${WEB}/admin/loyalty`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const url = page.url();
    const createBtn = await page.getByRole("button", { name: /Create draft reward/i }).count();
    const denied =
      /login/i.test(url) ||
      (await page.getByText(/do not have access|access denied|not authorized/i).count()) > 0 ||
      createBtn === 0;
    expect(denied).toBeTruthy();
    await page.screenshot({ path: resolve(SHOTS, "loyalty-cashier-denial.png"), fullPage: true });
  });
});
