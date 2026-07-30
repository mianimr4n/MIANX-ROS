/**
 * Owner Handover Phase 1 — viewport screenshots (390 / 768 / 1440).
 * Captures login always; captures Owner modules when fixture login succeeds.
 * Never prints passwords.
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

const BASE = process.env.OWNER_HANDOVER_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = resolve("docs/testing/acceptance-evidence/owner-handover-phase1");
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];
const ROUTES = [
  { id: "dashboard", path: "/admin/dashboard" },
  { id: "settings", path: "/admin/settings" },
  { id: "inventory", path: "/admin/inventory" },
  { id: "purchasing", path: "/admin/purchasing" },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(400);
  const file = resolve(OUT, `login-${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`wrote ${file}`);
}

let authenticated = false;
try {
  const handover = loadStaffHandover();
  const account = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  const password = fixturePassword(account);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', account.email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/admin/login"), { timeout: 30_000 });
  await page.waitForTimeout(1200);
  if ((await page.getByText("Staff access required").count()) === 0) {
    authenticated = true;
  }
} catch (err) {
  console.log(JSON.stringify({ login: "skipped", reason: String(err?.message ?? err).slice(0, 200) }));
}

if (authenticated) {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(800);
      const file = resolve(OUT, `${route.id}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`wrote ${file}`);
    }
  }
}

await browser.close();
console.log(JSON.stringify({ ok: true, out: OUT, authenticated, viewports: VIEWPORTS.length }));
