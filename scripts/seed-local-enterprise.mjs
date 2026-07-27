/**
 * LOCAL-ONLY enterprise seed: staff accounts + interconnected OMS/KDS sample orders.
 * Refuses *.supabase.co. Passwords written only to gitignored scripts/.tmp_pw/.
 *
 * DO NOT RUN IN PRODUCTION — HISTORICAL/LOCAL SEED ONLY.
 * Does not replace the canonical single-price menu domain migration.
 *
 * Usage: node scripts/seed-local-enterprise.mjs
 */
import { createHash, randomBytes } from "node:crypto";
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
    console.error("REFUSED: cloud Supabase — refuse seed");
    process.exit(2);
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    console.error(`REFUSED: expected loopback, got ${host}`);
    process.exit(2);
  }
}

function genPassword() {
  return `LocDev-${randomBytes(9).toString("base64url")}`;
}

function tokenHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

const apiEnv = loadEnv("backend/api/.env.local");
assertLocal(apiEnv.SUPABASE_URL);

const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STAFF = [
  {
    email: "admin@telepizza.pk",
    fullName: "Telepizza Owner",
    role: "super-admin",
    branchScoped: false,
    userType: "admin",
  },
  {
    email: "branch.manager@telepizza.pk",
    fullName: "Telepizza Branch Manager",
    role: "branch-manager",
    branchScoped: true,
  },
  {
    email: "kitchen.manager@telepizza.pk",
    fullName: "Telepizza Kitchen Manager",
    role: "kitchen",
    branchScoped: true,
  },
  {
    email: "cashier@telepizza.pk",
    fullName: "Telepizza Cashier",
    role: "cashier",
    branchScoped: true,
  },
  {
    email: "rider@telepizza.pk",
    fullName: "Telepizza Rider",
    role: "rider",
    branchScoped: true,
  },
  {
    email: "support@telepizza.pk",
    fullName: "Telepizza Customer Support",
    role: "customer-support",
    branchScoped: true,
  },
];

const { data: branch, error: branchErr } = await admin
  .from("branches")
  .select("id, branch_code, name, status")
  .eq("branch_code", "royal-orchard")
  .single();
if (branchErr || !branch) {
  console.error("Royal Orchard branch missing — migrations incomplete?", branchErr);
  process.exit(1);
}

const { data: roles, error: rolesErr } = await admin.from("roles").select("id, code");
if (rolesErr) {
  console.error(rolesErr);
  process.exit(1);
}
const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r.id]));

const { data: menuItem } = await admin
  .from("menu_items")
  .select("id, name")
  .eq("is_available", true)
  .limit(1)
  .maybeSingle();

mkdirSync("scripts/.tmp_pw", { recursive: true });
const accounts = [];

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

async function provisionStaff(spec, password) {
  const authUserId = await ensureAuthUser(spec.email, password, spec.fullName);
  const roleId = roleByCode[spec.role];
  if (!roleId) throw new Error(`Missing role ${spec.role}`);

  if (spec.role === "super-admin") {
    // Escalate via SQL (invite path cannot mint super-admin).
    const sql = `
select set_config('telepizza.allow_staff_provision', 'on', true);
insert into public.users (auth_user_id, full_name, email, user_type, status)
values ('${authUserId}', '${spec.fullName}', '${spec.email}', 'admin', 'active')
on conflict (auth_user_id) do update
set user_type = 'admin', status = 'active', full_name = excluded.full_name, email = excluded.email,
    updated_at = timezone('utc', now());
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, r.id, null
from public.users u
cross join public.roles r
where u.auth_user_id = '${authUserId}' and r.code = 'super-admin'
  and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and ur.role_id = r.id and ur.branch_id is null
  );
delete from public.user_roles ur
using public.users u, public.roles r
where ur.user_id = u.id and u.auth_user_id = '${authUserId}'
  and ur.role_id = r.id and r.code = 'customer';
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
      throw new Error(`Owner escalate failed: ${psql.stderr || psql.stdout}`);
    }
    return { authUserId, path: "sql-escalate" };
  }

  // Staff invite finalize path
  const { data: existingInvite } = await admin
    .from("staff_invites")
    .select("id, status")
    .eq("email", spec.email.toLowerCase())
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  let inviteId = existingInvite?.id;
  if (!inviteId) {
    const { data: invite, error } = await admin
      .from("staff_invites")
      .insert({
        email: spec.email.toLowerCase(),
        full_name: spec.fullName,
        role_id: roleId,
        branch_id: spec.branchScoped ? branch.id : null,
        status: "pending",
        token_hash: tokenHash(),
        token_expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        sent_at: new Date().toISOString(),
        send_count: 1,
      })
      .select("id")
      .single();
    if (error) throw error;
    inviteId = invite.id;
  }

  if (existingInvite?.status !== "accepted") {
    const { error: finErr } = await admin.rpc("finalize_staff_invite_acceptance", {
      p_invite_id: inviteId,
      p_auth_user_id: authUserId,
      p_full_name: spec.fullName,
    });
    if (finErr) throw finErr;
  }

  return { authUserId, path: "invite-finalize", inviteId };
}

for (const spec of STAFF) {
  const password = genPassword();
  const result = await provisionStaff(spec, password);
  accounts.push({
    email: spec.email,
    role: spec.role,
    fullName: spec.fullName,
    password,
    authUserIdPrefix: String(result.authUserId).slice(0, 8),
    path: result.path,
    branchCode: spec.branchScoped ? branch.branch_code : null,
  });
  console.log(`OK ${spec.email} (${spec.role}) via ${result.path}`);
}

// Sample orders + kitchen tickets (service role)
const orderSpecs = [
  { number: "LOCAL-PENDING-001", status: "pending", ticket: null },
  { number: "LOCAL-CONFIRMED-001", status: "confirmed", ticket: "queued" },
  { number: "LOCAL-PREPARING-001", status: "preparing", ticket: "preparing" },
  { number: "LOCAL-READY-001", status: "ready", ticket: "ready" },
  { number: "LOCAL-COMPLETED-001", status: "completed", ticket: "completed" },
];

const seededOrders = [];
for (const spec of orderSpecs) {
  const { data: existing } = await admin
    .from("orders")
    .select("id, order_number, status")
    .eq("order_number", spec.number)
    .maybeSingle();

  let orderId = existing?.id;
  let orderStatus = existing?.status;
  if (!orderId) {
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        order_number: spec.number,
        branch_id: branch.id,
        order_type: "delivery",
        order_source: "website",
        status: spec.status,
        subtotal: 1299,
        total_amount: 1499,
        delivery_fee: 200,
        payment_status: spec.status === "completed" ? "paid" : "pending",
        contact_name: "Demo Customer",
        contact_phone: "+923001112233",
        delivery_address: "Local Dev Address, Multan",
        notes: "LOCAL SEED — safe to mutate",
      })
      .select("id, order_number, status")
      .single();
    if (error) throw error;
    orderId = order.id;
    orderStatus = order.status;

    if (menuItem) {
      await admin.from("order_items").insert({
        order_id: orderId,
        menu_item_id: menuItem.id,
        product_name: menuItem.name,
        quantity: 1,
        unit_price: 1299,
        total_price: 1299,
      });
    }
  }

  // Ensure at least one confirmable pending order remains after prior E2E runs.
  if (spec.number === "LOCAL-PENDING-001" && orderStatus && orderStatus !== "pending") {
    const freshNumber = `LOCAL-PENDING-${Date.now().toString(36).toUpperCase()}`;
    const { data: fresh, error: freshErr } = await admin
      .from("orders")
      .insert({
        order_number: freshNumber,
        branch_id: branch.id,
        order_type: "delivery",
        order_source: "website",
        status: "pending",
        subtotal: 1299,
        total_amount: 1499,
        delivery_fee: 200,
        payment_status: "pending",
        contact_name: "Demo Customer",
        contact_phone: "+923001112233",
        delivery_address: "Local Dev Address, Multan",
        notes: "LOCAL SEED — fresh pending for OMS confirm",
      })
      .select("id, order_number, status")
      .single();
    if (freshErr) throw freshErr;
    if (menuItem) {
      await admin.from("order_items").insert({
        order_id: fresh.id,
        menu_item_id: menuItem.id,
        product_name: menuItem.name,
        quantity: 1,
        unit_price: 1299,
        total_price: 1299,
      });
    }
    seededOrders.push({
      orderNumber: fresh.order_number,
      status: fresh.status,
      kitchenTicket: null,
    });
  }

  if (spec.ticket) {
    const { data: ticket } = await admin
      .from("kitchen_tickets")
      .select("id, status")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!ticket) {
      const { error: tErr } = await admin.from("kitchen_tickets").insert({
        order_id: orderId,
        branch_id: branch.id,
        status: spec.ticket,
      });
      if (tErr) throw tErr;
    } else if (ticket.status !== spec.ticket) {
      await admin.from("kitchen_tickets").update({ status: spec.ticket }).eq("id", ticket.id);
    }
  }

  if (spec.status === "dispatched" || spec.number === "LOCAL-READY-001") {
    const { data: del } = await admin.from("deliveries").select("id").eq("order_id", orderId).maybeSingle();
    if (!del) {
      await admin.from("deliveries").insert({
        order_id: orderId,
        branch_id: branch.id,
        status: "assigned",
        delivery_address: "Local Dev Address, Multan",
      });
    }
  }

  seededOrders.push({ orderNumber: spec.number, status: spec.status, kitchenTicket: spec.ticket });
}

const handover = {
  createdAt: new Date().toISOString(),
  warning: "LOCAL DEVELOPMENT PASSWORDS ONLY — never commit; never use in cloud",
  environment: { supabaseHost: "127.0.0.1", branch },
  accounts,
  orders: seededOrders,
};
writeFileSync("scripts/.tmp_pw/staff-handover.local.json", JSON.stringify(handover, null, 2));
writeFileSync(
  "docs/testing/acceptance-evidence/local-seed-summary.json",
  JSON.stringify(
    {
      createdAt: handover.createdAt,
      branch: { code: branch.branch_code, idPrefix: String(branch.id).slice(0, 8) },
      accounts: accounts.map((a) => ({
        email: a.email,
        role: a.role,
        path: a.path,
        passwordStored: "scripts/.tmp_pw/staff-handover.local.json",
      })),
      orders: seededOrders,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      accounts: accounts.length,
      orders: seededOrders.length,
      handover: "scripts/.tmp_pw/staff-handover.local.json",
    },
    null,
    2,
  ),
);
