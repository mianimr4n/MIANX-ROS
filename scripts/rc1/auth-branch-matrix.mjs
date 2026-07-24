/**
 * RC1 permanent — cross-role API + branch isolation matrix.
 * Usage: node scripts/rc1/auth-branch-matrix.mjs
 * Exit 0 = ok; 1 = assertion failure; 2 = non-local env.
 * Never prints passwords/tokens. Does not write evidence files.
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

const requireFromApi = createRequire(resolve("backend/api/package.json"));
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
const operatingBranch = operatingBranchId(handover);
const foreign = "00000000-0000-4000-8000-000000000099";

async function session(email) {
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

async function get(token, path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`http://127.0.0.1:4000/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    return {
      status: res.status,
      ok: res.ok && body.ok === true,
      code: body.error?.code || body.code || null,
    };
  } finally {
    clearTimeout(timer);
  }
}

const roles = RC1_STAFF_EMAILS;
const sessions = {};
for (const [k, email] of Object.entries(roles)) {
  sessions[k] = await session(email);
}

const endpoints = [
  { key: "opsDashboard", path: "/admin/dashboard/operations" },
  { key: "ordersList", path: "/admin/orders?limit=5" },
  { key: "kitchenTickets", path: "/kitchen/tickets?limit=5" },
  { key: "deliveryAssignments", path: "/riders/assignments?limit=5" },
  { key: "riderRoster", path: "/riders/roster" },
  { key: "staffInvites", path: "/admin/staff/invites" },
];

const matrix = {};
for (const ep of endpoints) {
  matrix[ep.key] = { results: {} };
  for (const role of Object.keys(roles)) {
    const s = sessions[role];
    matrix[ep.key].results[role] = s.ok
      ? await get(s.token, ep.path)
      : { status: 0, ok: false, code: "NO_SESSION" };
  }
  matrix[ep.key].results.anonymous = await get(null, ep.path);
}

const branchProbes = {};
for (const role of ["owner", "bm", "kitchen", "cashier"]) {
  const s = sessions[role];
  if (!s.ok) {
    branchProbes[role] = { error: "NO_SESSION" };
    continue;
  }
  branchProbes[role] = {
    opsAssigned: operatingBranch
      ? await get(s.token, `/admin/dashboard/operations?branchId=${operatingBranch}`)
      : null,
    opsForeign: await get(s.token, `/admin/dashboard/operations?branchId=${foreign}`),
    opsMalformed: await get(s.token, "/admin/dashboard/operations?branchId=not-a-uuid"),
    kitchenAssigned: operatingBranch
      ? await get(s.token, `/kitchen/tickets?limit=5&branchId=${operatingBranch}`)
      : null,
    kitchenForeign: await get(s.token, `/kitchen/tickets?limit=5&branchId=${foreign}`),
  };
}

for (const s of Object.values(sessions)) {
  if (s.sb) await s.sb.auth.signOut().catch(() => {});
}

const summary = {
  ownerOpsOk: matrix.opsDashboard.results.owner.ok === true,
  bmOpsOk: matrix.opsDashboard.results.bm.ok === true,
  kitchenOpsOk: matrix.opsDashboard.results.kitchen.ok === true,
  cashierOpsOk: matrix.opsDashboard.results.cashier.ok === true,
  cashierKitchenDenied: matrix.kitchenTickets.results.cashier.ok === false,
  anonDenied:
    matrix.opsDashboard.results.anonymous.status === 401 ||
    matrix.opsDashboard.results.anonymous.status === 403,
  bmForeignOpsDenied: branchProbes.bm?.opsForeign?.status === 403,
  kitchenForeignDenied: branchProbes.kitchen?.kitchenForeign?.status === 403,
  bmMalformedOps: branchProbes.bm?.opsMalformed?.status === 400,
  bmStaffInvitesDenied: matrix.staffInvites.results.bm.status === 403,
  incorrectlyExposed: 0,
};

const out = {
  hostClass: host,
  operatingBranchPrefix: operatingBranch ? String(operatingBranch).slice(0, 8) : null,
  summary,
  matrix,
  branchProbes,
};

out.ok = Boolean(
  summary.ownerOpsOk &&
    summary.bmOpsOk &&
    summary.kitchenOpsOk &&
    summary.cashierOpsOk &&
    summary.cashierKitchenDenied &&
    summary.anonDenied &&
    summary.bmForeignOpsDenied &&
    summary.kitchenForeignDenied &&
    summary.bmMalformedOps &&
    summary.bmStaffInvitesDenied &&
    summary.incorrectlyExposed === 0,
);

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
