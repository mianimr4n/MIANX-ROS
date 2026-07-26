/**
 * D4 LOCAL-ONLY role-matrix browser fixtures.
 * Ensures config + multi-branch + NB setup-only BM accounts for Playwright.
 * Never targets cloud Supabase. Never activates northern-bypass (must stay coming-soon).
 *
 * Usage: node scripts/d4/fixture-role-matrix.mjs
 *
 * Passwords only written to gitignored scripts/.tmp_pw/*.json — never printed.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const DB = "supabase_db_telepizza-platform";
const OUT = resolve("scripts/.tmp_pw/d4-e2e-fixture.local.json");
const D2_FIXTURE = resolve("scripts/.tmp_pw/d2-two-branch.fixture.json");
const D3_FIXTURE = resolve("scripts/.tmp_pw/d3-e2e-fixture.local.json");
const ENTERPRISE = resolve("scripts/.tmp_pw/staff-handover.local.json");

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
    console.error("REFUSED: cloud Supabase");
    process.exit(2);
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`REFUSED: expected loopback, got ${host}`);
    process.exit(2);
  }
}

function genPassword() {
  return `D4Fix-${randomBytes(9).toString("base64url")}`;
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

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

const apiEnv = loadEnv("backend/api/.env.local");
assertLocal(apiEnv.SUPABASE_URL);

const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Safety: never leave northern-bypass operating from a prior D2 fixture up.
psql(`
update public.branches
set status = 'coming-soon', updated_at = timezone('utc', now())
where branch_code = 'northern-bypass' and status is distinct from 'coming-soon';
`);

const { data: royal, error: royalErr } = await admin
  .from("branches")
  .select("id, branch_code, status")
  .eq("branch_code", "royal-orchard")
  .single();
if (royalErr || !royal) {
  console.error("royal-orchard missing", royalErr);
  process.exit(1);
}

const { data: nb, error: nbErr } = await admin
  .from("branches")
  .select("id, branch_code, status")
  .eq("branch_code", "northern-bypass")
  .single();
if (nbErr || !nb) {
  console.error("northern-bypass missing", nbErr);
  process.exit(1);
}
if (nb.status !== "coming-soon") {
  console.error(`REFUSED: northern-bypass must be coming-soon, got ${nb.status}`);
  process.exit(1);
}

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

async function ensureRoles() {
  let { data: roles } = await admin.from("roles").select("id, code");
  let roleByCode = Object.fromEntries((roles ?? []).map((r) => [r.code, r.id]));

  if (!roleByCode.admin) {
    psql(`
insert into public.roles (name, code, description, is_system_role)
values (
  'Admin',
  'admin',
  'Configuration, settings, menu, floor, and HR administration.',
  true
)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_system_role = excluded.is_system_role;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'admin'
  and p.code in (
    'admin.access',
    'menu.read',
    'menu.write',
    'floor.manage',
    'staff.read',
    'staff.manage',
    'branch.read'
  )
on conflict do nothing;
`);
    ({ data: roles } = await admin.from("roles").select("id, code"));
    roleByCode = Object.fromEntries((roles ?? []).map((r) => [r.code, r.id]));
  }

  if (!roleByCode.admin) throw new Error("admin role missing after ensure");
  return roleByCode;
}

async function ensureStaffUser({ email, fullName, role, branchId, password }) {
  const roleByCode = await ensureRoles();
  const roleId = roleByCode[role];
  if (!roleId) throw new Error(`role ${role} missing`);

  const authUserId = await ensureAuthUser(email, password, fullName);
  const branchSql = branchId
    ? `'${branchId}'::uuid`
    : "null";
  const sql = `
BEGIN;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${fullName.replace(/'/g, "''")}', '${email}', 'staff', 'active')
on conflict (auth_user_id) do update
set status = 'active',
    full_name = excluded.full_name,
    email = excluded.email,
    user_type = 'staff',
    updated_at = timezone('utc', now());
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, ${branchSql}
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id
      and ur.role_id = '${roleId}'::uuid
      and ur.branch_id is not distinct from ${branchSql}
  );
COMMIT;
`;
  psql(sql);
  const { data: user } = await admin.from("users").select("id").eq("auth_user_id", authUserId).single();
  return { email, role, password, userId: user.id, authUserId, branchId: branchId ?? null };
}

async function ensureNbOnlyBm({ email, fullName, password }) {
  const roleByCode = await ensureRoles();
  const roleId = roleByCode["branch-manager"];
  if (!roleId) throw new Error("branch-manager role missing");

  const authUserId = await ensureAuthUser(email, password, fullName);
  // Only northern-bypass membership — strip any other BM branch rows for this user.
  const sql = `
BEGIN;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${fullName.replace(/'/g, "''")}', '${email}', 'staff', 'active')
on conflict (auth_user_id) do update
set status = 'active',
    full_name = excluded.full_name,
    email = excluded.email,
    user_type = 'staff',
    updated_at = timezone('utc', now());
delete from public.user_roles ur
using public.users u, public.roles r
where ur.user_id = u.id
  and u.auth_user_id = '${authUserId}'
  and ur.role_id = r.id
  and r.code = 'branch-manager'
  and ur.branch_id is distinct from '${nb.id}'::uuid;
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${nb.id}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id
      and ur.role_id = '${roleId}'::uuid
      and ur.branch_id = '${nb.id}'::uuid
  );
COMMIT;
`;
  psql(sql);
  const { data: user } = await admin.from("users").select("id").eq("auth_user_id", authUserId).single();
  return {
    email,
    role: "branch-manager",
    password,
    userId: user.id,
    authUserId,
    branchId: nb.id,
    branchCode: "northern-bypass",
  };
}

async function ensureMultiManager({ email, fullName, password }) {
  const roleByCode = await ensureRoles();
  const roleId = roleByCode["branch-manager"];
  if (!roleId) throw new Error("branch-manager role missing");

  const authUserId = await ensureAuthUser(email, password, fullName);
  const sql = `
BEGIN;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${fullName.replace(/'/g, "''")}', '${email}', 'staff', 'active')
on conflict (auth_user_id) do update
set status = 'active',
    full_name = excluded.full_name,
    email = excluded.email,
    user_type = 'staff',
    updated_at = timezone('utc', now());
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${royal.id}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = '${roleId}'::uuid and ur.branch_id = '${royal.id}'::uuid
  );
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${nb.id}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = '${roleId}'::uuid and ur.branch_id = '${nb.id}'::uuid
  );
COMMIT;
`;
  psql(sql);
  const { data: user } = await admin.from("users").select("id").eq("auth_user_id", authUserId).single();
  return {
    email,
    role: "branch-manager",
    password,
    userId: user.id,
    authUserId,
    branchIds: [royal.id, nb.id],
    branchCode: "multi",
  };
}

function d2Password(d2, email) {
  const row = (d2?.accounts || []).find((a) => a.email?.toLowerCase() === email.toLowerCase());
  return row?.password ?? null;
}

const d2 = readJson(D2_FIXTURE);
const d3 = readJson(D3_FIXTURE);
const enterprise = readJson(ENTERPRISE);

const roleByCode = await ensureRoles();

const configPassword = genPassword();
const config = await ensureStaffUser({
  email: "d4.config.e2e@telepizza.local",
  fullName: "D4 E2E Config Admin",
  role: "admin",
  branchId: royal.id,
  password: configPassword,
});

const multiEmail = "d2-test.manager.multi@telepizza.test";
const multiPassword = d2Password(d2, multiEmail) || genPassword();
const multi = await ensureMultiManager({
  email: multiEmail,
  fullName: "D2 Test Multi Manager",
  password: multiPassword,
});

const nbBmEmail = "d2-test.bm.b@telepizza.test";
const nbBmPassword = d2Password(d2, nbBmEmail) || genPassword();
const nbBm = await ensureNbOnlyBm({
  email: nbBmEmail,
  fullName: "D2 Test BM B",
  password: nbBmPassword,
});

// Dedicated NB-only BM as alternate (same membership rule).
const d4NbPassword = genPassword();
const d4NbBm = await ensureNbOnlyBm({
  email: "d4.nb.bm@telepizza.local",
  fullName: "D4 NB Setup BM",
  password: d4NbPassword,
});

function enterprisePointer(email) {
  const row = (enterprise?.accounts || []).find((a) => a.email?.toLowerCase() === email.toLowerCase());
  return {
    email,
    role: row?.role ?? null,
    source: "staff-handover.local.json",
    present: Boolean(row?.password || row?.temporaryPassword),
  };
}

function d3Pointer(key) {
  const row = d3?.accounts?.[key];
  return {
    email: row?.email ?? null,
    role: row?.role ?? key,
    source: "d3-e2e-fixture.local.json",
    present: Boolean(row?.email && row?.password),
  };
}

mkdirSync(resolve("scripts/.tmp_pw"), { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  kind: "d4-e2e-fixture",
  environment: {
    apiBase: "http://127.0.0.1:4000",
    websiteBase: "http://127.0.0.1:3000",
    royalOrchard: { id: royal.id, code: "royal-orchard", status: royal.status },
    northernBypass: { id: nb.id, code: "northern-bypass", status: nb.status },
  },
  rolesPresent: Object.keys(roleByCode).sort(),
  accounts: {
    config,
    assigned_manager: multi,
    northern_bypass_bm: nbBm,
    northern_bypass_bm_alt: d4NbBm,
    host: d3?.accounts?.host ?? null,
    waiter: d3?.accounts?.waiter ?? null,
    enterprise: {
      super_admin: enterprisePointer("admin@telepizza.pk"),
      owner: enterprisePointer("admin@telepizza.pk"),
      branch_manager_ro: enterprisePointer("branch.manager@telepizza.pk"),
      cashier: enterprisePointer("cashier@telepizza.pk"),
      kitchen: enterprisePointer("kitchen.manager@telepizza.pk"),
      delivery: enterprisePointer("rider@telepizza.pk"),
      general_staff: enterprisePointer("support@telepizza.pk"),
    },
    d3Pointers: {
      host: d3Pointer("host"),
      waiter: d3Pointer("waiter"),
    },
  },
  homes: {
    super_admin: "/admin/dashboard",
    owner: "/admin/dashboard",
    admin: "/admin/home/config",
    assigned_manager: "/admin/branch",
    branch_manager: "/admin/branch",
    northern_bypass_bm: "/admin/branch",
    cashier: "/admin/home/cashier",
    host: "/admin/home/host",
    waiter: "/admin/home/waiter",
    kitchen: "/admin/kitchen-dashboard",
    delivery: "/admin/home/delivery",
    general_staff: "/admin/home/staff",
  },
  northernBypass: "coming-soon — do not activate",
  note: "LOCAL FIXTURE ONLY — do not commit passwords. Production northern-bypass remains coming-soon.",
};

writeFileSync(OUT, JSON.stringify(payload, null, 2));

// Also refresh a lightweight map (no passwords) for humans.
writeFileSync(
  resolve("scripts/.tmp_pw/d4-role-matrix-map.json"),
  JSON.stringify(
    {
      generatedAt: payload.generatedAt,
      fixturePath: "scripts/.tmp_pw/d4-e2e-fixture.local.json",
      homes: payload.homes,
      northernBypass: payload.northernBypass,
      accountEmails: {
        config: config.email,
        assigned_manager: multi.email,
        northern_bypass_bm: nbBm.email,
        northern_bypass_bm_alt: d4NbBm.email,
        host: d3?.accounts?.host?.email ?? null,
        waiter: d3?.accounts?.waiter?.email ?? null,
      },
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      fixturePath: "scripts/.tmp_pw/d4-e2e-fixture.local.json",
      northernBypassStatus: nb.status,
      adminRolePresent: Boolean(roleByCode.admin),
      configEmail: config.email,
      assignedManagerEmail: multi.email,
      nbBmEmail: nbBm.email,
      d3FixturePresent: Boolean(d3),
      enterpriseHandoverPresent: Boolean(enterprise),
      hint: "Run D3 fixture first if host/waiter missing: node scripts/d3/fixture-browser-acceptance.mjs",
    },
    null,
    2,
  ),
);
