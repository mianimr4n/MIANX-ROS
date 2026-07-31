/**
 * LOCAL-ONLY RC3 supplier portal fixtures (Supplier A / Supplier B).
 * Refuses cloud hosts. Writes passwords only to gitignored scripts/.tmp_pw/.
 *
 * Usage: node scripts/seed-rc3-supplier-portal.mjs
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

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
  return `SupPortal-${randomBytes(9).toString("base64url")}`;
}

const apiEnv = loadEnv("backend/api/.env.local");
assertLocal(apiEnv.SUPABASE_URL);
const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: branch, error: branchErr } = await admin
  .from("branches")
  .select("id, branch_code, name")
  .eq("branch_code", "royal-orchard")
  .single();
if (branchErr || !branch) {
  console.error("Royal Orchard branch missing", branchErr);
  process.exit(1);
}

const { data: supplierRole, error: roleErr } = await admin
  .from("roles")
  .select("id")
  .eq("code", "supplier")
  .single();
if (roleErr || !supplierRole) {
  console.error("supplier role missing — apply portal migrations", roleErr);
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

function provisionSupplierUserSql(authUserId, email, fullName, supplierId, roleId, branchId) {
  const sql = `
begin;
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${fullName.replace(/'/g, "''")}', '${email}', 'supplier', 'active')
on conflict (auth_user_id) do update
set user_type = 'supplier', status = 'active', full_name = excluded.full_name, email = excluded.email,
    updated_at = timezone('utc', now());
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${roleId}'::uuid, '${branchId}'::uuid
from public.users u
where u.auth_user_id = '${authUserId}'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = '${roleId}'::uuid
  );
insert into public.supplier_portal_users (supplier_id, user_id, status, activated_at)
select '${supplierId}'::uuid, u.id, 'active', timezone('utc', now())
from public.users u
where u.auth_user_id = '${authUserId}'
on conflict (user_id) do update
set supplier_id = excluded.supplier_id, status = 'active', activated_at = timezone('utc', now()),
    deactivated_at = null, updated_at = timezone('utc', now());
commit;
`;
  const result = spawnSync(
    "docker",
    ["exec", "-i", "supabase_db_telepizza-platform", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: sql, encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error("supplier user SQL provision failed");
  }
}

async function ensureSupplier(name, email) {
  const { data: existing } = await admin
    .from("suppliers")
    .select("id, name, email")
    .eq("branch_id", branch.id)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await admin
    .from("suppliers")
    .insert({
      branch_id: branch.id,
      name,
      email,
      contact_person: `${name} Contact`,
      status: "active",
      approval_status: "approved",
      payment_terms: "Net 14",
      supplied_categories: ["dry-goods"],
    })
    .select("id, name, email")
    .single();
  if (error) throw error;
  return data;
}

async function ensurePo(supplierId, poNumber, status = "approved") {
  const { data: existing } = await admin
    .from("purchase_orders")
    .select("id, po_number, supplier_id, status, total_amount")
    .eq("branch_id", branch.id)
    .eq("po_number", poNumber)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await admin
    .from("purchase_orders")
    .insert({
      branch_id: branch.id,
      supplier_id: supplierId,
      po_number: poNumber,
      status,
      total_amount: 1500,
      expected_delivery_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      notes: "RC3 supplier portal fixture PO",
    })
    .select("id, po_number, supplier_id, status, total_amount")
    .single();
  if (error) throw error;

  await admin.from("purchase_order_lines").delete().eq("purchase_order_id", data.id);
  const { error: lineError } = await admin.from("purchase_order_lines").insert([
    {
      purchase_order_id: data.id,
      line_number: 1,
      description: "Mozzarella 1kg",
      quantity: 10,
      unit_price: 100,
      sku_ref: "MOZ-1KG",
    },
    {
      purchase_order_id: data.id,
      line_number: 2,
      description: "Tomato sauce 5L",
      quantity: 5,
      unit_price: 100,
      sku_ref: "SAUCE-5L",
    },
  ]);
  if (lineError) throw lineError;
  return data;
}

const supplierA = await ensureSupplier("RC3 Fixture Supplier A", "supplier.a@telepizza.test");
const supplierB = await ensureSupplier("RC3 Fixture Supplier B", "supplier.b@telepizza.test");
const poA = await ensurePo(supplierA.id, "RC3-PO-A-001");
const poB = await ensurePo(supplierB.id, "RC3-PO-B-001");

const fixtures = [
  {
    key: "supplierA",
    email: "supplier.a.portal@telepizza.test",
    fullName: "Supplier A Portal User",
    supplierId: supplierA.id,
    supplierName: supplierA.name,
    poId: poA.id,
    poNumber: poA.poNumber ?? poA.po_number,
  },
  {
    key: "supplierB",
    email: "supplier.b.portal@telepizza.test",
    fullName: "Supplier B Portal User",
    supplierId: supplierB.id,
    supplierName: supplierB.name,
    poId: poB.id,
    poNumber: poB.poNumber ?? poB.po_number,
  },
];

const accounts = [];
for (const fx of fixtures) {
  const password = genPassword();
  const authUserId = await ensureAuthUser(fx.email, password, fx.fullName);
  provisionSupplierUserSql(
    authUserId,
    fx.email,
    fx.fullName,
    fx.supplierId,
    supplierRole.id,
    branch.id,
  );
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  accounts.push({
    ...fx,
    userId: userRow?.id ?? null,
    authUserId,
    password,
  });
}

mkdirSync("scripts/.tmp_pw", { recursive: true });
const outPath = resolve("scripts/.tmp_pw/supplier-portal.local.json");
const payload = {
  generatedAt: new Date().toISOString(),
  environment: {
    supabaseUrl: apiEnv.SUPABASE_URL,
    branch: { id: branch.id, code: branch.branch_code, name: branch.name },
  },
  suppliers: {
    A: { id: supplierA.id, name: supplierA.name, poId: poA.id, poNumber: poA.po_number },
    B: { id: supplierB.id, name: supplierB.name, poId: poB.id, poNumber: poB.po_number },
  },
  accounts,
};
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      outPath,
      suppliers: Object.keys(payload.suppliers),
      accounts: accounts.map((a) => ({ key: a.key, email: a.email, supplierId: a.supplierId, poId: a.poId })),
    },
    null,
    2,
  ),
);
