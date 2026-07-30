/**
 * PR #141 merge-readiness — authenticated Owner QA evidence.
 * Local fixture login only (scripts/.tmp_pw). Never prints passwords.
 * Captures screenshots + axe + console errors for Owner pages.
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

const BASE = process.env.EXEC_DASH_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = resolve("docs/testing/acceptance-evidence/pr-141-merge-qa");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];
const ROUTES = [
  { id: "dashboard", path: "/admin/dashboard" },
  { id: "settings", path: "/admin/settings" },
  { id: "inventory", path: "/admin/inventory" },
  { id: "purchasing", path: "/admin/purchasing" },
  { id: "hr", path: "/admin/hr" },
];

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  authenticated: false,
  loginUrl: null,
  consoleErrors: [],
  pageErrors: [],
  screenshots: [],
  axe: {},
  overflow: {},
  diagnostics: {},
  ok: false,
};

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
}).catch(() =>
  chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  }),
);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("response", (res) => {
  if (res.status() >= 400) {
    report.consoleErrors.push(
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
  console.log(JSON.stringify({ ...report, blocking: "AUTHENTICATED_FIXTURE_LOGIN_FAILED" }, null, 2));
  await browser.close();
  process.exit(2);
}

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(900);
    const file = resolve(OUT, `${route.id}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.screenshots.push(file);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflowX: doc.scrollWidth > doc.clientWidth + 2,
      };
    });
    report.overflow[`${route.id}-${vp.name}`] = overflow;

    const body = await page.locator("body").innerText();
    report.diagnostics[`${route.id}-${vp.name}`] = {
      hasIntegrationReadiness: /Integration readiness/i.test(body),
      hasGetAdmin: /GET\s+\/admin\//i.test(body),
      hasRuleId: /Rule ID/i.test(body) && !(await page.locator(".sr-only").filter({ hasText: /Rule ID/i }).count()),
      hasBranchSelector: (await page.locator('select, [aria-label*="branch" i], button:has-text("Branch")').count()) > 0 ||
        /Royal Orchard|Assigned Branches|All Branches|branch/i.test(body),
    };
  }

  // Axe at 1440 for each route
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    report.axe[route.id] = {
      violations: results.violations.length,
      criticalOrSerious: critical.length,
      ids: critical.map((v) => v.id),
    };
  } catch (err) {
    report.axe[route.id] = { error: String(err?.message ?? err).slice(0, 200) };
  }
}

report.ok =
  report.authenticated &&
  report.pageErrors.length === 0 &&
  Object.values(report.axe).every((a) => !a.criticalOrSerious) &&
  Object.values(report.overflow).every((o) => !o.overflowX);

writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      authenticated: report.authenticated,
      screenshots: report.screenshots.length,
      consoleErrors: report.consoleErrors.length,
      pageErrors: report.pageErrors.length,
      axe: report.axe,
      overflowHits: Object.values(report.overflow).filter((o) => o.overflowX).length,
      diagnosticsHits: Object.values(report.diagnostics).filter(
        (d) => d.hasIntegrationReadiness || d.hasGetAdmin,
      ).length,
      out: OUT,
      ok: report.ok,
    },
    null,
    2,
  ),
);

await browser.close();
process.exit(report.ok ? 0 : 1);
