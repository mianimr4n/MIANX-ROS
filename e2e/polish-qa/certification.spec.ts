/**
 * POLISH-QA — headed certification matrix (local / CI-ephemeral only).
 * Asserts axe critical/serious = 0 on representative public + Owner Admin routes.
 * Does not claim full legal WCAG certification.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const OWNER_EMAIL = "admin@telepizza.pk";

function criticalSerious(violations: { impact?: string | null; id: string }[]) {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

async function analyze(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

function assertLocalWeb() {
  const host = new URL(WEB).hostname;
  expect(host === "localhost" || host === "127.0.0.1", `non-local WEB=${WEB}`).toBeTruthy();
}

const PUBLIC_ROUTES = ["/", "/menu", "/admin/login", "/reset-password"] as const;

const OWNER_ROUTES: Array<{ path: string; wait?: RegExp }> = [
  { path: "/admin/dashboard", wait: /Owner Command Center|Executive|Dashboard/i },
  { path: "/admin/orders", wait: /Orders/i },
  { path: "/admin/kitchen", wait: /Kitchen/i },
  { path: "/admin/delivery", wait: /Delivery/i },
  { path: "/admin/inventory", wait: /Inventory/i },
  { path: "/admin/purchasing", wait: /Purchasing/i },
  { path: "/admin/crm", wait: /Customer|CRM/i },
  { path: "/admin/hr", wait: /HR|Workforce/i },
  { path: "/admin/finance", wait: /Finance/i },
  { path: "/admin/reports", wait: /Reports|BI|Business/i },
  { path: "/admin/settings", wait: /Settings/i },
];

test.describe("POLISH-QA headed certification", () => {
  test.describe.configure({ mode: "serial" });

  for (const path of PUBLIC_ROUTES) {
    test(`public axe+overflow desktop: ${path}`, async ({ page }) => {
      assertLocalWeb();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
      const axe = await analyze(page);
      expect(
        criticalSerious(axe.violations),
        JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact }))),
      ).toEqual([]);
      await assertNoOverflow(page);
    });

    test(`public axe+overflow mobile: ${path}`, async ({ page }) => {
      assertLocalWeb();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 60_000 });
      const axe = await analyze(page);
      expect(
        criticalSerious(axe.violations),
        JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact }))),
      ).toEqual([]);
      await assertNoOverflow(page);
    });
  }

  test("Owner Admin representative routes: axe critical/serious = 0 + no overflow", async ({ page }) => {
    assertLocalWeb();
    const account = enterpriseAccount(OWNER_EMAIL);
    await browserLogin(page, account.email, account.password);

    for (const route of OWNER_ROUTES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page).not.toHaveURL(/\/admin\/login/);
      if (route.wait) {
        await expect(page.getByText(route.wait).first()).toBeVisible({ timeout: 60_000 });
      }
      // Allow deferred chrome (status badges / action rows) to settle before axe.
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      const axe = await analyze(page);
      expect(
        criticalSerious(axe.violations),
        `${route.path} ${JSON.stringify(axe.violations.map((v) => ({ id: v.id, impact: v.impact })))}`,
      ).toEqual([]);
      await assertNoOverflow(page);

      await page.setViewportSize({ width: 390, height: 844 });
      await assertNoOverflow(page);
    }
  });

  test("Owner logout clears session; protected route denied", async ({ page }) => {
    assertLocalWeb();
    const account = enterpriseAccount(OWNER_EMAIL);
    await browserLogin(page, account.email, account.password);
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 60_000 });
    await expect(page.getByLabel(/^Email$/i)).toBeVisible({ timeout: 60_000 });

    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    // Signed-out users see login or AdminShell "Staff access required" (URL may vary).
    await expect(
      page
        .getByLabel(/^Email$/i)
        .or(page.getByRole("heading", { name: /Staff access required/i })),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("navigation", { name: /Admin modules/i })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Owner Command Center/i, level: 1 }),
    ).toHaveCount(0);
  });

  test("responsive sample viewports: home + dashboard no overflow", async ({ page }) => {
    assertLocalWeb();
    const viewports = [
      { w: 320, h: 568 },
      { w: 360, h: 800 },
      { w: 390, h: 844 },
      { w: 412, h: 915 },
      { w: 768, h: 1024 },
      { w: 820, h: 1180 },
      { w: 1024, h: 768 },
      { w: 1280, h: 720 },
      { w: 1366, h: 768 },
      { w: 1440, h: 900 },
      { w: 1920, h: 1080 },
    ];
    async function assertPathViewports(path: string, authenticated = false) {
      await page.setViewportSize({ width: viewports[0].w, height: viewports[0].h });
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (authenticated) {
        await expect(page).not.toHaveURL(/\/admin\/login/);
      }
      await assertNoOverflow(page);
      for (const vp of viewports.slice(1)) {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.waitForTimeout(150);
        await assertNoOverflow(page);
      }
    }
    for (const path of ["/", "/menu", "/admin/login"] as const) {
      await assertPathViewports(path);
    }
    const account = enterpriseAccount(OWNER_EMAIL);
    await browserLogin(page, account.email, account.password);
    for (const path of [
      "/admin/dashboard",
      "/admin/orders",
      "/admin/kitchen",
      "/admin/delivery",
      "/admin/inventory",
      "/admin/purchasing",
      "/admin/crm",
      "/admin/hr",
      "/admin/finance",
      "/admin/reports",
      "/admin/settings",
    ]) {
      await assertPathViewports(path, true);
    }
  });
});
