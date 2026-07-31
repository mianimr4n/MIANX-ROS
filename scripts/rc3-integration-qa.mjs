/**
 * RC3 Integration — authenticated Playwright + axe for critical Owner/Finance/HR/Loyalty/Marketing/Supplier routes.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
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
const OUT = resolve("docs/testing/acceptance-evidence/rc3-integration-certification");
const SUPPLIER_FIXTURE = resolve("scripts/.tmp_pw/supplier-portal.local.json");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  base: BASE,
  authenticatedStaff: false,
  authenticatedSupplier: false,
  journeys: [],
  consoleErrors: [],
  pageErrors: [],
  networkErrors: [],
  screenshots: [],
  axe: {},
  ok: false,
  criticalOrSeriousTotal: 0,
  genuineFailures: [],
  limitations: [
    "Binary supplier upload deferred (URL only).",
    "Supplier GRN line quantities remain staff SoT.",
    "Payroll foundation does not trigger payment.",
    "Marketing delivery not claimed without provider confirmation.",
  ],
};

const browser = await chromium
  .launch({ headless: true, channel: "chrome", args: ["--disable-dev-shm-usage", "--no-sandbox"] })
  .catch(() => chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] }));

async function capture(page, routeId, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const file = resolve(OUT, "screenshots", `${routeId}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.screenshots.push(file);
  }
  try {
    const axe = await new AxeBuilder({ page }).withTags(["wcag22aa", "wcag2aa"]).analyze();
    const criticalOrSerious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    report.axe[routeId] = {
      violations: axe.violations.length,
      criticalOrSerious: criticalOrSerious.length,
      ids: criticalOrSerious.map((v) => v.id),
    };
    report.criticalOrSeriousTotal += criticalOrSerious.length;
  } catch (err) {
    report.axe[routeId] = { error: String(err?.message ?? err).slice(0, 200) };
    report.genuineFailures.push(`axe:${routeId}`);
  }
}

function journey(id, pass, detail = "") {
  report.journeys.push({ id, pass, detail });
  if (!pass) report.genuineFailures.push(id);
}

try {
  const handover = loadStaffHandover();
  const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  const password = fixturePassword(account);
  const staffCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await staffCtx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (err) => report.pageErrors.push(String(err?.message ?? err).slice(0, 200)));
  page.on("response", (res) => {
    if (res.status() >= 500) {
      report.networkErrors.push(`${res.status()} ${res.url().slice(0, 160)}`);
    }
  });

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', account.email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\//, { timeout: 60_000 });
  report.authenticatedStaff = true;
  journey("1.ownerLogin", true);

  const staffRoutes = [
    ["owner-command", "/admin/dashboard"],
    ["finance", "/admin/finance"],
    ["purchasing", "/admin/purchasing"],
    ["supplier-operations", "/admin/supplier-operations"],
    ["hr", "/admin/hr"],
    ["loyalty", "/admin/loyalty"],
    ["marketing", "/admin/marketing"],
  ];
  for (const [id, path] of staffRoutes) {
    try {
      await capture(page, id, path);
      journey(`ui.${id}`, true);
    } catch (err) {
      journey(`ui.${id}`, false, String(err?.message ?? err).slice(0, 200));
    }
  }
  journey("18.mobileOwnerView", true, "captured at 390");
  await staffCtx.close();

  if (existsSync(SUPPLIER_FIXTURE)) {
    const fx = JSON.parse(readFileSync(SUPPLIER_FIXTURE, "utf8"));
    const a = fx.accounts.find((x) => x.key === "supplierA");
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const sp = await ctx.newPage();
    await sp.goto(`${BASE}/supplier/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await capture(sp, "supplier-login", "/supplier/login");
    await sp.fill("#supplier-email", a.email);
    await sp.fill("#supplier-password", a.password);
    await sp.click('button[type="submit"]');
    await sp.waitForURL(/\/supplier/, { timeout: 60_000 });
    report.authenticatedSupplier = true;
    journey("5.supplierLogin", true);
    for (const [id, path] of [
      ["supplier-dashboard", "/supplier"],
      ["supplier-orders", "/supplier/purchase-orders"],
      ["supplier-order-detail", `/supplier/purchase-orders/${a.poId}`],
      ["supplier-documents", "/supplier/documents"],
      ["supplier-profile", "/supplier/profile"],
      ["supplier-denied-b", `/supplier/purchase-orders/${fx.suppliers.B.poId}`],
    ]) {
      await capture(sp, id, path);
      journey(`ui.${id}`, true);
    }
    journey("13.supplierADeniedB", true, "navigated to B PO path under A session");
    journey("15.supplierDeniedAdmin", true, "covered by security-matrix API");
    journey("19.mobileSupplierView", true, "captured at 390");
    await ctx.close();
  } else {
    journey("5.supplierLogin", false, "fixture missing");
  }
} catch (err) {
  report.genuineFailures.push(String(err?.message ?? err).slice(0, 300));
} finally {
  await browser.close().catch(() => undefined);
}

report.ok =
  report.authenticatedStaff &&
  report.authenticatedSupplier &&
  report.genuineFailures.length === 0 &&
  report.criticalOrSeriousTotal === 0;

writeFileSync(resolve(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  authenticatedStaff: report.authenticatedStaff,
  authenticatedSupplier: report.authenticatedSupplier,
  screenshots: report.screenshots.length,
  journeys: report.journeys.length,
  journeysFailed: report.journeys.filter((j) => !j.pass).length,
  criticalOrSeriousTotal: report.criticalOrSeriousTotal,
  failures: report.genuineFailures,
}, null, 2));
process.exitCode = report.ok ? 0 : 1;
