/**
 * Security closeout smoke — Owner email/password login + authenticated probes.
 * Never prints passwords, JWTs, or keys.
 *
 * Preferred:
 *   TELEPIZZA_PROD_OWNER_EMAIL
 *   TELEPIZZA_PROD_OWNER_PASSWORD
 *
 * Fallback: CDP browser session (http://127.0.0.1:9222) after manual Owner login.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve("package.json"));
const { chromium } = require("@playwright/test");
const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const PROJECT_REF = "pyeowxvacgypohrbvgee";
const API = process.env.TELEPIZZA_PROD_API_URL || "https://telepizza-api.onrender.com";
const SITE = process.env.TELEPIZZA_PROD_SITE_URL || "https://telepizza-website.vercel.app";
const SB = process.env.TELEPIZZA_PROD_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const CDP = process.env.TELEPIZZA_CDP_URL || "http://127.0.0.1:9222";
const EXPECT_SHA = (process.env.TELEPIZZA_EXPECT_SHA || "e5c6daf0ba57f6a601f6a902821d41bfc5b3a291").toLowerCase();
const outDir = resolve("docs/testing/acceptance-evidence/rc4-production-cutover");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "security-closeout-smoke.json");

const PROBES = [
  "/api/v1/auth/me",
  "/api/v1/admin/dashboard/operations",
  "/api/v1/admin/hr/employees?limit=5",
  "/api/v1/admin/purchasing/invoices?limit=5",
  "/api/v1/admin/finance/expenses?limit=5",
  "/api/v1/admin/hr/payroll-runs?limit=5",
  "/api/v1/admin/analytics/workspace",
  "/api/v1/admin/analytics/modules/product",
  "/api/v1/admin/inventory/items?limit=5",
  "/api/v1/admin/loyalty/accounts?limit=5",
  "/api/v1/admin/hr/documents?limit=5",
];

function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_]+/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
}

function loadEnvFile(path) {
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

function resolveAnon() {
  const vercel = loadEnvFile("apps/website/.vercel/.env.production.local");
  const anon = process.env.TELEPIZZA_PROD_ANON_KEY?.trim() || vercel.VITE_SUPABASE_ANON_KEY?.trim() || "";
  if (!anon) throw new Error("Missing Production anon key");
  const url = (process.env.TELEPIZZA_PROD_SUPABASE_URL || vercel.VITE_SUPABASE_URL || SB).replace(/\/$/, "");
  if (!url.includes(PROJECT_REF)) throw new Error("Refusing non-Production Supabase host");
  return { url, anon };
}

async function healthReady() {
  const [hz, rz] = await Promise.all([
    fetch(`${API}/healthz`).then((r) => r.json()),
    fetch(`${API}/readyz`).then((r) => r.json()),
  ]);
  return {
    healthOk: hz.ok === true,
    readyOk: rz.ok === true,
    issuesEmpty: Array.isArray(rz.issues) && rz.issues.length === 0,
    healthSha: hz.gitSha || null,
    readySha: rz.runtime?.gitSha || null,
    db: hz.database?.connectivity || null,
  };
}

async function loginWithPassword() {
  const email = process.env.TELEPIZZA_PROD_OWNER_EMAIL?.trim();
  const password = process.env.TELEPIZZA_PROD_OWNER_PASSWORD?.trim();
  if (!email || !password) return { ok: false, mode: "env", reason: "MISSING_ENV" };
  const { url, anon } = resolveAnon();
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    return {
      ok: false,
      mode: "env-password",
      reason: "LOGIN_FAILED",
      status: error?.status || null,
      // Never include error message that might echo email; keep generic class only
      code: error?.code || null,
    };
  }
  return {
    ok: true,
    mode: "env-password",
    token: data.session.access_token,
    emailDomain: email.includes("@") ? email.split("@")[1] : null,
    emailMatchesOwner: /mian\.imr4n@gmail\.com/i.test(email),
  };
}

async function loginViaCdp(timeoutMs = 300000) {
  const browser = await chromium.connectOverCDP(CDP, { timeout: 5000 });
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());
  console.log(
    JSON.stringify({
      step: "await_owner_email_password_login",
      site: SITE,
      hint: "Sign in on /admin/login with the NEW Owner email/password (not Google-only)",
    }),
  );
  await page.goto(`${SITE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const me = await page.evaluate(async (apiBase) => {
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
        tokenPresent: true,
      };
    }, API);
    if (me.ok) {
      // Extract token only inside page for probes; return via evaluate probes instead
      return { ok: true, mode: "cdp", page, browser, identity: me };
    }
    await page.waitForTimeout(2000);
  }
  return { ok: false, mode: "cdp", reason: "TIMEOUT_WAITING_FOR_OWNER_SESSION", browser };
}

async function probeWithToken(token) {
  const out = [];
  for (const path of PROBES) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const err = String(json?.error?.message || "");
    out.push({
      path,
      status: res.status,
      ok: res.ok,
      code: json?.error?.code || null,
      schemaError: /42703|42P01|column .* does not exist|relation .* does not exist/i.test(err),
      orderItemsNameError: /order_items\.name does not exist/i.test(err),
      dueDateError: /due_date does not exist/i.test(err),
      employeeNumberError: /employee_number does not exist/i.test(err),
      errSnippet: err ? redact(err).slice(0, 160) : null,
    });
  }
  return out;
}

async function probeViaPage(page) {
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
        const err = String(json?.error?.message || "");
        out.push({
          path,
          status: res.status,
          ok: res.ok,
          code: json?.error?.code || null,
          schemaError: /42703|42P01|column .* does not exist|relation .* does not exist/i.test(err),
          orderItemsNameError: /order_items\.name does not exist/i.test(err),
          dueDateError: /due_date does not exist/i.test(err),
          employeeNumberError: /employee_number does not exist/i.test(err),
          errSnippet: err.slice(0, 160),
        });
      }
      return { probes: out };
    },
    { apiBase: API, paths: PROBES },
  );
}

async function main() {
  const hr = await healthReady();
  const shaMatch =
    String(hr.healthSha || "").toLowerCase() === EXPECT_SHA &&
    String(hr.readySha || "").toLowerCase() === EXPECT_SHA;

  let login = await loginWithPassword();
  let probes = [];
  let identity = null;
  let browser = null;

  if (login.ok && login.token) {
    identity = {
      ok: true,
      emailDomain: login.emailDomain,
      emailMatchesOwner: login.emailMatchesOwner,
      mode: login.mode,
    };
    probes = await probeWithToken(login.token);
    // Dispose token reference
    login = { ok: true, mode: login.mode };
  } else {
    try {
      const cdp = await loginViaCdp(Number(process.env.TELEPIZZA_SMOKE_LOGIN_TIMEOUT_MS || 300000));
      browser = cdp.browser;
      if (!cdp.ok) {
        const fail = {
          at: new Date().toISOString(),
          ok: false,
          reason: cdp.reason || login.reason || "LOGIN_FAILED",
          health: hr,
          shaMatch,
        };
        writeFileSync(outPath, JSON.stringify(fail, null, 2));
        console.log(JSON.stringify({ ok: false, reason: fail.reason, shaMatch, outPath }, null, 2));
        process.exit(2);
      }
      identity = { ...cdp.identity, mode: "cdp" };
      const pageResult = await probeViaPage(cdp.page);
      probes = pageResult.probes || [];
      // Logout
      try {
        await cdp.page.getByRole("button", { name: /log ?out|sign ?out/i }).first().click({ timeout: 4000 });
      } catch {
        /* ignore */
      }
    } catch (err) {
      const fail = {
        at: new Date().toISOString(),
        ok: false,
        reason: login.reason || "CDP_UNAVAILABLE",
        detail: redact(err.message),
        health: hr,
        shaMatch,
      };
      writeFileSync(outPath, JSON.stringify(fail, null, 2));
      console.log(JSON.stringify({ ok: false, reason: fail.reason, outPath }, null, 2));
      process.exit(2);
    }
  }

  const schemaHits = probes.filter(
    (p) => p.schemaError || p.orderItemsNameError || p.dueDateError || p.employeeNumberError,
  );
  const failed = probes.filter((p) => !p.ok);
  const meOk = probes.some((p) => p.path.endsWith("/auth/me") && p.ok);

  const ok =
    hr.healthOk &&
    hr.readyOk &&
    hr.issuesEmpty &&
    shaMatch &&
    meOk &&
    failed.length === 0 &&
    schemaHits.length === 0 &&
    Boolean(identity?.ok);

  const payload = {
    at: new Date().toISOString(),
    ok,
    expectedSha: EXPECT_SHA,
    shaMatch,
    health: hr,
    login: {
      ok: Boolean(identity?.ok),
      mode: identity?.mode || null,
      emailDomain: identity?.emailDomain || null,
      emailMatchesOwner: identity?.emailMatchesOwner || null,
    },
    summary: {
      probeCount: probes.length,
      failedCount: failed.length,
      schemaErrorCount: schemaHits.length,
      orderItemsName42703: probes.some((p) => p.orderItemsNameError),
      dueDate42703: probes.some((p) => p.dueDateError),
      employeeNumber42703: probes.some((p) => p.employeeNumberError),
    },
    probes: probes.map((p) => ({
      path: p.path,
      status: p.status,
      ok: p.ok,
      code: p.code,
      schemaError: p.schemaError,
      errSnippet: p.errSnippet,
    })),
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: payload.ok,
        shaMatch: payload.shaMatch,
        login: payload.login,
        summary: payload.summary,
        outPath,
      },
      null,
      2,
    ),
  );
  if (browser) {
    /* leave CDP browser open for Founder; do not close shared Chrome */
  }
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
