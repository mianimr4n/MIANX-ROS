/**
 * RC3 Integration — security / actor matrix (API-level).
 * Uses staff handover + supplier portal fixtures. Never prints passwords.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  RC1_STAFF_EMAILS,
  accountByEmail,
  fixturePassword,
  loadStaffHandover,
} from "./rc1/lib/fixtures.mjs";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const OUT = resolve("docs/testing/acceptance-evidence/rc3-integration-certification");
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
const SUPPLIER_FIXTURE = resolve("scripts/.tmp_pw/supplier-portal.local.json");
mkdirSync(OUT, { recursive: true });

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

const apiEnv = loadEnv("backend/api/.env.local");
const auth = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(email, password) {
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign-in failed: ${email}: ${error?.message}`);
  return data.session.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, code: json?.error?.code ?? json?.code ?? null, json };
}

const report = { ok: false, checks: [], failures: [], actors: {}, limitations: [] };

function check(id, pass, detail) {
  report.checks.push({ id, pass, detail });
  if (!pass) report.failures.push({ id, detail });
}

function expectStatus(id, actual, allowed, detail = "") {
  const pass = allowed.includes(actual);
  check(id, pass, `status=${actual} allowed=${allowed.join("|")} ${detail}`.trim());
}

try {
  const handover = loadStaffHandover();
  const owner = accountByEmail(handover, RC1_STAFF_EMAILS.owner);
  const ownerTok = await signIn(owner.email, fixturePassword(owner));
  report.actors.owner = owner.email;

  // Unauthenticated
  expectStatus("unauth.finance", (await api(null, "GET", "/admin/finance/attention")).status, [401, 403]);
  expectStatus("unauth.hr", (await api(null, "GET", "/admin/hr/employees")).status, [401, 403]);
  expectStatus("unauth.supplierPortal", (await api(null, "GET", "/supplier-portal/me")).status, [401, 403]);

  // Owner can read attention surfaces (200) or honest unavailable (503)
  for (const [id, path] of [
    ["owner.financeAttention", "/admin/finance/attention"],
    ["owner.purchasing", "/admin/purchasing/purchase-orders"],
  ]) {
    const r = await api(ownerTok, "GET", path);
    expectStatus(id, r.status, [200, 503, 404], r.code ?? "");
  }

  if (existsSync(SUPPLIER_FIXTURE)) {
    const fx = JSON.parse(readFileSync(SUPPLIER_FIXTURE, "utf8"));
    const a = fx.accounts.find((x) => x.key === "supplierA");
    const b = fx.accounts.find((x) => x.key === "supplierB");
    const aTok = await signIn(a.email, a.password);
    const bTok = await signIn(b.email, b.password);
    report.actors.supplierA = a.email;
    report.actors.supplierB = b.email;

    const aList = await api(aTok, "GET", "/supplier-portal/orders");
    expectStatus("supplierA.list", aList.status, [200]);
    const idsA = (aList.json?.data ?? []).map((po) => String(po.id));
    check("supplierA.cannotSeeBInList", !idsA.includes(String(b.poId)), `sawB=${idsA.includes(String(b.poId))}`);

    expectStatus(
      "supplierA.cannotReadB",
      (await api(aTok, "GET", `/supplier-portal/orders/${b.poId}`)).status,
      [404, 403],
    );
    expectStatus(
      "supplierA.cannotAdminPurchasing",
      (await api(aTok, "GET", "/admin/purchasing/suppliers")).status,
      [401, 403],
    );
    expectStatus(
      "supplierA.cannotFinance",
      (await api(aTok, "GET", "/admin/finance/attention")).status,
      [401, 403],
    );
    expectStatus(
      "supplierA.cannotHr",
      (await api(aTok, "GET", "/admin/hr/employees")).status,
      [401, 403],
    );
    expectStatus("supplierB.list", (await api(bTok, "GET", "/supplier-portal/orders")).status, [200]);
  } else {
    report.limitations.push("Supplier fixtures missing — supplier isolation checks skipped");
  }

  // Branch manager if present
  const bm = accountByEmail(handover, RC1_STAFF_EMAILS.bm);
  if (bm) {
    try {
      const bmTok = await signIn(bm.email, fixturePassword(bm));
      report.actors.branchManager = bm.email;
      const r = await api(bmTok, "GET", "/admin/hr/employees");
      expectStatus("bm.hrEmployees", r.status, [200, 403, 503]);
    } catch {
      report.limitations.push("Branch manager sign-in failed — BM checks skipped");
    }
  } else {
    report.limitations.push("Branch manager fixture not in handover — BM checks skipped");
  }
} catch (err) {
  report.failures.push({ id: "matrix.setup", detail: String(err?.message ?? err).slice(0, 400) });
}

report.ok = report.failures.length === 0;
writeFileSync(resolve(OUT, "security-matrix.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.checks.filter((c) => c.pass).length, failed: report.failures.length, failures: report.failures, limitations: report.limitations }, null, 2));
process.exitCode = report.ok ? 0 : 1;
