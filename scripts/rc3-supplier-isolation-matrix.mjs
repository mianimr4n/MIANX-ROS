/**
 * RC3 Supplier Portal — Supplier A/B isolation matrix against local API.
 * Uses gitignored fixtures from scripts/seed-rc3-supplier-portal.mjs.
 * Never prints passwords.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const FIXTURE = resolve("scripts/.tmp_pw/supplier-portal.local.json");
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
const OUT = resolve("docs/testing/acceptance-evidence/rc3-supplier-portal");

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

if (!existsSync(FIXTURE)) {
  console.error("Missing supplier fixture. Run: node scripts/seed-rc3-supplier-portal.mjs");
  process.exit(1);
}

const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
const apiEnv = loadEnv("backend/api/.env.local");
const auth = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(account) {
  const { data, error } = await auth.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`Sign-in failed for ${account.email}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const report = {
  ok: false,
  checks: [],
  failures: [],
};

function check(id, pass, detail) {
  report.checks.push({ id, pass, detail });
  if (!pass) report.failures.push({ id, detail });
}

const a = fixture.accounts.find((x) => x.key === "supplierA");
const b = fixture.accounts.find((x) => x.key === "supplierB");
const tokenA = await signIn(a);
const tokenB = await signIn(b);

const meA = await api(tokenA, "GET", "/supplier-portal/me");
check("A.me", meA.status === 200 && meA.json?.data?.context?.supplierId === a.supplierId, `status=${meA.status}`);

const meB = await api(tokenB, "GET", "/supplier-portal/me");
check("B.me", meB.status === 200 && meB.json?.data?.context?.supplierId === b.supplierId, `status=${meB.status}`);

const listA = await api(tokenA, "GET", "/supplier-portal/orders");
const idsA = (listA.json?.data ?? []).map((o) => o.id);
check("A.listsOwnPo", listA.status === 200 && idsA.includes(a.poId), `count=${idsA.length}`);
check("A.cannotSeeBPoInList", !idsA.includes(b.poId), `ids=${idsA.length}`);

const listB = await api(tokenB, "GET", "/supplier-portal/orders");
const idsB = (listB.json?.data ?? []).map((o) => o.id);
check("B.listsOwnPo", listB.status === 200 && idsB.includes(b.poId), `count=${idsB.length}`);
check("B.cannotSeeAPoInList", !idsB.includes(a.poId), `ids=${idsB.length}`);

const cross = await api(tokenA, "GET", `/supplier-portal/orders/${b.poId}`);
check(
  "A.cannotReadBPoById",
  cross.status === 404 || cross.status === 403,
  `status=${cross.status} code=${cross.json?.error?.code ?? cross.json?.code}`,
);

const crossRespond = await api(tokenA, "POST", `/supplier-portal/orders/${b.poId}/acknowledge`, {
  idempotencyKey: `iso-ack-cross-${Date.now()}`,
});
check(
  "A.cannotRespondBPo",
  crossRespond.status === 404 || crossRespond.status === 403,
  `status=${crossRespond.status}`,
);

const ackKey = `iso-ack-a-${Date.now()}`;
const ack1 = await api(tokenA, "POST", `/supplier-portal/orders/${a.poId}/acknowledge`, {
  idempotencyKey: ackKey,
});
const ack2 = await api(tokenA, "POST", `/supplier-portal/orders/${a.poId}/acknowledge`, {
  idempotencyKey: ackKey,
});
check("A.acknowledge", ack1.status === 201 || ack1.status === 200, `status=${ack1.status}`);
check(
  "A.idempotentReplay",
  (ack2.status === 201 || ack2.status === 200) &&
    ack2.json?.data?.id === ack1.json?.data?.id,
  `status=${ack2.status}`,
);

const adminDenied = await api(tokenA, "GET", "/admin/purchasing/suppliers");
check(
  "A.cannotAccessAdminPurchasing",
  adminDenied.status === 401 || adminDenied.status === 403,
  `status=${adminDenied.status}`,
);

const docCross = await api(tokenA, "POST", "/supplier-portal/documents", {
  documentType: "other",
  title: "Cross PO attempt",
  fileUrl: "https://example.com/doc.pdf",
  purchaseOrderId: b.poId,
});
check(
  "A.cannotAttachDocToBPo",
  docCross.status === 404 || docCross.status === 403,
  `status=${docCross.status}`,
);

report.ok = report.failures.length === 0;
mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "isolation-matrix.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      passed: report.checks.filter((c) => c.pass).length,
      failed: report.failures.length,
      failures: report.failures,
    },
    null,
    2,
  ),
);
process.exitCode = report.ok ? 0 : 1;
