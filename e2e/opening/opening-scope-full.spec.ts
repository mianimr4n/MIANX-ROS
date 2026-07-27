/**
 * Full opening-scope browser acceptance — local only, no Production.
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

const PUBLIC_ROUTES = ["/", "/menu", "/admin/login"] as const;

const AUTH_ROUTES = [
  "/admin/dashboard",
  "/admin/branch",
  "/admin/ai-team",
  "/admin/orders",
  "/admin/kitchen",
  "/admin/kitchen-dashboard",
  "/admin/delivery",
  "/admin/pos",
  "/admin/floor",
  "/admin/reservations",
  "/admin/waitlist",
] as const;

async function assertShell(page: Page) {
  // Wait out auth bootstrap before asserting landmarks.
  await page.waitForLoadState("domcontentloaded");
  const loading = page.getByText(/Loading admin session/i);
  if (await loading.count()) {
    await expect(loading).toHaveCount(0, { timeout: 60_000 });
  }
  if (/\/admin\/login/.test(page.url())) {
    throw new Error(`Unexpected login redirect: ${page.url()}`);
  }
  try {
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 60_000 });
  } catch (err) {
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 400);
    throw new Error(`No H1 at ${page.url()} body=${JSON.stringify(body)} :: ${String(err)}`);
  }
  const h1Count = await page.locator("h1").count();
  expect(h1Count, `h1 count=${h1Count} url=${page.url()}`).toBe(1);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflow, "horizontal overflow").toBeFalsy();
}

test.describe("Opening-scope full browser acceptance", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(900_000);

  test("public + authenticated routes across viewports", async ({ browser }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    const results: Record<string, unknown> = {
      public: {},
      auth: {},
      menu: {},
      axe: {},
      agents: null,
      fatalConsole: 0,
      pageErrors: 0,
    };
    let fatalConsole = 0;
    let pageErrors = 0;

    // Public routes at desktop
    {
      const context = await browser.newContext({ baseURL: WEB, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on("pageerror", () => {
        pageErrors += 1;
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const t = msg.text();
          if (/Failed to load resource|net::ERR_|favicon/i.test(t)) return;
          fatalConsole += 1;
        }
      });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await expect(page.locator("h1, [role='heading']").first()).toBeVisible({ timeout: 60_000 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflow).toBeFalsy();
        (results.public as Record<string, unknown>)[route] = { ok: true, overflow: false };
      }

      // Menu completeness of loaded catalog (no hard truncation)
      await page.goto("/menu", { waitUntil: "networkidle", timeout: 90_000 });
      await page.waitForTimeout(2000);
      const menuStats = await page.evaluate(() => {
        const body = document.body.innerText;
        // Product family cards typically expose Add / size options
        const addButtons = Array.from(document.querySelectorAll("button")).filter((el) =>
          /^add(\s|$)/i.test((el.textContent ?? "").trim()),
        );
        const categoryButtons = Array.from(document.querySelectorAll("button, a")).filter((el) =>
          /pizzas|burgers|pasta|drinks|desserts|wraps|wings|fries|mojitos|shakes/i.test(el.textContent ?? ""),
        );
        return {
          addButtonCount: addButtons.length,
          bodyHasMenu: /menu|order|add/i.test(body),
          categoryCueCount: categoryButtons.length,
          truncatedMarker: /showing \d+ of \d+|load more|page 1 of/i.test(body),
          hasMolten: /molten lava/i.test(body),
          hasZinger: /zinger/i.test(body),
        };
      });
      results.menu = menuStats;
      expect(menuStats.truncatedMarker, "no pagination truncation copy").toBeFalsy();
      expect(menuStats.bodyHasMenu).toBeTruthy();
      expect(menuStats.addButtonCount, "expected many product family CTAs").toBeGreaterThan(40);
      expect(menuStats.hasZinger).toBeTruthy();
      expect(menuStats.hasMolten).toBeTruthy();

      await context.close();
    }

    // Authenticated routes per viewport (fresh page per route avoids blank remount hangs)
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        baseURL: WEB,
        viewport: { width: vp.width, height: vp.height },
      });
      const loginPage = await context.newPage();
      await browserLogin(loginPage, account.email, account.password);
      await loginPage.close();

      const vpAuth: Record<string, unknown> = {};
      for (const route of AUTH_ROUTES) {
        const page = await context.newPage();
        page.on("pageerror", () => {
          pageErrors += 1;
        });
        page.on("crash", () => {
          pageErrors += 1;
        });
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        if (/\/admin\/login/.test(page.url())) {
          await browserLogin(page, account.email, account.password);
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
        }
        await assertShell(page);
        vpAuth[route] = { h1: 1, overflow: false, url: page.url() };

        if (vp.width === 1440 && route === "/admin/ai-team") {
          await expect(page.getByTestId("opening-percentage")).toBeVisible({ timeout: 45_000 });
          await expect(page.getByTestId("opening-percentage")).toContainText(/of \d+ required checks complete/i);
          const agents = page.locator('[data-testid="mianx-agent-grid"] article');
          await expect(agents).toHaveCount(14, { timeout: 45_000 });
          results.agents = await agents.count();
          await expect(page.getByText(/14 Aug 2026/i).first()).toBeVisible();
          await expect(page.getByText(/coming-soon/i).first()).toBeVisible();

          const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
          const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
          results.axe = {
            violations: axe.violations.length,
            seriousOrCritical: serious.length,
            ids: serious.map((v) => v.id),
          };
          expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
        }

        if (vp.width === 1440 && route === "/admin/orders") {
          await expect(page.getByText(/LIVE zero|0 tickets live/i)).toHaveCount(0);
        }

        await page.close();
      }

      if (vp.width === 1440) {
        const page = await context.newPage();
        await page.route("**/admin/dashboard/opening-readiness**", async (route) => {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "PROBE_FAILED", message: "forced" } }),
          });
        });
        await page.goto("/admin/ai-team", { waitUntil: "domcontentloaded", timeout: 60_000 });
        await assertShell(page);
        await expect(page.getByText(/Opening readiness: 0 of 0 required checks complete — 0%/i)).toHaveCount(0);
        await page.close();
      }

      (results.auth as Record<string, unknown>)[vp.name] = vpAuth;
      await context.close();
    }

    results.fatalConsole = fatalConsole;
    results.pageErrors = pageErrors;
    expect(pageErrors).toBe(0);

    writeFileSync(
      resolve(EVIDENCE, "opening-readiness-final-browser.json"),
      JSON.stringify({ ok: true, baseURL: WEB, ...results }, null, 2),
    );
  });
});
