/**
 * D3 LOCAL-ONLY browser acceptance fixtures.
 * Creates test floors/tables/policy + host/waiter accounts for royal-orchard.
 * Passwords only written to gitignored scripts/.tmp_pw/.
 * Never targets cloud Supabase. Never activates production northern-bypass permanently.
 *
 * Usage: node scripts/d3/fixture-browser-acceptance.mjs
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

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
  return `D3Fix-${randomBytes(9).toString("base64url")}`;
}

const apiEnv = loadEnv("backend/api/.env.local");
assertLocal(apiEnv.SUPABASE_URL);
const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: royal, error: royalErr } = await admin
  .from("branches")
  .select("id, branch_code, status, timezone")
  .eq("branch_code", "royal-orchard")
  .single();
if (royalErr || !royal) {
  console.error("royal-orchard missing", royalErr);
  process.exit(1);
}
if (royal.status !== "operating") {
  console.error("royal-orchard must be operating for fixtures");
  process.exit(1);
}

const { data: nb } = await admin
  .from("branches")
  .select("id, branch_code, status")
  .eq("branch_code", "northern-bypass")
  .single();

// Ensure timezone
if (!royal.timezone) {
  await admin.from("branches").update({ timezone: "Asia/Karachi" }).eq("id", royal.id);
}

const { data: roles } = await admin.from("roles").select("id, code");
const roleByCode = Object.fromEntries((roles ?? []).map((r) => [r.code, r.id]));

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

async function ensureStaffUser({ email, fullName, role, branchId }) {
  const password = genPassword();
  const authUserId = await ensureAuthUser(email, password, fullName);
  const roleId = roleByCode[role];
  if (!roleId) throw new Error(`role ${role} missing`);

  // Provision via SQL with staff-provision GUC (client RLS/triggers block user_type writes).
  const { spawnSync } = await import("node:child_process");
  const sql = `
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
select u.id, '${roleId}'::uuid, '${branchId}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = '${roleId}'::uuid and ur.branch_id = '${branchId}'::uuid
  );
`;
  const psql = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_telepizza-platform",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  );
  if (psql.status !== 0) {
    throw new Error(`staff provision failed: ${psql.stderr || psql.stdout}`);
  }
  const { data: user } = await admin.from("users").select("id").eq("auth_user_id", authUserId).single();
  return { email, role, password, userId: user.id, authUserId };
}

// Floor + tables for royal-orchard (idempotent by code)
let floorId;
{
  const { data: existing } = await admin
    .from("restaurant_floors")
    .select("id")
    .eq("branch_id", royal.id)
    .eq("code", "d3-e2e-ground")
    .maybeSingle();
  if (existing) floorId = existing.id;
  else {
    const { data, error } = await admin
      .from("restaurant_floors")
      .insert({
        branch_id: royal.id,
        code: "d3-e2e-ground",
        display_name: "D3 E2E Ground",
        sort_order: 1,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    floorId = data.id;
  }
}

let areaId;
{
  const { data: existing } = await admin
    .from("service_areas")
    .select("id")
    .eq("branch_id", royal.id)
    .eq("code", "d3-e2e-hall")
    .maybeSingle();
  if (existing) areaId = existing.id;
  else {
    const { data, error } = await admin
      .from("service_areas")
      .insert({
        branch_id: royal.id,
        floor_id: floorId,
        code: "d3-e2e-hall",
        display_name: "D3 E2E Hall",
        sort_order: 1,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    areaId = data.id;
  }
}

const tableSpecs = [
  { number: "E2E-A", capacity_max: 4 },
  { number: "E2E-B", capacity_max: 4 },
  { number: "E2E-C", capacity_max: 6 },
  { number: "E2E-D", capacity_max: 4 },
];
const tables = {};
for (const spec of tableSpecs) {
  const { data: existing } = await admin
    .from("restaurant_tables")
    .select("id, table_number, operational_status")
    .eq("branch_id", royal.id)
    .eq("table_number", spec.number)
    .maybeSingle();
  if (existing) {
    await admin
      .from("restaurant_tables")
      .update({
        floor_id: floorId,
        service_area_id: areaId,
        is_active: true,
        operational_status: "available",
        status: "available",
        capacity_min: 2,
        capacity_max: spec.capacity_max,
      })
      .eq("id", existing.id);
    tables[spec.number] = existing.id;
  } else {
    const { data, error } = await admin
      .from("restaurant_tables")
      .insert({
        branch_id: royal.id,
        floor_id: floorId,
        service_area_id: areaId,
        table_number: spec.number,
        capacity_min: 2,
        capacity_max: spec.capacity_max,
        capacity: spec.capacity_max,
        is_active: true,
        operational_status: "available",
        status: "available",
        shape: "square",
      })
      .select("id")
      .single();
    if (error) throw error;
    tables[spec.number] = data.id;
  }
}

// Combination E2E-C + E2E-D
{
  const { data: existing } = await admin
    .from("table_combinations")
    .select("id")
    .eq("branch_id", royal.id)
    .eq("code", "e2e-cd")
    .maybeSingle();
  let comboId = existing?.id;
  if (!comboId) {
    const { data, error } = await admin
      .from("table_combinations")
      .insert({
        branch_id: royal.id,
        code: "e2e-cd",
        display_name: "E2E C+D",
        min_party_size: 6,
        max_party_size: 10,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    comboId = data.id;
    await admin.from("table_combination_members").insert([
      { combination_id: comboId, table_id: tables["E2E-C"], sort_order: 1 },
      { combination_id: comboId, table_id: tables["E2E-D"], sort_order: 2 },
    ]);
  }
}

// Booking policy with online booking
{
  const { data: existing } = await admin
    .from("branch_booking_policies")
    .select("id")
    .eq("branch_id", royal.id)
    .maybeSingle();
  const payload = {
    branch_id: royal.id,
    booking_enabled: true,
    online_booking_enabled: true,
    min_advance_minutes: 0,
    max_advance_days: 30,
    slot_interval_minutes: 30,
    default_duration_minutes: 90,
    max_party_size_online: 12,
    service_start_time: "11:00:00",
    service_end_time: "23:00:00",
    deposit_required: false,
  };
  if (existing) {
    await admin.from("branch_booking_policies").update(payload).eq("id", existing.id);
  } else {
    const { error } = await admin.from("branch_booking_policies").insert(payload);
    if (error) throw error;
  }
}

const host = await ensureStaffUser({
  email: "d3.host.e2e@telepizza.local",
  fullName: "D3 E2E Host",
  role: "host",
  branchId: royal.id,
});
const waiter = await ensureStaffUser({
  email: "d3.waiter.e2e@telepizza.local",
  fullName: "D3 E2E Waiter",
  role: "waiter",
  branchId: royal.id,
});

// Load existing enterprise handover for BM/cashier/kitchen/admin passwords (do not rewrite those)
let enterprise = { accounts: [] };
const enterprisePath = resolve("scripts/.tmp_pw/staff-handover.local.json");
if (existsSync(enterprisePath)) {
  enterprise = JSON.parse(readFileSync(enterprisePath, "utf8"));
}

mkdirSync("scripts/.tmp_pw", { recursive: true });
const out = {
  generatedAt: new Date().toISOString(),
  environment: {
    apiBase: "http://127.0.0.1:4000",
    websiteBase: "http://127.0.0.1:3000",
    royalOrchard: { id: royal.id, code: "royal-orchard", status: royal.status },
    northernBypass: nb
      ? { id: nb.id, code: "northern-bypass", status: nb.status }
      : null,
  },
  floor: { id: floorId, code: "d3-e2e-ground" },
  area: { id: areaId, code: "d3-e2e-hall" },
  tables,
  accounts: {
    host,
    waiter,
    // pointers into enterprise handover (emails only; passwords stay in that file)
    enterpriseEmails: (enterprise.accounts || []).map((a) => a.email),
  },
  note: "LOCAL FIXTURE ONLY — do not commit passwords. Production northern-bypass remains coming-soon.",
};
writeFileSync(resolve("scripts/.tmp_pw/d3-e2e-fixture.local.json"), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      royalOrchard: royal.branch_code,
      northernBypassStatus: nb?.status ?? null,
      tables: Object.keys(tables),
      host: host.email,
      waiter: waiter.email,
      fixturePath: "scripts/.tmp_pw/d3-e2e-fixture.local.json",
    },
    null,
    2,
  ),
);
