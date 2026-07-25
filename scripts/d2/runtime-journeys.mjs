/**
 * D2 runtime journeys A–E (API-backed; browser UI probes where applicable).
 * Uses controlled fixture scripts/.tmp_pw/d2-two-branch.fixture.json + local seed handover.
 * Never prints passwords or tokens.
 *
 * Usage: node scripts/d2/runtime-journeys.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");

const API = process.env.D2_API_BASE || "http://localhost:4000";
const WEB = process.env.D2_WEB_BASE || "http://localhost:3000";
const FIXTURE = resolve("scripts/.tmp_pw/d2-two-branch.fixture.json");
const HANDOVER = resolve("scripts/.tmp_pw/staff-handover.local.json");
const OUT = resolve("docs/testing/acceptance-evidence/d2-runtime-journeys.json");

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

function loadJson(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

const apiEnv = loadEnv("backend/api/.env.local");
const host = new URL(apiEnv.SUPABASE_URL).hostname;
if (host.endsWith(".supabase.co") || (host !== "127.0.0.1" && host !== "localhost")) {
  console.error("REFUSED: non-local Supabase");
  process.exit(2);
}

const fixture = loadJson(FIXTURE);
const handover = existsSync(HANDOVER) ? loadJson(HANDOVER) : { accounts: [] };

const supabase = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function acct(email) {
  return (
    fixture.accounts.find((a) => a.email === email) ||
    handover.accounts?.find((a) => a.email === email)
  );
}

async function signIn(email) {
  const account = acct(email);
  if (!account?.password) throw new Error(`No password for ${email}`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: account.password,
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.session.access_token;
}

async function api(path, { method = "GET", token, body, headers = {}, idempotencyKey } = {}) {
  const h = {
    Accept: "application/json",
    "X-Request-Id": randomUUID(),
    ...headers,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
  if (body !== undefined) {
    h["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const requestId = res.headers.get("x-request-id") || h["X-Request-Id"];
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return {
    status: res.status,
    requestId,
    ok: res.ok,
    json,
    code: json?.error?.code || json?.code || null,
    message: json?.error?.message || json?.message || null,
  };
}

const results = {
  at: new Date().toISOString(),
  services: {},
  journeys: {},
  limitations: [],
};

function pass(journey, step, detail = {}) {
  if (!results.journeys[journey]) results.journeys[journey] = { ok: true, steps: [] };
  results.journeys[journey].steps.push({ step, ok: true, ...detail });
  console.log(`PASS [${journey}] ${step}`);
}

function fail(journey, step, detail = {}) {
  if (!results.journeys[journey]) results.journeys[journey] = { ok: false, steps: [] };
  results.journeys[journey].ok = false;
  results.journeys[journey].steps.push({ step, ok: false, ...detail });
  console.log(`FAIL [${journey}] ${step}: ${JSON.stringify(detail)}`);
}

async function kitchenFlow(token, ticketId, branchId) {
  const transitions = ["accepted", "preparing", "ready", "completed"];
  const out = [];
  for (const status of transitions) {
    const r = await api(`/api/v1/kitchen/tickets/${ticketId}/status`, {
      method: "PATCH",
      token,
      body: { status },
    });
    out.push({ status, http: r.status, requestId: r.requestId, code: r.code });
    if (!r.ok) throw new Error(`kitchen ${status} failed ${r.status} ${r.code}`);
  }
  return out;
}

async function verifyOrderPersisted(orderId, branchId) {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  const { data: items } = await admin.from("order_items").select("id").eq("order_id", orderId);
  const { count: modCount } = await admin
    .from("order_item_modifiers")
    .select("id", { count: "exact", head: true })
    .in(
      "order_item_id",
      (items || []).map((i) => i.id),
    );
  const { data: ticket } = await admin
    .from("kitchen_tickets")
    .select("id, branch_id, status")
    .eq("order_id", orderId)
    .maybeSingle();
  return {
    order,
    itemCount: items?.length || 0,
    modCount: modCount || 0,
    ticket,
    branchMatch: order?.branch_id === branchId && ticket?.branch_id === branchId,
  };
}

async function createPosPickup(token, branchCode) {
  const key = `d2-journey-${branchCode}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const r = await api("/api/v1/admin/pos/orders", {
    method: "POST",
    token,
    idempotencyKey: key,
    body: {
      branchCode,
      orderType: "pickup",
      contactName: "D2 Journey Guest",
      contactPhone: "03001112233",
      notes: "d2-runtime-journey",
      items: [
        {
          menuItemSlug: "tele-special",
          quantity: 1,
          modifiers: [{ groupCode: "size", optionCode: "small" }],
        },
      ],
    },
  });
  return { ...r, idempotencyKey: key };
}

// --- service probes ---
{
  const health = await api("/healthz");
  const ready = await api("/readyz");
  let web = { status: 0 };
  try {
    const res = await fetch(WEB + "/");
    web = { status: res.status };
  } catch {
    web = { status: 0 };
  }
  results.services = {
    apiHealth: health.status,
    apiReady: ready.status,
    website: web.status,
    supabaseHost: host,
  };
  if (health.status !== 200 || ready.status !== 200 || web.status !== 200) {
    console.error("Stack not ready", results.services);
    writeFileSync(OUT, JSON.stringify(results, null, 2));
    process.exit(1);
  }
}

const ROYAL_ID = fixture.branches.royalOrchard.id;
const NORTH_ID = fixture.branches.northernBypass.id;

// ========== JOURNEY A — Royal Orchard pickup ==========
try {
  const cashierToken = await signIn("d2-test.cashier.a@telepizza.test");
  const me = await api("/api/v1/auth/me", { token: cashierToken });
  if (!me.ok) fail("A", "sign-in-me", { status: me.status });
  else pass("A", "sign-in", { roles: me.json?.data?.roles, requestId: me.requestId });

  const branchIds = me.json?.data?.branchIds || [];
  if (!branchIds.includes(ROYAL_ID) || branchIds.includes(NORTH_ID)) {
    fail("A", "authorized-branch", { branchIds });
  } else pass("A", "authorized-branch-royal-orchard", { branchIds });

  const menu = await api("/api/v1/menu/catalog", { token: cashierToken });
  if (!menu.ok) fail("A", "load-menu", { status: menu.status });
  else pass("A", "load-menu", { requestId: menu.requestId });

  const created = await createPosPickup(cashierToken, "royal-orchard");
  if (created.status !== 201 && created.status !== 200) {
    fail("A", "pos-create", {
      status: created.status,
      code: created.code,
      requestId: created.requestId,
      message: created.message,
    });
  } else {
    const orderId = created.json?.data?.id;
    pass("A", "pos-create", {
      status: created.status,
      orderId,
      orderNumber: created.json?.data?.orderNumber,
      requestId: created.requestId,
    });
    const persisted = await verifyOrderPersisted(orderId, ROYAL_ID);
    if (!persisted.order || !persisted.branchMatch || persisted.itemCount < 1 || !persisted.ticket) {
      fail("A", "persist-check", persisted);
    } else {
      pass("A", "persist-order-items-ticket", {
        orderId,
        itemCount: persisted.itemCount,
        ticketId: persisted.ticket.id,
        ticketStatus: persisted.ticket.status,
      });
    }

    const kitchenToken = await signIn("d2-test.kitchen.a@telepizza.test");
    const tickets = await api(`/api/v1/kitchen/tickets?branchId=${ROYAL_ID}`, { token: kitchenToken });
    const found = (tickets.json?.data || []).find((t) => t.orderId === orderId || t.order_id === orderId);
    if (!found) fail("A", "kds-list", { status: tickets.status, requestId: tickets.requestId });
    else pass("A", "kds-list", { ticketId: found.id, requestId: tickets.requestId });

    const ticketId = found?.id || persisted.ticket?.id;
    const kflow = await kitchenFlow(kitchenToken, ticketId, ROYAL_ID);
    pass("A", "kitchen-transitions", { transitions: kflow });

    const bmToken = await signIn("d2-test.bm.a@telepizza.test");
    const orders = await api(`/api/v1/admin/orders?branchId=${ROYAL_ID}`, { token: bmToken });
    const listed = (orders.json?.data || []).some((o) => o.id === orderId);
    if (!listed) fail("A", "orders-list", { status: orders.status, requestId: orders.requestId });
    else pass("A", "orders-list", { requestId: orders.requestId });

    const complete = await api(`/api/v1/admin/orders/${orderId}/complete`, {
      method: "POST",
      token: bmToken,
      body: {},
    });
    // may already be synced by kitchen completed — accept 200 or conflict if already done
    if (complete.ok || complete.status === 409) {
      pass("A", "order-complete-or-synced", {
        status: complete.status,
        requestId: complete.requestId,
        code: complete.code,
      });
    } else {
      fail("A", "order-complete", {
        status: complete.status,
        code: complete.code,
        requestId: complete.requestId,
      });
    }

    const dash = await api(`/api/v1/admin/dashboard/operations?branchId=${ROYAL_ID}`, {
      token: bmToken,
    });
    if (!dash.ok) fail("A", "dashboard", { status: dash.status, requestId: dash.requestId });
    else pass("A", "dashboard", { requestId: dash.requestId });

    const afterReload = await verifyOrderPersisted(orderId, ROYAL_ID);
    if (!afterReload.order) fail("A", "persist-after-reload", {});
    else pass("A", "persist-after-reload", { status: afterReload.order.status });
  }
} catch (e) {
  fail("A", "exception", { error: String(e.message || e) });
}

// ========== JOURNEY B — Northern Bypass test mode ==========
try {
  const cashierB = await signIn("d2-test.cashier.b@telepizza.test");
  const created = await createPosPickup(cashierB, "northern-bypass");
  if (![200, 201].includes(created.status)) {
    fail("B", "pos-create-northern", {
      status: created.status,
      code: created.code,
      requestId: created.requestId,
      message: created.message,
    });
  } else {
    const orderId = created.json?.data?.id;
    pass("B", "pos-create-northern", {
      orderId,
      requestId: created.requestId,
      orderNumber: created.json?.data?.orderNumber,
    });
    const persisted = await verifyOrderPersisted(orderId, NORTH_ID);
    if (!persisted.branchMatch) fail("B", "branch-is-northern", { branch: persisted.order?.branch_id });
    else pass("B", "branch-is-northern", { branchId: NORTH_ID });

    // Royal Orchard staff must not see Branch B order/ticket
    const cashierA = await signIn("d2-test.cashier.a@telepizza.test");
    const ordersA = await api(`/api/v1/admin/orders?branchId=${ROYAL_ID}`, { token: cashierA });
    const leakOrders = (ordersA.json?.data || []).some((o) => o.id === orderId);
    if (leakOrders) fail("B", "isolation-orders-a", {});
    else pass("B", "isolation-orders-a-no-leak", { requestId: ordersA.requestId });

    const peekB = await api(`/api/v1/admin/orders/${orderId}`, { token: cashierA });
    if (peekB.ok) fail("B", "isolation-order-detail-a", { status: peekB.status });
    else
      pass("B", "isolation-order-detail-a-denied", {
        status: peekB.status,
        code: peekB.code,
        requestId: peekB.requestId,
      });

    const kitchenA = await signIn("d2-test.kitchen.a@telepizza.test");
    const ticketsA = await api(`/api/v1/kitchen/tickets?branchId=${ROYAL_ID}`, { token: kitchenA });
    const leakTicket = (ticketsA.json?.data || []).some(
      (t) => t.orderId === orderId || t.order_id === orderId,
    );
    if (leakTicket) fail("B", "isolation-kds-a", {});
    else pass("B", "isolation-kds-a-no-leak", { requestId: ticketsA.requestId });

    const kitchenB = await signIn("d2-test.kitchen.b@telepizza.test");
    const ticketsB = await api(`/api/v1/kitchen/tickets?branchId=${NORTH_ID}`, { token: kitchenB });
    const foundB = (ticketsB.json?.data || []).find((t) => t.orderId === orderId || t.order_id === orderId);
    if (!foundB) fail("B", "kds-b-sees-ticket", { status: ticketsB.status });
    else pass("B", "kds-b-sees-ticket", { ticketId: foundB.id });

    const multi = await signIn("d2-test.manager.multi@telepizza.test");
    const dashMulti = await api(`/api/v1/admin/dashboard/operations`, { token: multi });
    if (!dashMulti.ok) fail("B", "multi-manager-dashboard", { status: dashMulti.status });
    else pass("B", "multi-manager-dashboard", { requestId: dashMulti.requestId });

    // Production seed truth: after journeys we restore via down; record current fixture state
    const { data: nb } = await admin
      .from("branches")
      .select("status")
      .eq("branch_code", "northern-bypass")
      .maybeSingle();
    pass("B", "fixture-northern-operating-in-test", { status: nb?.status });
  }
} catch (e) {
  fail("B", "exception", { error: String(e.message || e) });
}

// ========== JOURNEY C — Delivery ==========
try {
  const cashier = await signIn("d2-test.cashier.a@telepizza.test");
  const key = `d2-delivery-${Date.now()}`;
  const created = await api("/api/v1/admin/pos/orders", {
    method: "POST",
    token: cashier,
    idempotencyKey: key,
    body: {
      branchCode: "royal-orchard",
      orderType: "delivery",
      contactName: "D2 Delivery Guest",
      contactPhone: "03005556677",
      deliveryAddress: "D2 Test House, Royal Orchard, Multan",
      items: [{ menuItemSlug: "tele-special", quantity: 1 }],
    },
  });
  if (![200, 201].includes(created.status)) {
    fail("C", "delivery-create", {
      status: created.status,
      code: created.code,
      requestId: created.requestId,
      message: created.message,
    });
  } else {
    const orderId = created.json?.data?.id;
    pass("C", "delivery-create", { orderId, requestId: created.requestId });
    const { data: delivery } = await admin
      .from("deliveries")
      .select("id, status, branch_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!delivery) fail("C", "delivery-row", {});
    else pass("C", "delivery-row", { deliveryId: delivery.id, status: delivery.status });

    const { data: ticket } = await admin
      .from("kitchen_tickets")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    const kitchen = await signIn("d2-test.kitchen.a@telepizza.test");
    await kitchenFlow(kitchen, ticket.id, ROYAL_ID);
    pass("C", "kitchen-ready-complete", { ticketId: ticket.id });

    const bm = await signIn("d2-test.bm.a@telepizza.test");
    const riderA = acct("d2-test.rider.a@telepizza.test");
    const riderB = acct("d2-test.rider.b@telepizza.test");

    const crossAssign = await api(`/api/v1/riders/deliveries/${delivery.id}/assign`, {
      method: "POST",
      token: bm,
      body: { riderId: riderB.riderId },
    });
    if (crossAssign.ok) fail("C", "cross-branch-rider-rejected", { status: crossAssign.status });
    else
      pass("C", "cross-branch-rider-rejected", {
        status: crossAssign.status,
        code: crossAssign.code,
        requestId: crossAssign.requestId,
      });

    const assign = await api(`/api/v1/riders/deliveries/${delivery.id}/assign`, {
      method: "POST",
      token: bm,
      body: { riderId: riderA.riderId },
    });
    if (!assign.ok) {
      fail("C", "assign-same-branch-rider", {
        status: assign.status,
        code: assign.code,
        requestId: assign.requestId,
      });
    } else {
      pass("C", "assign-same-branch-rider", { requestId: assign.requestId });
      const riderToken = await signIn("d2-test.rider.a@telepizza.test");
      const picked = await api(`/api/v1/riders/deliveries/${delivery.id}/status`, {
        method: "POST",
        token: riderToken,
        body: { status: "picked-up" },
      });
      const delivered = await api(`/api/v1/riders/deliveries/${delivery.id}/status`, {
        method: "POST",
        token: riderToken,
        body: { status: "delivered" },
      });
      if (!picked.ok || !delivered.ok) {
        fail("C", "delivery-status", {
          picked: picked.status,
          delivered: delivered.status,
          codes: [picked.code, delivered.code],
        });
      } else {
        pass("C", "picked-up-and-delivered", {
          requestIds: [picked.requestId, delivered.requestId],
        });
      }
    }

    const dash = await api(`/api/v1/admin/dashboard/operations?branchId=${ROYAL_ID}`, { token: bm });
    if (!dash.ok) fail("C", "dashboard", { status: dash.status });
    else pass("C", "dashboard", { requestId: dash.requestId });
  }
} catch (e) {
  fail("C", "exception", { error: String(e.message || e) });
}

// ========== JOURNEY D — Cross-branch attacks ==========
try {
  const cashierA = await signIn("d2-test.cashier.a@telepizza.test");
  const attacks = [];

  const forged = await createPosPickup(cashierA, "00000000-0000-4000-8000-000000000099");
  attacks.push({
    name: "forged-branch-code",
    expected: "fail",
    status: forged.status,
    code: forged.code,
    requestId: forged.requestId,
  });

  const unknown = await api("/api/v1/admin/pos/orders", {
    method: "POST",
    token: cashierA,
    idempotencyKey: `atk-unknown-${Date.now()}`,
    body: {
      branchCode: "does-not-exist-branch",
      orderType: "pickup",
      contactName: "Attack",
      contactPhone: "03000000000",
      items: [{ menuItemSlug: "tele-special", quantity: 1 }],
    },
  });
  attacks.push({
    name: "unknown-branch",
    expected: "fail",
    status: unknown.status,
    code: unknown.code,
    requestId: unknown.requestId,
  });

  const crossCreate = await createPosPickup(cashierA, "northern-bypass");
  attacks.push({
    name: "cashier-a-create-branch-b",
    expected: "fail",
    status: crossCreate.status,
    code: crossCreate.code,
    requestId: crossCreate.requestId,
  });

  // Create a Branch B order as B, then A tries to read/update
  const cashierB = await signIn("d2-test.cashier.b@telepizza.test");
  const bOrder = await createPosPickup(cashierB, "northern-bypass");
  const bOrderId = bOrder.json?.data?.id;
  const { data: bTicket } = await admin
    .from("kitchen_tickets")
    .select("id")
    .eq("order_id", bOrderId)
    .maybeSingle();
  const { data: bDeliveryOrder } = await admin
    .from("orders")
    .select("id")
    .eq("branch_id", NORTH_ID)
    .eq("order_type", "delivery")
    .limit(1)
    .maybeSingle();

  const readB = await api(`/api/v1/admin/orders/${bOrderId}`, { token: cashierA });
  attacks.push({
    name: "cashier-a-read-branch-b-order",
    expected: "fail",
    status: readB.status,
    code: readB.code,
    requestId: readB.requestId,
  });

  const kitchenA = await signIn("d2-test.kitchen.a@telepizza.test");
  const tickB = await api(`/api/v1/kitchen/tickets/${bTicket.id}/status`, {
    method: "PATCH",
    token: kitchenA,
    body: { status: "accepted" },
  });
  attacks.push({
    name: "kitchen-a-update-branch-b-ticket",
    expected: "fail",
    status: tickB.status,
    code: tickB.code,
    requestId: tickB.requestId,
  });

  const wide = await api(`/api/v1/admin/orders`, { token: cashierA });
  const leaked = (wide.json?.data || []).some((o) => o.branchId === NORTH_ID || o.branch_id === NORTH_ID);
  attacks.push({
    name: "omitted-branch-filter-no-b-leak",
    expected: "no-leak",
    status: wide.status,
    leaked,
    requestId: wide.requestId,
  });

  const spoof = await api(`/api/v1/admin/orders?branchId=${NORTH_ID}`, {
    token: cashierA,
    headers: { "X-Branch-Id": NORTH_ID },
  });
  attacks.push({
    name: "spoofed-branch-query",
    expected: "fail-or-empty",
    status: spoof.status,
    code: spoof.code,
    count: Array.isArray(spoof.json?.data) ? spoof.json.data.length : null,
    requestId: spoof.requestId,
  });

  // coming-soon operational action after restore? keep fixture operating; test inactive via fake
  const publicPos = await api("/api/v1/orders", {
    method: "POST",
    idempotencyKey: `atk-public-pos-${Date.now()}`,
    body: {
      branchCode: "royal-orchard",
      orderType: "pickup",
      orderSource: "pos",
      contactName: "Attack",
      contactPhone: "03000000000",
      items: [{ menuItemSlug: "tele-special", quantity: 1 }],
    },
  });
  attacks.push({
    name: "public-pos-bypass",
    expected: "fail",
    status: publicPos.status,
    code: publicPos.code,
    requestId: publicPos.requestId,
  });

  const allRejected = attacks.every((a) => {
    if (a.name === "omitted-branch-filter-no-b-leak") return a.leaked === false && a.status === 200;
    if (a.name === "spoofed-branch-query") return a.status === 403 || a.status === 404 || a.count === 0;
    return a.status >= 400;
  });
  if (allRejected) pass("D", "all-attacks-rejected", { attacks });
  else fail("D", "some-attacks-passed", { attacks });
} catch (e) {
  fail("D", "exception", { error: String(e.message || e) });
}

// ========== JOURNEY E — Failure semantics (library + API probes) ==========
try {
  // Import website op-status via dynamic read of source contract (static) + live API categories
  const opSrc = readFileSync("apps/website/client/src/lib/op-status.ts", "utf8");
  const hasStates = ["LOADING", "LIVE", "EMPTY", "STALE", "OFFLINE", "ERROR"].every((s) =>
    opSrc.includes(s),
  );
  if (!hasStates) fail("E", "op-status-states", {});
  else pass("E", "op-status-canonical-states", {});

  // Successful zero / empty via dashboard with tiny branch filter — use BM
  const bm = await signIn("d2-test.bm.a@telepizza.test");
  const dash = await api(`/api/v1/admin/dashboard/operations?branchId=${ROYAL_ID}`, { token: bm });
  if (dash.ok) pass("E", "successful-dataset", { requestId: dash.requestId, hasData: true });
  else fail("E", "successful-dataset", { status: dash.status });

  const emptyTickets = await api(
    `/api/v1/kitchen/tickets?branchId=${ROYAL_ID}&status=queued&limit=1`,
    { token: await signIn("d2-test.kitchen.a@telepizza.test") },
  );
  if (emptyTickets.ok && Array.isArray(emptyTickets.json?.data)) {
    pass("E", "empty-or-list-success", {
      count: emptyTickets.json.data.length,
      requestId: emptyTickets.requestId,
    });
  } else fail("E", "empty-or-list-success", { status: emptyTickets.status });

  // 401
  const unauth = await api(`/api/v1/admin/orders`);
  if (unauth.status === 401) pass("E", "401-unauthorized", { requestId: unauth.requestId });
  else fail("E", "401-unauthorized", { status: unauth.status });

  // 403 — cashier reading northern readiness/order
  const cashierA = await signIn("d2-test.cashier.a@telepizza.test");
  const forbidden = await api(`/api/v1/admin/branches/${NORTH_ID}/readiness`, { token: cashierA });
  if (forbidden.status === 403 || forbidden.status === 404) {
    pass("E", "403-or-denied", { status: forbidden.status, code: forbidden.code, requestId: forbidden.requestId });
  } else fail("E", "403-or-denied", { status: forbidden.status, code: forbidden.code });

  // Server failure / timeout / offline — contract-level (categorizeApiError)
  if (
    opSrc.includes('error.statusCode === 401') &&
    opSrc.includes('error.statusCode === 403') &&
    opSrc.includes('case "timeout"') &&
    opSrc.includes('case "network"') &&
    opSrc.includes("STALE")
  ) {
    pass("E", "error-category-contract", {});
  } else fail("E", "error-category-contract", {});

  results.limitations.push(
    "Journey E induced 5xx/timeout/offline used contract verification + live 401/403; full browser disconnect not automated in this harness.",
  );
} catch (e) {
  fail("E", "exception", { error: String(e.message || e) });
}

// Branch readiness
try {
  const owner = handover.accounts?.find((a) => a.role === "super-admin");
  let token;
  if (owner?.password) token = await signIn(owner.email);
  else {
    // fallback multi manager
    token = await signIn("d2-test.manager.multi@telepizza.test");
  }
  const rReady = await api(`/api/v1/admin/branches/${ROYAL_ID}/readiness`, { token });
  const nReady = await api(`/api/v1/admin/branches/${NORTH_ID}/readiness`, { token });
  results.readiness = {
    royalOrchard: { status: rReady.status, requestId: rReady.requestId, body: rReady.json?.data || rReady.json },
    northernBypass: {
      status: nReady.status,
      requestId: nReady.requestId,
      body: nReady.json?.data || nReady.json,
    },
  };
  pass("readiness", "recorded", {
    royalHttp: rReady.status,
    northernHttp: nReady.status,
  });
} catch (e) {
  fail("readiness", "exception", { error: String(e.message || e) });
}

mkdirSync(resolve("docs/testing/acceptance-evidence"), { recursive: true });
results.ok = Object.values(results.journeys).every((j) => j.ok);
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nWrote ${OUT}`);
console.log(`JOURNEYS_OK=${results.ok}`);
process.exit(results.ok ? 0 : 1);
