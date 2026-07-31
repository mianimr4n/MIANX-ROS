/**
 * Kitchen Completion RC2 — viewport screenshots (390 / 768 / 1024 / 1440).
 * Local fixture login only. Never prints passwords.
 */
import { mkdirSync } from "node:fs";
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

const BASE = process.env.KITCHEN_QA_BASE_URL ?? "http://localhost:3000";
const OUT = resolve("docs/testing/acceptance-evidence/kitchen-completion-rc2");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
}).catch(() =>
  chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] }),
);
const page = await browser.newPage();

let authenticated = false;
try {
  const handover = loadStaffHandover();
  const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]', { timeout: 45_000 });
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', fixturePassword(account));
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.includes("/admin/login"), { timeout: 45_000 });
  await page.waitForTimeout(1500);
  authenticated = !page.url().includes("/admin/login");
} catch (err) {
  console.log(JSON.stringify({ login: "failed", reason: String(err?.message ?? err).slice(0, 180) }));
}

if (!authenticated) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: resolve(OUT, `login-${vp.name}.png`), fullPage: true });
  }
  console.log(JSON.stringify({ authenticated: false, out: OUT }));
  await browser.close();
  process.exit(2);
}

for (const path of ["/admin/kitchen", "/admin/kitchen-dashboard"]) {
  const id = path.includes("dashboard") ? "kds" : "kitchen";
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(900);
    const file = resolve(OUT, `${id}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`wrote ${file}`);
  }
}

await browser.close();
console.log(JSON.stringify({ authenticated: true, out: OUT }));
