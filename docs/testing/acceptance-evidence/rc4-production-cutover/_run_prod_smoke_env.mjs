/**
 * Production authenticated smoke — credentials ONLY from env.
 * Never prints passwords, tokens, JWTs, or keys.
 *
 * Required:
 *   TELEPIZZA_PROD_OWNER_EMAIL
 *   TELEPIZZA_PROD_OWNER_PASSWORD
 * Optional:
 *   TELEPIZZA_PROD_ANON_KEY (else uses apps/website/.vercel/.env.production.local VITE_SUPABASE_ANON_KEY)
 *   TELEPIZZA_PROD_SUPABASE_URL (default https://pyeowxvacgypohrbvgee.supabase.co)
 *   TELEPIZZA_PROD_API_URL (default https://telepizza-api.onrender.com)
 *   TELEPIZZA_PROD_SITE_URL (default https://telepizza-website.vercel.app)
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const PROJECT_REF = "pyeowxvacgypohrbvgee";
const DEFAULT_SB = `https://${PROJECT_REF}.supabase.co`;
const DEFAULT_API = "https://telepizza-api.onrender.com";
const DEFAULT_SITE = "https://telepizza-website.vercel.app";
const outDir = resolve("docs/testing/acceptance-evidence/rc4-production-cutover");
mkdirSync(outDir, { recursive: true });

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

function requireProdCreds() {
  const email = process.env.TELEPIZZA_PROD_OWNER_EMAIL?.trim();
  const password = process.env.TELEPIZZA_PROD_OWNER_PASSWORD?.trim();
  if (!email || !password) {
    return {
      ok: false,
      reason: "MISSING_ENV",
      detail:
        "Set TELEPIZZA_PROD_OWNER_EMAIL and TELEPIZZA_PROD_OWNER_PASSWORD (Production Owner). Local fixture passwords are forbidden.",
    };
  }
  return { ok: true, email, password };
}

function resolveAnonAndUrl() {
  const vercel = loadEnvFile("apps/website/.vercel/.env.production.local");
  const url = (process.env.TELEPIZZA_PROD_SUPABASE_URL || vercel.VITE_SUPABASE_URL || DEFAULT_SB).replace(/\/$/, "");
  const host = new URL(url).hostname;
  if (host !== `${PROJECT_REF}.supabase.co`) {
    throw new Error(`Refusing non-Production Supabase host: ${host}`);
  }
  const anon =
    process.env.TELEPIZZA_PROD_ANON_KEY?.trim() ||
    vercel.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!anon) throw new Error("Missing Production anon key (TELEPIZZA_PROD_ANON_KEY or Vercel production env)");
  return { url, anon };
}

async function hit(apiBase, path, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase}${path}`, { headers });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const blob = `${text} ${JSON.stringify(json)}`;
  const drift42703 = /42703|due_date does not exist|employee_number does not exist|column .* does not exist/i.test(
    blob,
  );
  const missingRelation = /42P01|relation .* does not exist/i.test(blob);
  return {
    path,
    status: res.status,
    ok: res.ok,
    code: json?.error?.code || json?.code || null,
    drift42703,
    missingRelation,
    hasEmployeeNumber:
      path.includes("hr/employees") && Array.isArray(json?.data)
        ? json.data.some((r) => Object.prototype.hasOwnProperty.call(r, "employeeNumber") || Object.prototype.hasOwnProperty.call(r, "employee_number"))
        : null,
    hasDueDate:
      path.includes("invoice") && Array.isArray(json?.data)
        ? json.data.some((r) => Object.prototype.hasOwnProperty.call(r, "dueDate") || Object.prototype.hasOwnProperty.call(r, "due_date"))
        : path.includes("invoice") && json?.data && typeof json.data === "object"
          ? Object.prototype.hasOwnProperty.call(json.data, "dueDate") ||
            Object.prototype.hasOwnProperty.call(json.data, "due_date") ||
            (Array.isArray(json.data.items) &&
              json.data.items.some((r) => "dueDate" in r || "due_date" in r))
          : null,
    errSnippet: redact(String(json?.error?.message || json?.message || "")).slice(0, 180),
  };
}

const creds = requireProdCreds();
const apiBase = process.env.TELEPIZZA_PROD_API_URL?.trim() || DEFAULT_API;
const site = process.env.TELEPIZZA_PROD_SITE_URL?.trim() || DEFAULT_SITE;

const results = {
  at: new Date().toISOString(),
  projectRef: PROJECT_REF,
  credentialSource: "env:TELEPIZZA_PROD_OWNER_*",
  localFixtureUsed: false,
  frontend: null,
  auth: null,
  me: null,
  refresh: null,
  logout: null,
  unauthenticated: [],
  authenticated: [],
  driftFindings: [],
  missingRelationFindings: [],
  limitations: [],
};

if (!creds.ok) {
  results.auth = { ok: false, reason: creds.reason, detail: creds.detail };
  results.limitations.push(creds.detail);
  writeFileSync(resolve(outDir, "post-migrate-smoke-auth.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: false, gate: "MISSING_PROD_OWNER_ENV", detail: creds.detail }, null, 2));
  process.exit(2);
}

try {
  const fr = await fetch(site, { method: "GET" });
  results.frontend = { status: fr.status, ok: fr.ok };
} catch (e) {
  results.frontend = { status: 0, ok: false, error: String(e.message || e) };
}

for (const p of ["/healthz", "/readyz", "/api/v1/admin/hr/employees", "/api/v1/admin/purchasing/invoices"]) {
  results.unauthenticated.push(await hit(apiBase, p, null));
}

const { url, anon } = resolveAnonAndUrl();
const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: signIn, error: signErr } = await sb.auth.signInWithPassword({
  email: creds.email,
  password: creds.password,
});

if (signErr || !signIn.session?.access_token) {
  results.auth = { ok: false, reason: redact(signErr?.message || "no session") };
  writeFileSync(resolve(outDir, "post-migrate-smoke-auth.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: false, gate: "OWNER_LOGIN_FAILED", reason: results.auth.reason }, null, 2));
  process.exit(3);
}

let access = signIn.session.access_token;
const refreshToken = signIn.session.refresh_token;
results.auth = { ok: true, emailDomain: creds.email.includes("@") ? creds.email.split("@")[1] : "set" };

const me = await hit(apiBase, "/api/v1/auth/me", access);
results.me = me;

// Session refresh
const { data: refreshed, error: refErr } = await sb.auth.refreshSession({ refresh_token: refreshToken });
if (refErr || !refreshed.session?.access_token) {
  results.refresh = { ok: false, reason: redact(refErr?.message || "refresh failed") };
} else {
  access = refreshed.session.access_token;
  results.refresh = { ok: true };
  const me2 = await hit(apiBase, "/api/v1/auth/me", access);
  results.refresh.meOk = me2.ok;
}

const paths = [
  "/api/v1/admin/dashboard/operations",
  "/api/v1/admin/hr/employees?limit=20",
  "/api/v1/admin/hr/shifts?limit=20",
  "/api/v1/admin/hr/attendance?limit=20",
  "/api/v1/admin/hr/attendance/corrections?limit=20",
  "/api/v1/admin/hr/leave?limit=20",
  "/api/v1/admin/hr/compensation?limit=20",
  "/api/v1/admin/hr/payroll/periods?limit=20",
  "/api/v1/admin/hr/payroll/runs?limit=20",
  "/api/v1/admin/purchasing/invoices?limit=20",
  "/api/v1/admin/finance/cash-reconciliations?limit=20",
  "/api/v1/admin/finance/expense-claims?limit=20",
  "/api/v1/admin/finance/customer-invoices?limit=20",
  "/api/v1/admin/finance/period-controls",
  "/api/v1/admin/reports/analytics/workspace",
  "/api/v1/admin/reports/analytics/modules",
  "/api/v1/admin/inventory/items?limit=20",
  "/api/v1/admin/inventory/recipes?limit=20",
  "/api/v1/admin/loyalty/accounts?limit=20",
  "/api/v1/admin/loyalty/rewards?limit=20",
  "/api/v1/admin/loyalty/tiers",
  "/api/v1/admin/marketing/campaigns?limit=20",
  "/api/v1/admin/marketing/templates?limit=20",
  "/api/v1/admin/documents?limit=20",
  "/api/v1/admin/orders?limit=5",
  "/api/v1/kitchen/tickets?limit=5",
];

for (const p of paths) {
  const r = await hit(apiBase, p, access);
  results.authenticated.push(r);
  if (r.drift42703) results.driftFindings.push(r.path);
  if (r.missingRelation) results.missingRelationFindings.push(r.path);
}

await sb.auth.signOut();
const afterLogout = await hit(apiBase, "/api/v1/auth/me", access);
results.logout = {
  ok: afterLogout.status === 401 || !afterLogout.ok,
  statusAfter: afterLogout.status,
  note: "Best-effort: client signOut; API should reject stale/revoked token depending on JWT validity window",
};

writeFileSync(resolve(outDir, "post-migrate-smoke-auth.json"), JSON.stringify(results, null, 2));

const authOkCount = results.authenticated.filter((r) => r.ok || r.status === 404 || r.status === 403).length;
console.log(
  JSON.stringify(
    {
      ok: results.auth.ok && results.driftFindings.length === 0 && me.ok,
      frontend: results.frontend,
      authOk: results.auth.ok,
      meOk: me.ok,
      meStatus: me.status,
      refreshOk: results.refresh?.ok || false,
      logoutClears: results.logout?.ok || false,
      authenticatedProbes: results.authenticated.length,
      authenticatedHttpOkOrExpected: authOkCount,
      drift42703: results.driftFindings,
      missingRelation: results.missingRelationFindings,
      employeeNumberFieldSeen: results.authenticated.find((r) => r.hasEmployeeNumber === true)?.path || null,
      dueDateFieldSeen: results.authenticated.find((r) => r.hasDueDate === true)?.path || null,
      wrote: "post-migrate-smoke-auth.json",
    },
    null,
    2,
  ),
);

if (!me.ok || results.driftFindings.length > 0) process.exit(4);
