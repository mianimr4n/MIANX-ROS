/**
 * RC3 Finance Operations — authenticated Playwright + axe evidence.
 * Local fixture login only (scripts/.tmp_pw). Never prints passwords.
 * Captures screenshots at 390 / 768 / 1440 for Finance, Purchasing, Owner dashboard.
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
const OUT = resolve("docs/testing/acceptance-evidence/rc3-finance-operations");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];
const ROUTES = [
  { id: "owner-finance-attention", path: "/admin/dashboard" },
  { id: "finance", path: "/admin/finance" },
  { id: "purchasing", path: "/admin/purchasing" },
  { id: "pos", path: "/admin/pos" },
];

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  authenticated: false,
  loginUrl: null,
  consoleErrors: [],
  pageErrors: [],
  networkErrors: [],
  screenshots: [],
  axe: {},
  ok: false,
  criticalOrSeriousTotal: 0,
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

const handover = loadStaffHandover();
const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
const password = fixturePassword(account);

await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForSelector('input[type="email"]', { timeout: 45_000 });
await page.fill('input[type="email"]', account.email);
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');
await page.waitForFunction(() => !location.pathname.includes("/admin/login"), { timeout: 45_000 }).catch(() => {});
await page.waitForTimeout(2500);
report.loginUrl = page.url();
report.authenticated =
  !page.url().includes("/admin/login") &&
  (await page.getByText("Staff access required").count()) === 0;

if (!report.authenticated) {
  await page.screenshot({ path: resolve(OUT, "login-failed.png"), fullPage: true });
  writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.error("AUTH_FAILED", report.loginUrl);
  process.exit(1);
}

for (const route of ROUTES) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);

  try {
    const axe = await new AxeBuilder({ page }).withTags(["wcag22aa", "wcag2aa"]).analyze();
    const criticalOrSerious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    report.axe[route.id] = {
      violations: axe.violations.length,
      criticalOrSerious: criticalOrSerious.length,
      ids: criticalOrSerious.map((v) => v.id),
    };
    report.criticalOrSeriousTotal += criticalOrSerious.length;
  } catch (err) {
    report.axe[route.id] = { error: String(err?.message ?? err).slice(0, 200) };
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);
    const file = `${route.id}-${vp.name}.png`;
    await page.screenshot({ path: resolve(OUT, file), fullPage: true });
    report.screenshots.push(file);
  }
}

report.ok =
  report.authenticated &&
  report.criticalOrSeriousTotal === 0 &&
  Object.values(report.axe).every((a) => !a.error);

writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
await browser.close();

console.log(
  JSON.stringify(
    {
      ok: report.ok,
      authenticated: report.authenticated,
      screenshots: report.screenshots.length,
      axeCriticalOrSerious: report.criticalOrSeriousTotal,
      consoleErrors: report.consoleErrors.length,
      pageErrors: report.pageErrors.length,
      networkErrors: report.networkErrors.length,
      out: OUT,
    },
    null,
    2,
  ),
);
process.exit(report.ok ? 0 : 1);
