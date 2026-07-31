/**
 * RC3 Supplier Portal — staff-side Playwright + axe evidence.
 * Supplier-authenticated journeys are blocked without a supplier fixture.
 * Captures /admin/supplier-operations, /admin/purchasing, Owner dashboard.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  RC1_STAFF_EMAILS,
  accountByEmail,
  fixturePassword,
  loadStaffHandover,
} from "./rc1/lib/fixtures.mjs";

const require = createRequire(import.meta.url);
const { chromium } = createRequire(require.resolve("@playwright/test/package.json"))("playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");

const BASE = process.env.EXEC_DASH_BASE_URL ?? "http://localhost:3000";
const OUT = resolve("docs/testing/acceptance-evidence/rc3-supplier-portal");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];
const ROUTES = [
  { id: "owner-supplier-attention", path: "/admin/dashboard" },
  { id: "purchasing", path: "/admin/purchasing" },
  { id: "supplier-operations", path: "/admin/supplier-operations" },
  { id: "supplier-login", path: "/supplier/login" },
];

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  authenticated: false,
  loginEmail: null,
  consoleErrors: [],
  pageErrors: [],
  networkErrors: [],
  screenshots: [],
  axe: {},
  ok: false,
  criticalOrSeriousTotal: 0,
  expectedShutdowns: [],
  genuineFailures: [],
  limitations: [
    "Supplier-authenticated journeys not executed — no supplier fixture in RC1 handover.",
    "Local migrations not applied by this script.",
  ],
};

const browser = await chromium
  .launch({
    headless: true,
    channel: "chrome",
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  })
  .catch(() =>
    chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    }),
  );
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("response", (res) => {
  if (res.status() >= 400) {
    report.networkErrors.push(
      `${res.status()} ${res.url().replace(/([?&](access_token|token|apikey)=)[^&]+/gi, "$1***").slice(0, 180)}`,
    );
  }
});
page.on("console", (m) => {
  if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 200));
});
page.on("pageerror", (err) => {
  report.pageErrors.push(String(err?.message ?? err).slice(0, 200));
});

try {
  const handover = loadStaffHandover();
  const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  const password = fixturePassword(account);
  report.loginEmail = account.email;

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', account.email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\//, { timeout: 60_000 });
  report.authenticated = true;

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 60_000 });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const path = resolve(OUT, `${route.id}-${vp.name}.png`);
      await page.screenshot({ path, fullPage: true });
      report.screenshots.push(path);
    }
    try {
      const axe = await new AxeBuilder({ page }).withTags(["wcag22aa", "wcag2aa"]).analyze();
      const criticalOrSerious = axe.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      report.axe[route.id] = {
        violations: axe.violations.length,
        criticalOrSerious: criticalOrSerious.length,
        ids: criticalOrSerious.map((v) => v.id),
      };
      report.criticalOrSeriousTotal += criticalOrSerious.length;
    } catch (err) {
      report.axe[route.id] = { error: String(err?.message ?? err).slice(0, 200) };
      report.genuineFailures.push(`axe:${route.id}`);
    }
  }
} catch (err) {
  report.genuineFailures.push(String(err?.message ?? err).slice(0, 300));
} finally {
  await browser.close().catch(() => undefined);
}

report.ok =
  report.authenticated &&
  report.genuineFailures.length === 0 &&
  report.criticalOrSeriousTotal === 0 &&
  Object.values(report.axe).every((a) => !a.error);

writeFileSync(resolve(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, authenticated: report.authenticated, limitations: report.limitations }, null, 2));
process.exitCode = report.ok ? 0 : 1;
