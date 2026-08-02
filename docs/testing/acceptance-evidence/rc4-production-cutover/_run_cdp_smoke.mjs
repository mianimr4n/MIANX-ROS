/**
 * CDP-assisted Production smoke — uses Chrome on :9222.
 * Click Google login if needed; wait for Owner session; probe APIs/pages.
 * Never prints tokens.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(resolve("package.json"));
const { chromium } = require("@playwright/test");

const SITE = "https://telepizza-website.vercel.app";
const API = "https://telepizza-api.onrender.com";
const out = resolve("docs/testing/acceptance-evidence/rc4-production-cutover/post-migrate-browser-smoke.json");

function getTokenFromStorage() {
  // runs in browser
}

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const context = browser.contexts()[0];
const page =
  context.pages().find((p) => (p.url() || "").includes("telepizza")) || context.pages()[0];
if (!page) {
  console.log(JSON.stringify({ ok: false, gate: "NO_PAGE" }));
  process.exit(2);
}
console.log(JSON.stringify({ step: "connected", url: page.url().split("#")[0] }));
await page.bringToFront().catch(() => {});
await page.goto(`${SITE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60000 });

const googleSelectors = [
  page.getByRole("button", { name: /google/i }),
  page.getByRole("link", { name: /google/i }),
  page.locator("text=/continue with google/i"),
  page.locator("text=/sign in with google/i"),
];
let clicked = false;
for (const loc of googleSelectors) {
  try {
    await loc.first().click({ timeout: 2500 });
    clicked = true;
    break;
  } catch {
    /* try next */
  }
}
console.log(JSON.stringify({ step: "google_click", clicked, url: page.url().split("#")[0] }));

async function readIdentity() {
  return page.evaluate(async (api) => {
    let token = null;
    for (const k of Object.keys(localStorage)) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const j = JSON.parse(raw);
        token =
          j?.access_token ||
          j?.currentSession?.access_token ||
          j?.session?.access_token ||
          null;
        if (token) break;
      } catch {
        /* ignore */
      }
    }
    if (!token) return { ok: false, reason: "NO_TOKEN" };
    const res = await fetch(`${api}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const json = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      email: json?.data?.email || json?.email || null,
      role: json?.data?.role || json?.data?.userType || null,
      hasBranchScope: Boolean(
        json?.data?.branchId || json?.data?.branchIds || json?.data?.branches || json?.data?.activeBranchId,
      ),
    };
  }, API);
}

const deadline = Date.now() + 240000;
let identity = null;
while (Date.now() < deadline) {
  const url = page.url();
  const onAdmin = url.includes("/admin") && !url.includes("login");
  if (onAdmin) {
    identity = await readIdentity();
    if (identity.ok) break;
  }
  await page.waitForTimeout(2000);
}

console.log(
  JSON.stringify({
    step: "wait_done",
    url: page.url().split("#")[0],
    identity: identity
      ? {
          ok: identity.ok,
          status: identity.status,
          emailDomain: identity.email?.includes("@") ? identity.email.split("@")[1] : null,
          emailMatchesOwner: identity.email
            ? /mian\.imr4n@gmail\.com/i.test(identity.email)
            : null,
          rolePresent: Boolean(identity.role),
          hasBranchScope: Boolean(identity.hasBranchScope),
          reason: identity.reason || null,
        }
      : null,
  }),
);

if (!identity?.ok) {
  writeFileSync(
    out,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        mode: "cdp-assisted",
        ok: false,
        reason: "NO_OWNER_SESSION",
        googleClickAttempted: clicked,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const paths = [
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

const api = await page.evaluate(
  async ({ apiBase, paths: probePaths }) => {
    let token = null;
    for (const k of Object.keys(localStorage)) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const j = JSON.parse(raw);
        token = j?.access_token || j?.currentSession?.access_token || j?.session?.access_token || null;
        if (token) break;
      } catch {
        /* ignore */
      }
    }
    const outList = [];
    for (const path of probePaths) {
      const res = await fetch(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const text = await res.text();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch {
        /* ignore */
      }
      outList.push({
        path,
        status: res.status,
        ok: res.ok,
        code: json?.error?.code || null,
        drift42703: /42703|due_date does not exist|employee_number does not exist|column .* does not exist/i.test(
          text,
        ),
        missingRelation: /42P01|relation .* does not exist/i.test(text),
        hasEmployeeNumberKey: /employeeNumber|employee_number/.test(text),
        hasDueDateKey: /dueDate|\"due_date\"/.test(text),
        errSnippet: String(json?.error?.message || "").slice(0, 160),
      });
    }
    return outList;
  },
  { apiBase: API, paths },
);

const pages = [];
for (const p of [
  "/admin/dashboard",
  "/admin/hr",
  "/admin/finance",
  "/admin/purchasing",
  "/admin/loyalty",
  "/admin/inventory",
  "/admin/reports",
]) {
  await page.goto(`${SITE}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  const t = await page.locator("body").innerText().catch(() => "");
  pages.push({
    path: p,
    url: page.url().split("#")[0],
    drift42703InDom: /42703|due_date does not exist|employee_number does not exist/i.test(t),
  });
}

// Logout attempt
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
await page.waitForTimeout(1000);
const afterLogout = await readIdentity().catch(() => ({ ok: false, status: 0 }));

const payload = {
  at: new Date().toISOString(),
  mode: "cdp-assisted",
  identity: {
    ok: true,
    emailDomain: identity.email?.includes("@") ? identity.email.split("@")[1] : null,
    emailMatchesOwner: /mian\.imr4n@gmail\.com/i.test(identity.email || ""),
    rolePresent: Boolean(identity.role),
    hasBranchScope: Boolean(identity.hasBranchScope),
  },
  api,
  pages,
  driftFindings: api.filter((x) => x.drift42703).map((x) => x.path),
  logout: {
    uiControlFound: logoutClicked,
    meOkAfterLogout: afterLogout.ok === true,
    meStatusAfter: afterLogout.status || 0,
  },
};

writeFileSync(out, JSON.stringify(payload, null, 2));

const required = [
  "/auth/me",
  "/hr/employees",
  "/purchasing/invoices",
  "dashboard/operations",
];
const requiredPass = required.every((frag) => api.some((x) => x.path.includes(frag) && x.ok));
const summary = {
  ok:
    requiredPass &&
    payload.driftFindings.length === 0 &&
    api.every((x) => !x.missingRelation && x.status < 500) &&
    pages.every((p) => !p.drift42703InDom),
  emailMatchesOwner: payload.identity.emailMatchesOwner,
  drift42703: payload.driftFindings,
  employeeNumberKeySeen: api.some((x) => x.hasEmployeeNumberKey),
  dueDateKeySeen: api.some((x) => x.hasDueDateKey),
  api: api.map((x) => ({ path: x.path, status: x.status, ok: x.ok, code: x.code })),
  pages,
  logout: payload.logout,
  wrote: "post-migrate-browser-smoke.json",
};
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 4);
