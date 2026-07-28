/**
 * Actual browser Playwright — Owner command center routes.
 * Local stack only. No Production contact.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const EVIDENCE = resolve("docs/testing/acceptance-evidence");
mkdirSync(EVIDENCE, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

async function assertOneH1(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
}

async function waitForAdminShell(page: Page) {
  await expect(page.locator("header h1")).toBeVisible({ timeout: 60_000 });
  await assertOneH1(page);
}

test.describe("Owner command center — actual browser", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard / branch / ai-team across viewports with axe", async ({ browser }) => {
    const account = enterpriseAccount("admin@telepizza.pk");

    const routes = [
      { path: "/admin/dashboard", title: /dashboard|executive|good/i },
      { path: "/admin/branch", title: /branch/i },
      { path: "/admin/ai-team", title: /Mianx\.ai Operating Team/i },
    ] as const;

    const results: Record<string, unknown> = { viewports: {}, axe: {}, agents: null };

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        baseURL: WEB,
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await browserLogin(page, account.email, account.password);

      const vpResult: Record<string, unknown> = {};

      for (const route of routes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
        if (/\/admin\/login/.test(page.url())) {
          await browserLogin(page, account.email, account.password);
          await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
        }
        await waitForAdminShell(page);
        await assertNoHorizontalOverflow(page);

        if (route.path === "/admin/ai-team") {
          await expect(page.getByText(/Mianx\.ai Operating Team|Opening Mission/i).first()).toBeVisible();
          await expect(page.getByText(/14 Aug 2026/i).first()).toBeVisible();
          await expect(page.getByTestId("opening-percentage")).toBeVisible({ timeout: 45_000 });
          await expect(page.getByTestId("opening-percentage")).toContainText(
            /of \d+ required checks complete|unavailable|not inherited/i,
          );
          await expect(page.getByLabel("Owner decision queue", { exact: true })).toBeVisible();
          const agents = page.locator('[data-testid="mianx-agent-grid"] article');
          await expect(agents).toHaveCount(14, { timeout: 45_000 });
          results.agents = await agents.count();
          await expect(page.getByText(/Northern Bypass/i).first()).toBeVisible();
          await expect(page.getByText(/coming-soon/i).first()).toBeVisible();
          await page.keyboard.press("Tab");
          const tag = await page.evaluate(() => document.activeElement?.tagName ?? "");
          expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(tag);
        }

        if (route.path === "/admin/dashboard") {
          await expect(page.getByText(/14 Aug 2026|Opening countdown|Opening readiness/i).first()).toBeVisible({
            timeout: 45_000,
          });
        }

        if (route.path === "/admin/branch") {
          await expect(page.getByText(/Opening readiness|People|Floor and booking/i).first()).toBeVisible({
            timeout: 45_000,
          });
          await expect(
            page.getByRole("link", { name: /Open Mianx\.ai Team|Review opening plan/i }).first(),
          ).toBeVisible();
        }

        vpResult[route.path] = { h1: 1, overflow: false };
      }

      results.viewports[vp.name] = vpResult;

      // Axe + failure fixture only on desktop context
      if (vp.width === 1440) {
        await page.goto("/admin/ai-team", { waitUntil: "networkidle", timeout: 60_000 });
        await waitForAdminShell(page);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
        results.axe = {
          violations: axe.violations.length,
          seriousOrCritical: serious.length,
          ids: serious.map((v) => v.id),
        };
        expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);

        await page.route("**/admin/dashboard/opening-readiness**", async (route) => {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "PROBE_FAILED", message: "forced e2e failure" } }),
          });
        });
        await page.goto("/admin/ai-team", { waitUntil: "domcontentloaded", timeout: 60_000 });
        await waitForAdminShell(page);
        await expect(page.getByText(/ERROR|unavailable|not a LIVE percentage|Opening readiness/i).first()).toBeVisible({
          timeout: 45_000,
        });
        await expect(page.getByText(/Opening readiness: 0 of 0 required checks complete — 0%/i)).toHaveCount(0);
      }

      await context.close();
    }

    writeFileSync(
      resolve(EVIDENCE, "opening-owner-command-center-playwright.json"),
      JSON.stringify({ ok: true, baseURL: WEB, ...results }, null, 2),
    );
  });
});
