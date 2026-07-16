#!/usr/bin/env node
/**
 * Production smoke — Slice 2B staff invite lifecycle (ephemeral users, cleaned up).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const API = "https://telepizza-api.onrender.com";
const SUPABASE_URL = "https://pyeowxvacgypohrbvgee.supabase.co";
const BRANCH_ID = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";
const SUPER_ROLE_ID = "93a250da-9a7c-4797-abe6-495e7364e7de";
const stamp = Date.now();
const ADMIN_EMAIL = `smoke.admin.${stamp}@telepizza.test`;
const STAFF_EMAIL = `smoke.cashier.${stamp}@telepizza.test`;
const PASSWORD = `SmokeTest!${stamp}Aa1`;

const keys = JSON.parse(readFileSync("/tmp/sb-env.json", "utf8"));
const sb = createClient(SUPABASE_URL, keys.service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// Separate auth client for password sign-in so service-role queries stay privileged.
const authClient = createClient(SUPABASE_URL, keys.anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function log(step, ok, detail = "") {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

function runSql(sql) {
  writeFileSync("/tmp/smoke-q.sql", sql);
  const out = execFileSync(
    "npx",
    ["supabase", "db", "query", "--linked", "-f", "/tmp/smoke-q.sql"],
    {
      cwd: "/workspace",
      env: process.env,
      encoding: "utf8",
      maxBuffer: 5_000_000,
    },
  );
  return out;
}

async function api(path, { method = "GET", token, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

async function waitForProfile(authUserId) {
  for (let i = 0; i < 30; i++) {
    const { data, error } = await sb
      .from("users")
      .select("id,user_type,email")
      .eq("auth_user_id", authUserId)
      .limit(1);
    if (error) {
      // keep retrying transient errors
    } else if (data && data.length > 0) {
      return data[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`profile not bootstrapped for ${authUserId}`);
}

async function cleanup(authIds, inviteIds) {
  const emails = [ADMIN_EMAIL.toLowerCase(), STAFF_EMAIL.toLowerCase(), `smoke.customer.${stamp}@telepizza.test`];
  const emailArray = emails.map((e) => `'${e}'`).join(",");
  try {
    runSql(`
delete from public.staff_invite_events
where invite_id in (select id from public.staff_invites where email = any(array[${emailArray}]));
delete from public.staff_invites where email = any(array[${emailArray}]);
delete from public.user_roles
where user_id in (select id from public.users where email = any(array[${emailArray}]));
delete from public.users where email = any(array[${emailArray}]);
`);
  } catch (e) {
    console.log("sql_cleanup_note", e.message.slice(0, 300));
  }

  for (const inviteId of inviteIds) {
    await sb.from("staff_invite_events").delete().eq("invite_id", inviteId);
    await sb.from("staff_invites").delete().eq("id", inviteId);
  }

  for (const authId of authIds) {
    await sb.auth.admin.deleteUser(authId);
  }
}

const authIds = [];
const inviteIds = [];

try {
  // A) Spoof headers ineffective
  {
    const spoof = await api("/api/v1/auth/me", {
      headers: {
        "x-telepizza-role": "super-admin",
        "x-telepizza-branch-id": BRANCH_ID,
      },
    });
    log("spoof_headers_without_bearer", spoof.status === 401, `status=${spoof.status}`);
  }

  // B) Catalog still healthy
  {
    const cat = await api("/api/v1/menu/catalog");
    const items = cat.json?.data?.items?.length ?? cat.json?.data?.length ?? null;
    const ok = cat.status === 200;
    log("catalog_regression", ok, `status=${cat.status}`);
  }

  // C) Bootstrap ephemeral super-admin
  {
    const { data, error } = await sb.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Smoke Super Admin" },
    });
    if (error) throw new Error(`create admin: ${error.message}`);
    authIds.push(data.user.id);
    await waitForProfile(data.user.id);

    runSql(`
select set_config('telepizza.allow_staff_provision', 'on', true);
update public.users
set user_type = 'admin', status = 'active', full_name = 'Smoke Super Admin', updated_at = timezone('utc', now())
where auth_user_id = '${data.user.id}';
delete from public.user_roles
where user_id = (select id from public.users where auth_user_id = '${data.user.id}');
insert into public.user_roles (user_id, role_id, branch_id)
select u.id, '${SUPER_ROLE_ID}', null
from public.users u where u.auth_user_id = '${data.user.id}';
`);
    log("provision_super_admin", true, ADMIN_EMAIL);
  }

  // D) Sign in as super-admin
  let adminToken;
  {
    const { data, error } = await authClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    if (error) throw new Error(`admin login: ${error.message}`);
    adminToken = data.session.access_token;
    const me = await api("/api/v1/auth/me", { token: adminToken });
    const roles = me.json?.data?.roles ?? [];
    const perms = me.json?.data?.permissions ?? [];
    const ok =
      me.status === 200 &&
      roles.includes("super-admin") &&
      perms.includes("staff.create");
    log(
      "admin_auth_me",
      ok,
      `status=${me.status} roles=${JSON.stringify(roles)} staff.create=${perms.includes("staff.create")}`,
    );
    if (!ok) throw new Error("admin principal not ready");
  }

  // E) Create + send invite
  let inviteUrl;
  let rawToken;
  {
    const created = await api("/api/v1/admin/staff/invites", {
      method: "POST",
      token: adminToken,
      body: {
        email: STAFF_EMAIL,
        fullName: "Smoke Cashier",
        roleCode: "cashier",
        branchId: BRANCH_ID,
        sendNow: true,
        expiresInHours: 2,
      },
    });
    const data = created.json?.data ?? {};
    inviteUrl = data.inviteUrl;
    rawToken = data.token ?? null;
    if (data.id) inviteIds.push(data.id);
    const ok = created.status === 201 || created.status === 200;
    log(
      "create_send_invite",
      ok && Boolean(inviteUrl || rawToken),
      `status=${created.status} inviteId=${data.id ?? "?"} hasUrl=${Boolean(inviteUrl)} err=${JSON.stringify(created.json?.error ?? null)}`,
    );
    if (!ok || !(inviteUrl || rawToken)) throw new Error("invite create failed");
    if (!rawToken && inviteUrl) {
      rawToken = new URL(inviteUrl).searchParams.get("token");
    }
    if (!rawToken) throw new Error("invite missing raw token");
  }

  // F) Accept invite (token only; spoof role in body ignored by schema)
  {
    const accepted = await api("/api/v1/auth/staff/invites/accept", {
      method: "POST",
      headers: { "x-telepizza-role": "super-admin" },
      body: {
        token: rawToken,
        password: PASSWORD,
        fullName: "Smoke Cashier",
        roleCode: "super-admin",
        branchId: "spoof-branch",
      },
    });
    const ok = accepted.status === 200 || accepted.status === 201;
    log(
      "accept_invite",
      ok,
      `status=${accepted.status} body=${JSON.stringify(accepted.json).slice(0, 240)}`,
    );
    if (!ok) throw new Error("accept failed");
  }

  // G) Staff login + /auth/me
  let staffAuthId;
  {
    const { data, error } = await authClient.auth.signInWithPassword({
      email: STAFF_EMAIL,
      password: PASSWORD,
    });
    if (error) throw new Error(`staff login: ${error.message}`);
    staffAuthId = data.user.id;
    if (!authIds.includes(staffAuthId)) authIds.push(staffAuthId);
    const staffToken = data.session.access_token;

    const me = await api("/api/v1/auth/me", { token: staffToken });
    const roles = me.json?.data?.roles ?? [];
    const branchIds = me.json?.data?.branchIds ?? me.json?.data?.branches ?? [];
    const ok =
      me.status === 200 &&
      roles.includes("cashier") &&
      !roles.includes("customer") &&
      !roles.includes("super-admin");
    log(
      "staff_auth_me",
      ok,
      `status=${me.status} roles=${JSON.stringify(roles)} branchIds=${JSON.stringify(branchIds)}`,
    );
  }

  // H) Customer cannot list invites
  {
    const customerEmail = `smoke.customer.${stamp}@telepizza.test`;
    const { data: cust, error } = await sb.auth.admin.createUser({
      email: customerEmail,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Smoke Customer" },
    });
    if (error) throw new Error(`create customer: ${error.message}`);
    authIds.push(cust.user.id);

    // Force profile ensure (auth trigger can lag); ignore if already present
    try {
      runSql(`
select public.ensure_customer_profile_for_auth_user(
  '${cust.user.id}'::uuid,
  '${customerEmail}',
  'Smoke Customer'
);
`);
    } catch (ensureErr) {
      console.log("ensure_customer_note", ensureErr.message.slice(0, 200));
    }
    await waitForProfile(cust.user.id);

    const { data: sess, error: loginErr } = await authClient.auth.signInWithPassword({
      email: customerEmail,
      password: PASSWORD,
    });
    if (loginErr) throw new Error(loginErr.message);
    const customerToken = sess.session.access_token;
    const denied = await api("/api/v1/admin/staff/invites", { token: customerToken });
    log(
      "customer_denied_invite_list",
      denied.status === 403 || denied.status === 401,
      `status=${denied.status}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({ passed: failed.length === 0, results }, null, 2));
  writeFileSync("/tmp/smoke-slice2b-results.json", JSON.stringify({ passed: failed.length === 0, results }, null, 2));

  await cleanup(authIds, inviteIds);
  log("cleanup", true, `authUsers=${authIds.length} invites=${inviteIds.length}`);

  process.exit(failed.length === 0 ? 0 : 1);
} catch (e) {
  console.error("\nSMOKE_ERROR", e.message);
  try {
    await cleanup(authIds, inviteIds);
    console.log("cleanup_after_error=true");
  } catch (cleanupErr) {
    console.error("cleanup_failed", cleanupErr.message);
  }
  writeFileSync(
    "/tmp/smoke-slice2b-results.json",
    JSON.stringify({ passed: false, error: e.message, results }, null, 2),
  );
  process.exit(1);
}
