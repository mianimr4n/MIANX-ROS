/**
 * Production post-migration smoke — secrets never printed.
 * Uses linked project anon key + local staff handover if Production auth accepts it.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const PROJECT_REF = "pyeowxvacgypohrbvgee";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const API_BASE = "https://telepizza-api.onrender.com";
const SITE = "https://telepizza-website.vercel.app";
const outDir = resolve("docs/testing/acceptance-evidence/rc4-production-cutover");
mkdirSync(outDir, { recursive: true });

function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/sb_publishable_[A-Za-z0-9_]+/g, "[REDACTED_KEY]")
    .replace(/sb_secret_[A-Za-z0-9_]+/g, "[REDACTED_KEY]");
}

function loadHandover() {
  const p = resolve("scripts/.tmp_pw/staff-handover.local.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function fetchAnonKey() {
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["supabase", "projects", "api-keys", "--project-ref", PROJECT_REF, "-o", "json"],
    { encoding: "utf8", shell: true },
  );
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 && !text.includes("api_key")) {
    throw new Error(`api-keys failed exit=${r.status}`);
  }
  let json = null;
  for (const ch of ["[", "{"]) {
    const i = text.indexOf(ch);
    if (i < 0) continue;
    try {
      json = JSON.parse(text.slice(i));
      break;
    } catch {
      /* try next */
    }
  }
  if (!json) throw new Error("Could not parse api-keys JSON");
  const keys = Array.isArray(json) ? json : json.apiKeys || json.keys || json.data || [];
  const anon =
    keys.find((k) => String(k.name || "").toLowerCase() === "anon") ||
    keys.find((k) => /anon|publishable/i.test(`${k.name || ""} ${k.type || ""}`)) ||
    keys.find((k) => String(k.api_key || k.apiKey || "").startsWith("eyJ"));
  const value = anon?.api_key || anon?.apiKey || anon?.key || anon?.value;
  if (!value) throw new Error("anon key not found in api-keys response");
  return value;
}

async function hit(path, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const errMsg = json?.error?.message || json?.message || "";
  const code = json?.error?.code || json?.code || null;
  const drift =
    /42703|due_date does not exist|employee_number does not exist|column .* does not exist/i.test(
      text,
    );
  return {
    path,
    status: res.status,
    ok: res.ok,
    code,
    drift42703: drift,
    errSnippet: redact(String(errMsg || code || "").slice(0, 160)),
  };
}

const results = {
  at: new Date().toISOString(),
  projectRef: PROJECT_REF,
  frontend: null,
  auth: null,
  unauthenticated: [],
  authenticated: [],
  driftFindings: [],
  limitations: [],
};

try {
  const fr = await fetch(SITE, { method: "GET" });
  results.frontend = { status: fr.status, ok: fr.ok };
} catch (e) {
  results.frontend = { status: 0, ok: false, error: String(e.message || e) };
}

for (const p of [
  "/healthz",
  "/readyz",
  "/api/v1/branches",
  "/api/v1/menu/catalog",
  "/api/v1/admin/hr/employees",
  "/api/v1/admin/purchasing/invoices",
]) {
  results.unauthenticated.push(await hit(p, null));
}

let token = null;
try {
  const anonKey = fetchAnonKey();
  const handover = loadHandover();
  const owner = handover?.accounts?.find((a) => a.email === "admin@telepizza.pk");
  if (!owner?.password) {
    results.limitations.push("No local Owner password fixture available");
  } else {
    const sb = createClient(SUPABASE_URL, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.auth.signInWithPassword({
      email: owner.email,
      password: owner.password,
    });
    if (error) {
      results.auth = { ok: false, reason: redact(error.message) };
      results.limitations.push("Production Owner sign-in failed with local handover password");
    } else {
      token = data.session?.access_token || null;
      results.auth = { ok: Boolean(token), email: "admin@telepizza.pk" };
    }
  }
} catch (e) {
  results.auth = { ok: false, reason: redact(String(e.message || e)) };
  results.limitations.push("Could not obtain Production anon key or sign in");
}

if (token) {
  const paths = [
    "/api/v1/auth/me",
    "/api/v1/admin/dashboard/operations",
    "/api/v1/admin/hr/employees?limit=5",
    "/api/v1/admin/purchasing/invoices?limit=5",
    "/api/v1/admin/finance/cash-reconciliations?limit=5",
    "/api/v1/admin/finance/expense-claims?limit=5",
    "/api/v1/admin/loyalty/accounts?limit=5",
    "/api/v1/admin/loyalty/rewards?limit=5",
    "/api/v1/admin/inventory/items?limit=5",
    "/api/v1/admin/reports/sales?limit=5",
    "/api/v1/admin/orders?limit=5",
    "/api/v1/kitchen/tickets?limit=5",
  ];
  for (const p of paths) {
    const r = await hit(p, token);
    results.authenticated.push(r);
    if (r.drift42703) results.driftFindings.push(r.path);
  }
} else {
  results.limitations.push("Authenticated API smoke skipped");
}

const outPath = resolve(outDir, "post-migrate-smoke.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      frontend: results.frontend,
      authOk: results.auth?.ok || false,
      unauthAdminDenied: results.unauthenticated
        .filter((r) => r.path.startsWith("/api/v1/admin"))
        .every((r) => r.status === 401),
      authenticatedCount: results.authenticated.length,
      authenticatedOk: results.authenticated.filter((r) => r.ok).length,
      drift42703Paths: results.driftFindings,
      limitations: results.limitations,
      wrote: "post-migrate-smoke.json",
    },
    null,
    2,
  ),
);
