/**
 * Production browser-session smoke (Google OAuth / existing Owner session).
 * No email/password grant. Never prints cookies, JWTs, or tokens.
 *
 * Usage:
 *   Optional: start Chrome with  chrome.exe --remote-debugging-port=9222
 *   Then:     node docs/testing/acceptance-evidence/rc4-production-cutover/_run_prod_browser_smoke.mjs
 *
 * If CDP unavailable, opens a headed browser and waits for manual Google Owner login.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve("package.json"));
const { chromium } = require("@playwright/test");

const SITE = process.env.TELEPIZZA_PROD_SITE_URL || "https://telepizza-website.vercel.app";
const API = process.env.TELEPIZZA_PROD_API_URL || "https://telepizza-api.onrender.com";
const CDP = process.env.TELEPIZZA_CDP_URL || "http://127.0.0.1:9222";
const outDir = resolve("docs/testing/acceptance-evidence/rc4-production-cutover");
mkdirSync(outDir, { recursive: true });

const ADMIN_PAGES = [
  "/admin/dashboard",
  "/admin/hr",
  "/admin/purchasing",
  "/admin/finance",
  "/admin/loyalty",
  "/admin/inventory",
  "/admin/reports",
  "/admin/documents",
];

const API_PROBES = [
  "/api/v1/auth/me",
  "/api/v1/admin/dashboard/operations",
  "/api/v1/admin/hr/employees?limit=50",
  "/api/v1/admin/hr/shifts?limit=20",
  "/api/v1/admin/hr/attendance?limit=20",
  "/api/v1/admin/hr/attendance/corrections?limit=20",
  "/api/v1/admin/hr/leaves?limit=20",
  "/api/v1/admin/hr/compensation?limit=20",
  "/api/v1/admin/hr/pay-periods?limit=20",
  "/api/v1/admin/hr/payroll-runs?limit=20",
  "/api/v1/admin/hr/documents?limit=20",
  "/api/v1/admin/purchasing/invoices?limit=50",
  "/api/v1/admin/finance/cash-reconciliations?limit=20",
  "/api/v1/admin/finance/expenses?limit=20",
  "/api/v1/admin/finance/periods",
  "/api/v1/admin/finance/exceptions?limit=20",
  "/api/v1/admin/analytics/workspace",
  "/api/v1/admin/analytics/modules",
  "/api/v1/admin/inventory/items?limit=20",
  "/api/v1/admin/inventory/recipes?limit=20",
  "/api/v1/admin/loyalty/accounts?limit=20",
  "/api/v1/admin/loyalty/rewards?limit=20",
  "/api/v1/admin/loyalty/tiers",
  "/api/v1/admin/marketing/campaigns?limit=20",
  "/api/v1/admin/marketing/templates?limit=20",
];

function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_]+/g, "[REDACTED_KEY]");
}

function deepHasKey(value, keys) {
  const want = new Set(keys);
  let found = false;
  const walk = (v) => {
    if (found || v == null) return;
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v === "object") {
      for (const [k, child] of Object.entries(v)) {
        if (want.has(k)) found = true;
        walk(child);
      }
    }
  };
  walk(value);
  return found;
}

async function connectOrLaunch() {
  try {
    const browser = await chromium.connectOverCDP(CDP, { timeout: 2500 });
    return { browser, mode: "cdp", context: browser.contexts()[0] || (await browser.newContext()) };
  } catch {
    const browser = await chromium.launch({
      headless: false,
      // Prefer installed Google Chrome for existing Google session affinity.
      channel: process.env.TELEPIZZA_BROWSER_CHANNEL || "chrome",
    });
    const context = await browser.newContext();
    return { browser, mode: "headed-manual-oauth", context };
  }
}

async function waitForOwnerSession(page, timeoutMs = Number(process.env.TELEPIZZA_SMOKE_LOGIN_TIMEOUT_MS || 300000)) {
  const deadline = Date.now() + timeoutMs;
  await page.goto(`${SITE}/admin/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  while (Date.now() < deadline) {
    const url = page.url();
    if (/\/admin(\/|$)/.test(url) && !/login|sign-in|auth/i.test(url)) {
      // Confirm session via in-page fetch (uses browser auth storage; token never returned to Node logs)
      const me = await page.evaluate(async (apiBase) => {
        const keys = Object.keys(localStorage);
        // Prefer supabase session in localStorage without returning token material
        let accessToken = null;
        for (const k of keys) {
          try {
            const raw = localStorage.getItem(k);
            if (!raw || raw.length < 20) continue;
            if (!raw.includes("access_token") && !raw.includes("accessToken")) continue;
            const parsed = JSON.parse(raw);
            accessToken =
              parsed?.access_token ||
              parsed?.accessToken ||
              parsed?.currentSession?.access_token ||
              parsed?.session?.access_token ||
              null;
            if (accessToken) break;
          } catch {
            /* continue */
          }
        }
        if (!accessToken) return { ok: false, reason: "NO_TOKEN_IN_STORAGE" };
        const res = await fetch(`${apiBase}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        return {
          ok: res.ok,
          status: res.status,
          email: json?.data?.email || json?.email || null,
          role: json?.data?.role || json?.data?.userType || json?.role || null,
          hasBranchScope: Boolean(
            json?.data?.branchId ||
              json?.data?.branchIds ||
              json?.data?.branches ||
              json?.data?.activeBranchId,
          ),
        };
      }, API);
      if (me.ok) return me;
    }
    await page.waitForTimeout(2000);
    if (!/\/admin/.test(page.url())) {
      await page.goto(`${SITE}/admin/login`, { waitUntil: "domcontentloaded" }).catch(() => {});
    }
  }
  return { ok: false, reason: "TIMEOUT_WAITING_FOR_OWNER_SESSION" };
}

async function probeApis(page) {
  return page.evaluate(
    async ({ apiBase, paths }) => {
      const keys = Object.keys(localStorage);
      let accessToken = null;
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw || (!raw.includes("access_token") && !raw.includes("accessToken"))) continue;
          const parsed = JSON.parse(raw);
          accessToken =
            parsed?.access_token ||
            parsed?.accessToken ||
            parsed?.currentSession?.access_token ||
            parsed?.session?.access_token ||
            null;
          if (accessToken) break;
        } catch {
          /* continue */
        }
      }
      if (!accessToken) return { error: "NO_TOKEN" };

      const out = [];
      for (const path of paths) {
        const res = await fetch(`${apiBase}${path}`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        });
        const text = await res.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
          /* ignore */
        }
        const blob = text;
        out.push({
          path,
          status: res.status,
          ok: res.ok,
          code: json?.error?.code || null,
          drift42703: /42703|due_date does not exist|employee_number does not exist|column .* does not exist/i.test(
            blob,
          ),
          missingRelation: /42P01|relation .* does not exist/i.test(blob),
          hasEmployeeNumberKey: JSON.stringify(json).includes("employeeNumber") || JSON.stringify(json).includes("employee_number"),
          hasDueDateKey: JSON.stringify(json).includes("dueDate") || JSON.stringify(json).includes("due_date"),
          errSnippet: String(json?.error?.message || "").slice(0, 160),
        });
      }
      return { probes: out };
    },
    { apiBase: API, paths: API_PROBES },
  );
}

async function main() {
  const results = {
    at: new Date().toISOString(),
    mode: null,
    identity: null,
    pages: [],
    api: [],
    driftFindings: [],
    logout: null,
    limitations: [],
  };

  const { browser, mode, context } = await connectOrLaunch();
  results.mode = mode;
  if (mode === "headed-manual-oauth") {
    results.limitations.push(
      "CDP unavailable; headed browser opened — complete Google Owner login in the window if not already signed in.",
    );
  }

  const page = context.pages()[0] || (await context.newPage());
  const identity = await waitForOwnerSession(page);
  results.identity = {
    ok: identity.ok,
    reason: identity.reason || null,
    emailMatchesOwner: identity.email ? /mian\.imr4n@gmail\.com/i.test(identity.email) : null,
    emailDomain: identity.email?.includes("@") ? identity.email.split("@")[1] : null,
    rolePresent: Boolean(identity.role),
    hasBranchScope: Boolean(identity.hasBranchScope),
    status: identity.status || null,
  };

  if (!identity.ok) {
    writeFileSync(resolve(outDir, "post-migrate-browser-smoke.json"), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ ok: false, gate: "NO_OWNER_SESSION", mode, reason: identity.reason }, null, 2));
    await browser.close().catch(() => {});
    process.exit(2);
  }

  for (const path of ADMIN_PAGES) {
    const resp = await page.goto(`${SITE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => ({
      ok: () => false,
      status: () => 0,
      error: String(e.message || e),
    }));
    const status = typeof resp?.status === "function" ? resp.status() : 0;
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const driftInUi = /42703|due_date does not exist|employee_number does not exist/i.test(bodyText);
    results.pages.push({
      path,
      httpStatus: status,
      urlFinal: page.url().split("#")[0],
      drift42703InDom: driftInUi,
      looksLikeLogin: /sign in|log in|continue with google/i.test(bodyText) && !/dashboard|operations/i.test(bodyText),
    });
  }

  const apiBundle = await probeApis(page);
  if (apiBundle.error) {
    results.limitations.push(apiBundle.error);
  } else {
    results.api = (apiBundle.probes || []).map((p) => ({
      ...p,
      errSnippet: redact(p.errSnippet || ""),
    }));
    results.driftFindings = results.api.filter((p) => p.drift42703).map((p) => p.path);
  }

  // Logout via UI if available
  const logoutClicked = await page
    .getByRole("button", { name: /log ?out|sign ?out/i })
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!logoutClicked) {
    await page
      .getByRole("link", { name: /log ?out|sign ?out/i })
      .first()
      .click({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }
  await page.waitForTimeout(1500);
  const after = await page.evaluate(async (apiBase) => {
    const keys = Object.keys(localStorage);
    let accessToken = null;
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw || !raw.includes("access_token")) continue;
        const parsed = JSON.parse(raw);
        accessToken = parsed?.access_token || parsed?.currentSession?.access_token || null;
        if (accessToken) break;
      } catch {
        /* ignore */
      }
    }
    if (!accessToken) return { status: 0, clearedStorage: true };
    const res = await fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    return { status: res.status, clearedStorage: false };
  }, API);
  results.logout = {
    uiControlFound: logoutClicked,
    storageClearedOrMeDenied: Boolean(after.clearedStorage || after.status === 401 || after.status === 0),
    meStatusAfter: after.status,
  };

  const employeeProbe = results.api.find((p) => p.path.includes("/hr/employees"));
  const invoiceProbe = results.api.find((p) => p.path.includes("/purchasing/invoices"));
  const apiOk = results.api.filter((p) => p.ok || p.status === 403);
  const hardFail = results.api.filter((p) => p.drift42703 || p.missingRelation || (p.status >= 500));
  const requiredOk = ["dashboard/operations", "/hr/employees", "/purchasing/invoices", "/auth/me"].every((frag) =>
    results.api.some((p) => p.path.includes(frag) && p.ok),
  );

  const summary = {
    ok:
      results.identity.ok &&
      results.driftFindings.length === 0 &&
      hardFail.length === 0 &&
      requiredOk &&
      results.pages.every((p) => !p.drift42703InDom),
    mode: results.mode,
    identityOk: results.identity.ok,
    ownerEmailMatched: results.identity.emailMatchesOwner,
    pagesChecked: results.pages.length,
    apiProbes: results.api.length,
    apiHttpOkOrForbidden: apiOk.length,
    drift42703: results.driftFindings,
    employeeNumberKeySeen: employeeProbe?.hasEmployeeNumberKey ?? null,
    dueDateKeySeen: invoiceProbe?.hasDueDateKey ?? null,
    logout: results.logout,
    wrote: "post-migrate-browser-smoke.json",
  };

  writeFileSync(resolve(outDir, "post-migrate-browser-smoke.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  await browser.close().catch(() => {});
  process.exit(summary.ok ? 0 : 4);
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: redact(String(err.message || err)) }, null, 2));
  process.exit(1);
});
