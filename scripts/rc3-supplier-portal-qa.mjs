/**
 * RC3 Supplier Portal — authenticated Playwright + axe evidence.
 * Uses supplier fixtures (A) + staff owner for Supplier Operations.
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
const OUT = resolve("docs/testing/acceptance-evidence/rc3-supplier-portal");
const SUPPLIER_FIXTURE = resolve("scripts/.tmp_pw/supplier-portal.local.json");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  authenticatedStaff: false,
  authenticatedSupplier: false,
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
    "Binary document upload deferred — URL reference only.",
    "Accepted/rejected GRN line quantities remain staff SoT; supplier sees receiving status summary only.",
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

async function capture(page, routeId, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const file = resolve(OUT, `${routeId}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.screenshots.push(file);
  }
  try {
    const axe = await new AxeBuilder({ page }).withTags(["wcag22aa", "wcag2aa"]).analyze();
    const criticalOrSerious = axe.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
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

try {
  if (!existsSync(SUPPLIER_FIXTURE)) {
    throw new Error("Supplier fixture missing — run node scripts/seed-rc3-supplier-portal.mjs");
  }
  const supplierFixture = JSON.parse(readFileSync(SUPPLIER_FIXTURE, "utf8"));
  const supplierA = supplierFixture.accounts.find((a) => a.key === "supplierA");

  const supplierCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const supplierPage = await supplierCtx.newPage();
  supplierPage.on("console", (m) => {
    if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 200));
  });
  supplierPage.on("pageerror", (err) => {
    report.pageErrors.push(String(err?.message ?? err).slice(0, 200));
  });

  await supplierPage.goto(`${BASE}/supplier/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await capture(supplierPage, "supplier-login", "/supplier/login");
  await supplierPage.fill("#supplier-email", supplierA.email);
  await supplierPage.fill("#supplier-password", supplierA.password);
  await supplierPage.click('button[type="submit"]');
  await supplierPage.waitForURL(/\/supplier/, { timeout: 60_000 });
  report.authenticatedSupplier = true;

  await capture(supplierPage, "supplier-dashboard", "/supplier");
  await capture(supplierPage, "supplier-orders", "/supplier/purchase-orders");
  await capture(supplierPage, "supplier-order-detail", `/supplier/purchase-orders/${supplierA.poId}`);
  await capture(supplierPage, "supplier-documents", "/supplier/documents");
  await capture(supplierPage, "supplier-profile", "/supplier/profile");
  await capture(supplierPage, "supplier-unauthorized-po", `/supplier/purchase-orders/${supplierFixture.suppliers.B.poId}`);
  await supplierCtx.close();

  const handover = loadStaffHandover();
  const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  const password = fixturePassword(account);
  const staffCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const staffPage = await staffCtx.newPage();
  await staffPage.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await staffPage.fill('input[type="email"], input[name="email"]', account.email);
  await staffPage.fill('input[type="password"], input[name="password"]', password);
  await staffPage.click('button[type="submit"]');
  await staffPage.waitForURL(/\/admin\//, { timeout: 60_000 });
  report.authenticatedStaff = true;
  await capture(staffPage, "owner-supplier-attention", "/admin/dashboard");
  await capture(staffPage, "purchasing", "/admin/purchasing");
  await capture(staffPage, "supplier-operations", "/admin/supplier-operations");
  await staffCtx.close();
} catch (err) {
  report.genuineFailures.push(String(err?.message ?? err).slice(0, 300));
} finally {
  await browser.close().catch(() => undefined);
}

report.ok =
  report.authenticatedSupplier &&
  report.authenticatedStaff &&
  report.genuineFailures.length === 0 &&
  report.criticalOrSeriousTotal === 0;

writeFileSync(resolve(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      authenticatedSupplier: report.authenticatedSupplier,
      authenticatedStaff: report.authenticatedStaff,
      screenshots: report.screenshots.length,
      criticalOrSeriousTotal: report.criticalOrSeriousTotal,
      failures: report.genuineFailures,
      limitations: report.limitations,
    },
    null,
    2,
  ),
);
process.exitCode = report.ok ? 0 : 1;
