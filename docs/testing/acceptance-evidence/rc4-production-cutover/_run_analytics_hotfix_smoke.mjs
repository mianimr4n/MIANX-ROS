/**
 * Post-deploy Analytics hotfix smoke (PR #163 / SHA 2f0e432).
 * Uses CDP or headed Chrome. Never prints tokens/JWTs.
 *
 *   node docs/testing/acceptance-evidence/rc4-production-cutover/_run_analytics_hotfix_smoke.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve("package.json"));
const { chromium } = require("@playwright/test");

const SITE = process.env.TELEPIZZA_PROD_SITE_URL || "https://telepizza-website.vercel.app";
const API = process.env.TELEPIZZA_PROD_API_URL || "https://telepizza-api.onrender.com";
const CDP = process.env.TELEPIZZA_CDP_URL || "http://127.0.0.1:9222";
const AUTH_SHA = "2f0e4326310e1036cc23a94d5573dd4d774eaf0f";
const outDir = resolve("docs/testing/acceptance-evidence/rc4-production-cutover");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "analytics-hotfix-prod-smoke.json");

const SCHEMA_BAD =
  /42703|42P01|order_items\.name does not exist|due_date does not exist|employee_number does not exist|column .* does not exist|relation .* does not exist|schema cache/i;

const API_PROBES = [
  "/api/v1/auth/me",
  "/api/v1/admin/analytics/modules",
  "/api/v1/admin/analytics/registry",
  "/api/v1/admin/analytics/workspace",
  "/api/v1/admin/analytics/modules/sales",
  "/api/v1/admin/analytics/modules/product",
  "/api/v1/admin/analytics/modules/executive",
  "/api/v1/admin/analytics/modules/finance",
  "/api/v1/admin/analytics/drilldown/product.top_items",
  "/api/v1/admin/analytics/drilldown/sales.gross_sales",
  "/api/v1/admin/hr/employees?limit=5",
  "/api/v1/admin/purchasing/invoices?limit=5",
  "/api/v1/admin/dashboard/operations",
];

function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}

async function connect() {
  try {
    const browser = await chromium.connectOverCDP(CDP, { timeout: 4000 });
    const context = browser.contexts()[0] || (await browser.newContext());
    return { browser, mode: "cdp", context, detach: false };
  } catch {
    const browser = await chromium.launch({
      headless: false,
      channel: process.env.TELEPIZZA_BROWSER_CHANNEL || "chrome",
    });
    return { browser, mode: "headed", context: await browser.newContext(), detach: true };
  }
}

async function readMe(page) {
  return page.evaluate(async (apiBase) => {
    let accessToken = null;
    for (const k of Object.keys(localStorage)) {
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
        /* ignore */
      }
    }
    if (!accessToken) return { ok: false, reason: "NO_TOKEN" };
    const res = await fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    const email = json?.data?.email || json?.email || null;
    return {
      ok: res.ok,
      status: res.status,
      emailDomain: email?.includes("@") ? email.split("@")[1] : null,
      emailMatchesOwner: email ? /mian\.imr4n@gmail\.com/i.test(email) : false,
      rolePresent: Boolean(json?.data?.role || json?.data?.userType || json?.role),
    };
  }, API);
}

async function waitOwner(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  await page.goto(`${SITE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  while (Date.now() < deadline) {
    const me = await readMe(page).catch(() => ({ ok: false }));
    if (me.ok) return me;
    const url = page.url();
    if (!/login|sign-in|auth/i.test(url) && /\/admin/.test(url)) {
      const again = await readMe(page).catch(() => ({ ok: false }));
      if (again.ok) return again;
    }
    await page.waitForTimeout(2000);
  }
  return { ok: false, reason: "TIMEOUT_WAITING_FOR_OWNER_SESSION" };
}

async function probe(page) {
  return page.evaluate(
    async ({ apiBase, paths }) => {
      let accessToken = null;
      for (const k of Object.keys(localStorage)) {
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
          /* ignore */
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
        const errMsg = String(json?.error?.message || "");
        const code = String(json?.error?.code || "");
        // Only treat transport/error envelopes as schema failures — not honest metric copy in 200 bodies.
        const errSurface = `${code}\n${errMsg}`;
        const failedEnvelope = !res.ok || Boolean(json?.error);
        out.push({
          path,
          status: res.status,
          ok: res.ok,
          code: code || null,
          schemaError:
            failedEnvelope &&
            /42703|42P01|column .* does not exist|relation .* does not exist|schema cache|schema-cache/i.test(
              errSurface,
            ),
          orderItemsNameError: /order_items\.name does not exist/i.test(errSurface) || (/order_items\.name does not exist/i.test(text) && !res.ok),
          dueDateError: failedEnvelope && /due_date does not exist/i.test(errSurface),
          employeeNumberError: failedEnvelope && /employee_number does not exist/i.test(errSurface),
          errSnippet: errMsg.slice(0, 180),
          hasMetrics: Boolean(json?.data?.modules || json?.data?.metrics || json?.data?.cards || json?.data?.series),
          metricStatuses: Array.isArray(json?.data?.metrics)
            ? json.data.metrics.slice(0, 12).map((m) => ({
                id: m.id || m.metricId || null,
                status: m.status || null,
              }))
            : null,
        });
      }
      return { probes: out };
    },
    { apiBase: API, paths: API_PROBES },
  );
}

async function main() {
  const health = await fetch(`${API}/healthz`).then((r) => r.json());
  const ready = await fetch(`${API}/readyz`).then((r) => r.json());
  const deployedSha = health.gitSha || ready?.runtime?.gitSha || null;
  if (deployedSha !== AUTH_SHA) {
    const fail = {
      at: new Date().toISOString(),
      ok: false,
      reason: "DEPLOYED_SHA_MISMATCH",
      authorizedSha: AUTH_SHA,
      deployedSha,
    };
    writeFileSync(outPath, JSON.stringify(fail, null, 2));
    console.log(JSON.stringify({ ok: false, reason: fail.reason, deployedSha }, null, 2));
    process.exit(3);
  }

  const { browser, mode, context, detach } = await connect();
  const page = context.pages()[0] || (await context.newPage());
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(redact(err.message).slice(0, 200)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(redact(msg.text()).slice(0, 200));
  });

  console.log(
    JSON.stringify({
      step: "await_owner_google_login",
      mode,
      site: SITE,
      hint: "Complete Owner Google login in the open Chrome window",
    }),
  );

  const identity = await waitOwner(
    page,
    Number(process.env.TELEPIZZA_SMOKE_LOGIN_TIMEOUT_MS || 300000),
  );
  if (!identity.ok) {
    const fail = { at: new Date().toISOString(), ok: false, mode, reason: identity.reason || "NO_OWNER_SESSION" };
    writeFileSync(outPath, JSON.stringify(fail, null, 2));
    console.log(JSON.stringify(fail, null, 2));
    if (detach) await browser.close();
    process.exit(2);
  }

  const apiResult = await probe(page);

  // UI: Analytics workspace + period/branch affordances
  await page.goto(`${SITE}/admin/reports`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const uiText = await page.locator("body").innerText().catch(() => "");
  const ui = {
    url: page.url().split("#")[0],
    hasAnalyticsCopy: /Owner BI|Business Intelligence|Analytics|Gross sales|Sales/i.test(uiText),
    hasPeriodControl: /period|date|today|week|month|range/i.test(uiText),
    hasBranchControl: /branch/i.test(uiText),
    schemaErrorInDom: SCHEMA_BAD.test(uiText),
    orderItemsNameInDom: /order_items\.name does not exist/i.test(uiText),
  };

  // Logout
  let logoutClicked = false;
  try {
    await page.getByRole("button", { name: /log ?out|sign ?out/i }).first().click({ timeout: 4000 });
    logoutClicked = true;
  } catch {
    try {
      await page.getByRole("link", { name: /log ?out|sign ?out/i }).first().click({ timeout: 4000 });
      logoutClicked = true;
    } catch {
      /* ignore */
    }
  }
  await page.waitForTimeout(1200);
  const afterLogout = await readMe(page).catch(() => ({ ok: false }));

  const probes = apiResult.probes || [];
  const analyticsProbes = probes.filter((p) => p.path.includes("/analytics/"));
  const product = probes.find((p) => p.path.endsWith("/modules/product"));
  const workspace = probes.find((p) => p.path.endsWith("/analytics/workspace"));
  const me = probes.find((p) => p.path.endsWith("/auth/me"));

  const schemaHits = probes.filter((p) => p.schemaError || p.orderItemsNameError || p.dueDateError || p.employeeNumberError);
  const analytics5xx = analyticsProbes.filter((p) => p.status >= 500);
  const analyticsFailed = analyticsProbes.filter((p) => !p.ok);

  const ok =
    Boolean(me?.ok) &&
    Boolean(workspace?.ok) &&
    Boolean(product?.ok) &&
    !product?.orderItemsNameError &&
    schemaHits.length === 0 &&
    analytics5xx.length === 0 &&
    analyticsFailed.length === 0 &&
    !ui.schemaErrorInDom &&
    !ui.orderItemsNameInDom &&
    deployedSha === AUTH_SHA &&
    ready.ok === true &&
    Array.isArray(ready.issues) &&
    ready.issues.length === 0;

  const payload = {
    at: new Date().toISOString(),
    ok,
    mode,
    authorizedSha: AUTH_SHA,
    deployedSha,
    healthOk: health.ok === true,
    readyOk: ready.ok === true,
    issuesEmpty: Array.isArray(ready.issues) && ready.issues.length === 0,
    identity: {
      ok: identity.ok,
      status: identity.status,
      emailDomain: identity.emailDomain,
      emailMatchesOwner: identity.emailMatchesOwner,
      rolePresent: identity.rolePresent,
    },
    ui,
    logout: { clicked: logoutClicked, sessionCleared: !afterLogout.ok },
    consoleErrorCount: consoleErrors.length,
    consoleErrorSamples: consoleErrors.slice(0, 8),
    summary: {
      analyticsOk: analyticsFailed.length === 0,
      productModuleOk: Boolean(product?.ok),
      workspaceOk: Boolean(workspace?.ok),
      orderItemsName42703: probes.some((p) => p.orderItemsNameError),
      dueDate42703: probes.some((p) => p.dueDateError),
      employeeNumber42703: probes.some((p) => p.employeeNumberError),
      schemaErrorCount: schemaHits.length,
      analytics5xxCount: analytics5xx.length,
    },
    probes: probes.map((p) => ({
      path: p.path,
      status: p.status,
      ok: p.ok,
      code: p.code,
      schemaError: p.schemaError,
      orderItemsNameError: p.orderItemsNameError,
      errSnippet: p.errSnippet || null,
      hasMetrics: p.hasMetrics,
    })),
    noMigrationOrSql: true,
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: payload.ok,
        deployedSha: payload.deployedSha,
        summary: payload.summary,
        identity: payload.identity,
        logout: payload.logout,
        outPath,
      },
      null,
      2,
    ),
  );

  if (detach) await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  writeFileSync(
    outPath,
    JSON.stringify({ at: new Date().toISOString(), ok: false, reason: redact(err.message) }, null, 2),
  );
  console.error(redact(err.message));
  process.exit(1);
});
