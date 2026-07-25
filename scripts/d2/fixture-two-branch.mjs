/**
 * D2 controlled two-branch fixture (LOCAL / TEST ONLY).
 *
 * - Temporarily activates northern-bypass for isolated tests
 * - Provisions d2-test-* identities for both branches
 * - Never targets cloud Supabase
 * - Writes credentials only to gitignored scripts/.tmp_pw/
 *
 * Usage:
 *   node scripts/d2/fixture-two-branch.mjs up
 *   node scripts/d2/fixture-two-branch.mjs down   # restore northern-bypass to coming-soon
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const action = process.argv[2] || "up";
const OUT = resolve("scripts/.tmp_pw/d2-two-branch.fixture.json");
const DB = "supabase_db_telepizza-platform";

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

function assertLocal(url) {
  if (!url) {
    console.error("REFUSED: missing SUPABASE_URL");
    process.exit(2);
  }
  const host = new URL(url).hostname;
  if (host.endsWith(".supabase.co")) {
    console.error("REFUSED: cloud Supabase — fixture blocked");
    process.exit(2);
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`REFUSED: expected loopback, got ${host}`);
    process.exit(2);
  }
  if (process.env.TELEPIZZA_ENV === "production" || process.env.NODE_ENV === "production") {
    console.error("REFUSED: production env class");
    process.exit(2);
  }
}

function genPassword() {
  return `D2Test-${randomBytes(9).toString("base64url")}`;
}

function tokenHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

function psql(sql) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  );
  if ((r.status ?? 1) !== 0) {
    throw new Error(r.stderr || r.stdout || "psql failed");
  }
  return r.stdout;
}

const apiEnv = loadEnv("backend/api/.env.local");
assertLocal(apiEnv.SUPABASE_URL);

const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureAuthUser(email, password, fullName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

async function loadBranches() {
  const { data, error } = await admin.from("branches").select("id, branch_code, name, status");
  if (error) throw error;
  const royal = data.find((b) => b.branch_code === "royal-orchard");
  const northern = data.find((b) => b.branch_code === "northern-bypass");
  if (!royal || !northern) throw new Error("Expected both seeded branches");
  return { royal, northern };
}

async function provisionScopedStaff({ email, fullName, roleCode, branchId, password }) {
  const { data: roles } = await admin.from("roles").select("id, code");
  const roleId = roles.find((r) => r.code === roleCode)?.id;
  if (!roleId) throw new Error(`Missing role ${roleCode}`);

  const authUserId = await ensureAuthUser(email, password, fullName);

  // Prefer SQL provision for repeatable test identities (invite path locks coming-soon).
  const sql = `
BEGIN;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${fullName.replace(/'/g, "''")}', '${email}', 'staff', 'active')
on conflict (auth_user_id) do update
set user_type = 'staff', status = 'active', full_name = excluded.full_name, email = excluded.email,
    updated_at = timezone('utc', now());
update public.users set user_type = 'staff', status = 'active'
where auth_user_id = '${authUserId}';
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${branchId}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = '${roleId}'::uuid and ur.branch_id = '${branchId}'::uuid
  );
COMMIT;
`;
  psql(sql);
  return authUserId;
}

async function ensureRiderRow(authUserId, branchId, fullName) {
  const { data: user } = await admin.from("users").select("id").eq("auth_user_id", authUserId).maybeSingle();
  if (!user) throw new Error("user missing for rider");
  const { data: existing } = await admin.from("riders").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("riders")
    .insert({
      user_id: user.id,
      branch_id: branchId,
      full_name: fullName,
      phone: "+923000000099",
      vehicle_type: "bike",
      status: "available",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

if (action === "down") {
  psql(`
update public.branches
set status = 'coming-soon', updated_at = timezone('utc', now())
where branch_code = 'northern-bypass';
`);
  console.log(JSON.stringify({ ok: true, action: "down", northernBypass: "coming-soon" }));
  process.exit(0);
}

if (action !== "up") {
  console.error("Usage: node scripts/d2/fixture-two-branch.mjs up|down");
  process.exit(1);
}

const { royal, northern } = await loadBranches();
const productionNorthernStatus = northern.status;

// Activate northern-bypass ONLY inside this fixture (local test).
psql(`
update public.branches
set status = 'operating', updated_at = timezone('utc', now())
where branch_code = 'northern-bypass';
`);

const staffSpecs = [
  { email: "d2-test.cashier.a@telepizza.test", fullName: "D2 Test Cashier A", role: "cashier", branch: royal },
  { email: "d2-test.kitchen.a@telepizza.test", fullName: "D2 Test Kitchen A", role: "kitchen", branch: royal },
  { email: "d2-test.rider.a@telepizza.test", fullName: "D2 Test Rider A", role: "rider", branch: royal },
  { email: "d2-test.bm.a@telepizza.test", fullName: "D2 Test BM A", role: "branch-manager", branch: royal },
  { email: "d2-test.cashier.b@telepizza.test", fullName: "D2 Test Cashier B", role: "cashier", branch: northern },
  { email: "d2-test.kitchen.b@telepizza.test", fullName: "D2 Test Kitchen B", role: "kitchen", branch: northern },
  { email: "d2-test.rider.b@telepizza.test", fullName: "D2 Test Rider B", role: "rider", branch: northern },
  { email: "d2-test.bm.b@telepizza.test", fullName: "D2 Test BM B", role: "branch-manager", branch: northern },
];

const accounts = [];
for (const spec of staffSpecs) {
  const password = genPassword();
  const authUserId = await provisionScopedStaff({
    email: spec.email,
    fullName: spec.fullName,
    roleCode: spec.role,
    branchId: spec.branch.id,
    password,
  });
  let riderId = null;
  if (spec.role === "rider") {
    riderId = await ensureRiderRow(authUserId, spec.branch.id, spec.fullName);
  }
  accounts.push({
    email: spec.email,
    role: spec.role,
    branchCode: spec.branch.branch_code,
    branchId: spec.branch.id,
    password,
    authUserIdPrefix: String(authUserId).slice(0, 8),
    riderId,
  });
  console.log(`OK ${spec.email} @ ${spec.branch.branch_code}`);
}

// Multi-branch assigned manager (both branches)
{
  const password = genPassword();
  const email = "d2-test.manager.multi@telepizza.test";
  const authUserId = await ensureAuthUser(email, password, "D2 Test Multi Manager");
  const { data: roles } = await admin.from("roles").select("id, code");
  const roleId = roles.find((r) => r.code === "branch-manager")?.id;
  psql(`
BEGIN;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', 'D2 Test Multi Manager', '${email}', 'staff', 'active')
on conflict (auth_user_id) do update
set user_type='staff', status='active', updated_at=timezone('utc', now());
update public.users set user_type='staff', status='active' where auth_user_id='${authUserId}';
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${royal.id}'::uuid from public.users u
where u.auth_user_id='${authUserId}'
  and not exists (select 1 from public.user_roles ur where ur.user_id=u.id and ur.role_id='${roleId}' and ur.branch_id='${royal.id}');
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${northern.id}'::uuid from public.users u
where u.auth_user_id='${authUserId}'
  and not exists (select 1 from public.user_roles ur where ur.user_id=u.id and ur.role_id='${roleId}' and ur.branch_id='${northern.id}');
COMMIT;
`);
  accounts.push({
    email,
    role: "branch-manager",
    branchCode: "multi",
    branchIds: [royal.id, northern.id],
    password,
    authUserIdPrefix: String(authUserId).slice(0, 8),
  });
  console.log(`OK ${email} @ multi`);
}

mkdirSync(resolve("scripts/.tmp_pw"), { recursive: true });
const fixture = {
  kind: "d2-two-branch-isolated-fixture",
  createdAt: new Date().toISOString(),
  warning: "LOCAL TEST ONLY — restore northern-bypass with: node scripts/d2/fixture-two-branch.mjs down",
  productionTruthPreservedOutsideFixture: {
    royalOrchard: "operating",
    northernBypassSeedStatus: productionNorthernStatus,
    note: "Fixture sets northern-bypass=operating until down",
  },
  branches: {
    royalOrchard: { id: royal.id, code: royal.branch_code },
    northernBypass: { id: northern.id, code: northern.branch_code, fixtureStatus: "operating" },
  },
  accounts,
};
writeFileSync(OUT, JSON.stringify(fixture, null, 2));
console.log(JSON.stringify({ ok: true, action: "up", accounts: accounts.length, out: OUT }, null, 2));
