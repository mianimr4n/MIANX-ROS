/**
 * RC1 permanent — Branch Manager landing smoke (single browser/context/page).
 * Usage: node scripts/rc1/bm-landing.mjs
 * Gate level: NON-BLOCKING OPTIONAL ACCEPTANCE until 3 sequential PASS proven.
 * Never prints passwords. No evidence file writes by default.
 */
import { chromium } from "playwright";
import {
  RC1_STAFF_EMAILS,
  accountByEmail,
  fixturePassword,
  loadStaffHandover,
} from "./lib/fixtures.mjs";

const handover = loadStaffHandover();
const out = {
  gateLevel: "NON-BLOCKING OPTIONAL ACCEPTANCE",
  ui: {},
  consoleErrors: [],
  ok: false,
};

async function launchBrowser() {
  const opts = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-extensions", "--no-sandbox"],
  };
  try {
    return await chromium.launch(opts);
  } catch {
    return await chromium.launch({ ...opts, channel: "chrome" });
  }
}

let browser;
try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") out.consoleErrors.push(m.text().slice(0, 160));
  });

  async function login(email) {
    const account = accountByEmail(handover, email);
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('input[type="email"]', { timeout: 45000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', fixturePassword(account));
    await page.click('button[type="submit"]');
    await page
      .waitForFunction(() => !location.pathname.includes("/admin/login"), { timeout: 30000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    return page.url();
  }

  out.ui.bmLogin = await login(RC1_STAFF_EMAILS.bm);
  await page.goto("http://localhost:3000/admin/branch", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  let text = await page.locator("body").innerText();
  out.ui.bmBranch = {
    url: page.url(),
    hasDash: /Branch dashboard|Branch KPIs/i.test(text),
    hideFinance: (await page.locator('a[href="/admin/finance"]').count()) === 0,
    hideSettings: (await page.locator('a[href="/admin/settings"]').count()) === 0,
  };
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  out.ui.bmRefresh = { url: page.url(), ok: page.url().includes("/admin/branch") };

  await login(RC1_STAFF_EMAILS.kitchen);
  await page.goto("http://localhost:3000/admin/branch", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  text = await page.locator("body").innerText();
  out.ui.kitchenOnBranch = {
    url: page.url(),
    unauthorized:
      page.url().includes("unauthorized") ||
      /Access denied|cannot open this module|Staff access required/i.test(text),
  };

  await login(RC1_STAFF_EMAILS.cashier);
  await page.goto("http://localhost:3000/admin/branch", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  text = await page.locator("body").innerText();
  out.ui.cashierOnBranch = {
    url: page.url(),
    unauthorized:
      page.url().includes("unauthorized") ||
      /Access denied|cannot open this module|Staff access required/i.test(text),
  };

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("http://localhost:3000/admin/branch", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  out.ui.anon = { url: page.url() };

  await context.close();
} catch (err) {
  out.ui.error = String(err?.message || err).slice(0, 400);
} finally {
  if (browser) await browser.close().catch(() => {});
}

out.ok = Boolean(
  !out.ui.error &&
    out.ui.bmBranch?.hasDash &&
    out.ui.bmBranch?.hideFinance &&
    out.ui.bmBranch?.hideSettings &&
    out.ui.bmRefresh?.ok &&
    out.ui.kitchenOnBranch?.unauthorized &&
    out.ui.cashierOnBranch?.unauthorized &&
    String(out.ui.anon?.url || "").includes("login"),
);

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
