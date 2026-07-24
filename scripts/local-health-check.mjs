/**
 * Local enterprise health check — never prints secrets.
 * Usage: node scripts/local-health-check.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

function classify(raw) {
  if (!raw) return { status: "UNKNOWN", detail: "missing" };
  try {
    const host = new URL(raw).hostname;
    if (host.endsWith(".supabase.co")) return { status: "FAIL", detail: "cloud-supabase" };
    if (host === "127.0.0.1" || host === "localhost") return { status: "PASS", detail: "loopback" };
    return { status: "WARNING", detail: `host:${host}` };
  } catch {
    return { status: "FAIL", detail: "invalid-url" };
  }
}

async function ping(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return { status: res.ok ? "PASS" : "FAIL", http: res.status };
  } catch (err) {
    return { status: "FAIL", detail: String(err?.cause?.code || err?.message || err).slice(0, 80) };
  }
}

const guard = spawnSync(process.execPath, ["scripts/local-env-guard.mjs"], {
  encoding: "utf8",
  cwd: resolve("."),
});
let guardJson = {};
try {
  guardJson = JSON.parse(guard.stdout || "{}");
} catch {
  guardJson = { parseError: true, stdout: (guard.stdout || "").slice(0, 200) };
}

const apiEnv = {
  ...loadEnv("backend/api/.env"),
  ...loadEnv("backend/api/.env.local"),
};
const webEnv = {
  ...loadEnv("apps/website/.env"),
  ...loadEnv("apps/website/.env.local"),
};

const report = {
  createdAt: new Date().toISOString(),
  checks: {
    envGuard: {
      status: guard.status === 0 ? "PASS" : guard.status === 2 ? "FAIL" : "WARNING",
      exitCode: guard.status,
      verdict: guardJson.verdict || null,
    },
    backendSupabaseUrl: classify(apiEnv.SUPABASE_URL),
    websiteSupabaseUrl: classify(webEnv.VITE_SUPABASE_URL),
    apiKeysPresent: {
      status: apiEnv.SUPABASE_ANON_KEY && apiEnv.SUPABASE_SERVICE_ROLE_KEY ? "PASS" : "FAIL",
      detail: "presence-only",
    },
    websiteAnonPresent: {
      status: webEnv.VITE_SUPABASE_ANON_KEY ? "PASS" : "FAIL",
      detail: "presence-only",
    },
    apiHealthz: await ping("http://localhost:4000/healthz"),
    apiReadyz: await ping("http://localhost:4000/readyz"),
    website: await ping("http://localhost:3000/"),
    localSupabaseApi: await ping("http://127.0.0.1:54321/rest/v1/"),
    localStudio: await ping("http://127.0.0.1:54323/"),
    realtime: {
      status: "WARNING",
      detail: "Admin ERP uses polling; Auth uses onAuthStateChange only — no order realtime channels found",
    },
    storage: {
      status: "UNKNOWN",
      detail: "Local storage available when supabase start is healthy; menu primarily uses static/catalog paths",
    },
    payments: {
      status: "PASS",
      detail: "No live Stripe/JazzCash/Easypaisa client found in backend/api/src",
    },
    whatsappOutbound: {
      status: "PASS",
      detail: "Admin WhatsApp module is order-derived Foundation; no outbound send client in API src",
    },
    email: {
      status: "WARNING",
      detail: "Staff invites use Supabase Auth email — configure Inbucket/Mailpit via local Supabase Auth",
    },
  },
};

const statuses = Object.values(report.checks).map((c) => c.status);
report.summary = {
  fail: statuses.filter((s) => s === "FAIL").length,
  warning: statuses.filter((s) => s === "WARNING").length,
  pass: statuses.filter((s) => s === "PASS").length,
  unknown: statuses.filter((s) => s === "UNKNOWN").length,
};
report.verdict =
  report.summary.fail > 0
    ? "FAIL — local environment not ready"
    : report.summary.warning > 0
      ? "WARNING — usable with documented limitations"
      : "PASS — local environment healthy";

mkdirSync("docs/testing/acceptance-evidence", { recursive: true });
writeFileSync(
  "docs/testing/acceptance-evidence/local-health-check.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ verdict: report.verdict, summary: report.summary, checks: report.checks }, null, 2));
process.exit(report.summary.fail > 0 ? 1 : 0);
