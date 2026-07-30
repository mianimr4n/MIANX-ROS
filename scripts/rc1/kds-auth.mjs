/**
 * RC1 permanent — Kitchen/KDS authorization (API + light UI deny).
 * Usage: node scripts/rc1/kds-auth.mjs
 * Does not assert bump/recall (NOT IMPLEMENTED).
 * Never prints passwords. No evidence file writes.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  RC1_STAFF_EMAILS,
  accountByEmail,
  fixturePassword,
  loadStaffHandover,
  operatingBranchId,
} from "./lib/fixtures.mjs";

const require = createRequire(import.meta.url);
const requireFromApi = createRequire(resolve("backend/api/package.json"));
const requireFromPlaywrightTest = createRequire(require.resolve("@playwright/test/package.json"));
const { chromium } = requireFromPlaywrightTest("playwright");
const { createClient } = requireFromApi("@supabase/supabase-js");

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const api = loadEnv("backend/api/.env.local");
const host = new URL(api.SUPABASE_URL).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  console.log(JSON.stringify({ ok: false, error: "NON_LOCAL" }));
  process.exit(2);
}

const handover = loadStaffHandover();
const branchId = operatingBranchId(handover);
const foreign = "00000000-0000-4000-8000-000000000099";

async function apiSession(email) {
  const account = accountByEmail(handover, email);
  const sb = createClient(api.SUPABASE_URL, api.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: fixturePassword(account),
  });
  if (error || !data.session) return { ok: false, error: error?.message || "no_session" };
  return { ok: true, sb, token: data.session.access_token };
}

async function apiGet(token, path) {
  const res = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && body.ok === true, code: body.error?.code || null };
}

const out = {
  unsupportedFlows: ["bump", "recall", "HANDED_TO_RIDER"],
  unsupportedNote: "NOT IMPLEMENTED — NOT ASSERTED AS PASS",
  api: {},
  ui: {},
  ok: false,
};

const kitchen = await apiSession(RC1_STAFF_EMAILS.kitchen);
const cashier = await apiSession(RC1_STAFF_EMAILS.cashier);
const bm = await apiSession(RC1_STAFF_EMAILS.bm);

out.api.kitchenAssigned = await apiGet(
  kitchen.token,
  `/kitchen/tickets?limit=10&branchId=${branchId}`,
);
out.api.kitchenForeign = await apiGet(kitchen.token, `/kitchen/tickets?limit=5&branchId=${foreign}`);
out.api.bmAssigned = await apiGet(bm.token, `/kitchen/tickets?limit=10&branchId=${branchId}`);
out.api.cashierKitchen = await apiGet(cashier.token, `/kitchen/tickets?limit=5&branchId=${branchId}`);
out.api.anonKitchen = await apiGet(null, `/kitchen/tickets?limit=5`);

if (kitchen.sb) await kitchen.sb.auth.signOut().catch(() => {});
if (cashier.sb) await cashier.sb.auth.signOut().catch(() => {});
if (bm.sb) await bm.sb.auth.signOut().catch(() => {});

let browser;
try {
  const launchOpts = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-extensions"],
  };
  try {
    browser = await chromium.launch(launchOpts);
  } catch {
    browser = await chromium.launch({ ...launchOpts, channel: "chrome" });
  }

  async function withFreshPage(run) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      return await run(page);
    } finally {
      await context.close().catch(() => {});
    }
  }

  async function uiLogin(page, email) {
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
    await page.waitForTimeout(2500);
    return page.url();
  }

  out.ui.kitchen = await withFreshPage(async (page) => {
    const loginUrl = await uiLogin(page, RC1_STAFF_EMAILS.kitchen);
    await page.goto("http://localhost:3000/admin/kitchen-dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    const kitchenText = await page.locator("body").innerText();
    return {
      loginUrl,
      url: page.url(),
      hasKds: /Kitchen Display System|Kitchen operations board/i.test(kitchenText),
    };
  });

  out.ui.cashier = await withFreshPage(async (page) => {
    await uiLogin(page, RC1_STAFF_EMAILS.cashier);
    await page.goto("http://localhost:3000/admin/kitchen-dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    const cashierText = await page.locator("body").innerText();
    return {
      url: page.url(),
      unauthorized:
        page.url().includes("unauthorized") ||
        /Access denied|cannot open this module|Staff access required/i.test(cashierText),
      hasBoard: /Kitchen operations board|Kitchen Display System/i.test(cashierText),
    };
  });

  out.ui.anon = await withFreshPage(async (page) => {
    await page.goto("http://localhost:3000/admin/kitchen-dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    return { url: page.url() };
  });
} catch (err) {
  const msg = String(err?.message || err);
  if (/Executable doesn't exist|browserType\.launch/i.test(msg)) {
    out.ui.skipped = true;
    out.ui.skipReason = "Playwright browser unavailable — API checks remain blocking";
  } else {
    out.ui.error = msg.slice(0, 300);
  }
} finally {
  if (browser) await browser.close().catch(() => {});
}

const apiOk = Boolean(
  out.api.kitchenAssigned?.ok &&
    out.api.kitchenForeign?.status === 403 &&
    out.api.bmAssigned?.ok &&
    out.api.cashierKitchen?.status === 403 &&
    (out.api.anonKitchen?.status === 401 || out.api.anonKitchen?.status === 403),
);
const uiOk = Boolean(
  out.ui.kitchen?.hasKds &&
    out.ui.cashier?.unauthorized &&
    !out.ui.cashier?.hasBoard &&
    String(out.ui.anon?.url || "").includes("login"),
);
out.apiOk = apiOk;
out.uiOk = uiOk;
out.ok = Boolean(apiOk && (uiOk || out.ui.skipped));

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
