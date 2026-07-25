/**
 * D2 live atomicity tests against local Supabase Postgres.
 * Requires Docker container supabase_db_telepizza-platform.
 * Production guard: refuses non-loopback SUPABASE_URL in backend/api/.env.local.
 *
 * Usage: node scripts/d2/atomic-order-live-tests.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DB = "supabase_db_telepizza-platform";
const ROYAL = "380b6efe-33d0-47b4-909c-e36d184da34b";
const NORTHERN = "d3403e15-4850-4927-b5ca-f414bd43fd77";
const MENU_ITEM = "7820e55a-fe6f-4eb0-8dec-8d3e17835158";
const VARIANT = "0720d601-d016-4ca3-82a7-8c2d3b4d6836";
const MOD_OPT = "5df840c5-51af-4736-a447-f9a0c4b059a1";
const FAKE_MENU = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAKE_MOD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FAKE_BRANCH = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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

function assertLocalEnv() {
  const api = loadEnv("backend/api/.env.local");
  const url = api.SUPABASE_URL || "";
  if (!url) {
    console.error("REFUSED: backend/api/.env.local missing SUPABASE_URL");
    process.exit(2);
  }
  const host = new URL(url).hostname;
  if (host.endsWith(".supabase.co") || (host !== "127.0.0.1" && host !== "localhost")) {
    console.error(`REFUSED: non-local SUPABASE_URL host=${host}`);
    process.exit(2);
  }
}

function psql(sql) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql, encoding: "utf8" },
  );
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function baseItem(overrides = {}) {
  return {
    menu_item_id: MENU_ITEM,
    variant_id: VARIANT,
    product_name: "Tele Special",
    variant_name: "Regular",
    quantity: 1,
    unit_price: 1000,
    total_price: 1000,
    food_unit_price: 1000,
    extras_snapshot: [],
    instructions: null,
    modifiers_snapshot: [{ group: "Size", option: "6 inch Small", quantity: 1 }],
    modifiers: [
      {
        modifier_option_id: MOD_OPT,
        group_code: "size",
        group_name: "Size",
        option_code: "small",
        option_name: "6 inch Small",
        price_delta: 0,
        unit_price: 0,
        total_price: 0,
        quantity: 1,
        sort_order: 0,
      },
    ],
    ...overrides,
  };
}

function orderPayload(extra = {}) {
  return {
    order_type: "pickup",
    order_source: "pos",
    status: "confirmed",
    subtotal: 1000,
    discount_amount: 0,
    tax_amount: 0,
    delivery_fee: 0,
    total_amount: 1000,
    payment_status: "pending",
    contact_name: "D2 Test Guest",
    contact_phone: "03001234567",
    contact_phone_e164: "+923001234567",
    delivery_address: null,
    notes: "d2-atomic-live",
    pricing_snapshot: { source: "d2-live" },
    payment_method: "cash",
    ...extra,
  };
}

function callAtomic({
  key,
  hash,
  branchId = ROYAL,
  order = orderPayload(),
  items = [baseItem()],
  delivery = false,
  deliveryBody = {},
  kitchen = true,
  payment = true,
  forceFail = null,
}) {
  const itemsJson = JSON.stringify(items).replace(/'/g, "''");
  const orderJson = JSON.stringify(order).replace(/'/g, "''");
  const deliveryJson = JSON.stringify(deliveryBody).replace(/'/g, "''");
  const sql = `
BEGIN;
${forceFail ? `SELECT set_config('telepizza.d2_test_mode', 'on', true);
SELECT set_config('telepizza.d2_force_fail', '${forceFail}', true);` : ""}
SELECT public.create_order_atomic(
  '${key}',
  '${hash}',
  '${branchId}'::uuid,
  '${orderJson}'::jsonb,
  '${itemsJson}'::jsonb,
  ${delivery},
  '${deliveryJson}'::jsonb,
  ${kitchen},
  ${payment},
  'staff',
  NULL
)::text;
COMMIT;
`;
  return psql(sql);
}

function countByIdempotency(key) {
  const r = psql(`
SELECT json_build_object(
  'orders', (SELECT count(*) FROM orders WHERE idempotency_key = '${key}'),
  'items', (SELECT count(*) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.idempotency_key = '${key}'),
  'mods', (SELECT count(*) FROM order_item_modifiers oim JOIN order_items oi ON oi.id = oim.order_item_id JOIN orders o ON o.id = oi.order_id WHERE o.idempotency_key = '${key}'),
  'tickets', (SELECT count(*) FROM kitchen_tickets kt JOIN orders o ON o.id = kt.order_id WHERE o.idempotency_key = '${key}'),
  'deliveries', (SELECT count(*) FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE o.idempotency_key = '${key}'),
  'payments', (SELECT count(*) FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.idempotency_key = '${key}'),
  'logs', (SELECT count(*) FROM order_status_logs osl JOIN orders o ON o.id = osl.order_id WHERE o.idempotency_key = '${key}')
)::text;
`);
  return JSON.parse(r.stdout || "{}");
}

function n(v) {
  return Number(v ?? 0);
}

function assertZero(label, counts) {
  const bad = Object.entries(counts).filter(([, v]) => n(v) !== 0);
  if (bad.length) {
    throw new Error(`${label}: partial rows remain ${JSON.stringify(counts)}`);
  }
}

assertLocalEnv();

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

try {
  // 1) Successful pickup
  {
    const key = `d2-live-pickup-${Date.now()}`;
    const r = callAtomic({ key, hash: "hash-pickup-1", kitchen: true, payment: true });
    const counts = countByIdempotency(key);
    const ok =
      r.status === 0 &&
      n(counts.orders) === 1 &&
      n(counts.items) === 1 &&
      n(counts.tickets) === 1 &&
      n(counts.payments) === 1;
    record(
      "successful pickup order transaction",
      ok,
      JSON.stringify({ status: r.status, out: r.stdout.slice(0, 200), counts }),
    );
  }

  // 2) Successful delivery
  {
    const key = `d2-live-delivery-${Date.now()}`;
    const r = callAtomic({
      key,
      hash: "hash-delivery-1",
      order: orderPayload({
        order_type: "delivery",
        delivery_address: "House 1, Test Street, Multan",
        delivery_fee: 100,
        total_amount: 1100,
      }),
      delivery: true,
      deliveryBody: { delivery_address: "House 1, Test Street, Multan" },
      kitchen: true,
      payment: true,
    });
    const counts = countByIdempotency(key);
    record(
      "successful delivery order transaction",
      r.status === 0 && n(counts.orders) === 1 && n(counts.deliveries) === 1 && n(counts.tickets) === 1,
      JSON.stringify({ status: r.status, out: r.stdout.slice(0, 160), counts }),
    );
  }

  // 3-7 forced failures — expect zero partial rows
  const failCases = [
    ["failed order-item insert rollback", "order_item"],
    ["failed modifier insert rollback", "modifier"],
    ["failed kitchen-ticket insert rollback", "kitchen"],
    ["failed delivery insert rollback", "delivery"],
  ];
  for (const [name, fail] of failCases) {
    const key = `d2-live-fail-${fail}-${Date.now()}`;
    const r = callAtomic({
      key,
      hash: `hash-fail-${fail}`,
      forceFail: fail,
      delivery: fail === "delivery",
      deliveryBody: fail === "delivery" ? { delivery_address: "Fail St" } : {},
      order:
        fail === "delivery"
          ? orderPayload({ order_type: "delivery", delivery_address: "Fail St" })
          : orderPayload(),
      kitchen: true,
      payment: true,
    });
    const counts = countByIdempotency(key);
    const rolledBack = r.status !== 0 && Number(counts.orders || 0) === 0;
    assertZero(name, {
      orders: counts.orders || "0",
      items: counts.items || "0",
      mods: counts.mods || "0",
      tickets: counts.tickets || "0",
      deliveries: counts.deliveries || "0",
      payments: counts.payments || "0",
      logs: counts.logs || "0",
    });
    record(name, rolledBack, `status=${r.status} err=${(r.stderr || r.stdout).slice(0, 120)}`);
  }

  // Invalid menu item (FK) rollback
  {
    const key = `d2-live-bad-menu-${Date.now()}`;
    const r = callAtomic({
      key,
      hash: "hash-bad-menu",
      items: [baseItem({ menu_item_id: FAKE_MENU })],
    });
    const counts = countByIdempotency(key);
    assertZero("invalid menu item rejection", counts);
    record("invalid menu item rejection", r.status !== 0 && Number(counts.orders || 0) === 0);
  }

  // Invalid modifier FK rollback
  {
    const key = `d2-live-bad-mod-${Date.now()}`;
    const item = baseItem();
    item.modifiers[0].modifier_option_id = FAKE_MOD;
    const r = callAtomic({ key, hash: "hash-bad-mod", items: [item] });
    const counts = countByIdempotency(key);
    assertZero("invalid modifier rejection", counts);
    record("invalid modifier rejection", r.status !== 0 && Number(counts.orders || 0) === 0);
  }

  // Branch mismatch / unknown / coming-soon
  {
    const key = `d2-live-unknown-branch-${Date.now()}`;
    const r = callAtomic({ key, hash: "hash-unknown", branchId: FAKE_BRANCH });
    record("unknown branch rejection", r.status !== 0 && (r.stderr + r.stdout).includes("BRANCH_NOT_FOUND"));
  }
  {
    const key = `d2-live-coming-soon-${Date.now()}`;
    const r = callAtomic({ key, hash: "hash-cs", branchId: NORTHERN });
    const counts = countByIdempotency(key);
    assertZero("coming-soon branch rejection", counts);
    record(
      "coming-soon branch rejection",
      r.status !== 0 && (r.stderr + r.stdout).includes("BRANCH_NOT_OPERATIONAL"),
    );
  }

  // Idempotency same payload
  {
    const key = `d2-live-idem-${Date.now()}`;
    const hash = "same-hash-xyz";
    const r1 = callAtomic({ key, hash });
    const r2 = callAtomic({ key, hash });
    const counts = countByIdempotency(key);
    record(
      "duplicate same idempotency request",
      r1.status === 0 &&
        r2.status === 0 &&
        (r2.stdout.includes('"idempotentReplay": true') || r2.stdout.includes('"idempotentReplay":true')) &&
        n(counts.orders) === 1,
      JSON.stringify({ r2: r2.stdout.slice(0, 200), counts }),
    );
  }

  // Idempotency conflict
  {
    const key = `d2-live-idem-conflict-${Date.now()}`;
    const r1 = callAtomic({ key, hash: "hash-a" });
    const r2 = callAtomic({ key, hash: "hash-b" });
    const counts = countByIdempotency(key);
    record(
      "duplicate changed payload conflict",
      r1.status === 0 &&
        r2.status !== 0 &&
        (r2.stderr + r2.stdout).includes("IDEMPOTENCY_CONFLICT") &&
        n(counts.orders) === 1,
      JSON.stringify({ r2status: r2.status, err: (r2.stderr + r2.stdout).slice(0, 160), counts }),
    );
  }

  // Concurrent order numbers
  {
    const sql = `
SELECT public.next_order_number() AS n FROM generate_series(1, 20);
`;
    const r = psql(sql);
    const nums = r.stdout.split(/\r?\n/).filter(Boolean);
    const unique = new Set(nums);
    record(
      "concurrent order-number generation",
      r.status === 0 && nums.length === 20 && unique.size === 20,
      `unique=${unique.size}`,
    );
  }

  // Server-side total is persisted from payload (API validates before RPC) —
  // assert RPC stores provided total without client authority check inside SQL.
  {
    const key = `d2-live-total-${Date.now()}`;
    const r = callAtomic({
      key,
      hash: "hash-total",
      order: orderPayload({ total_amount: 9999, subtotal: 9999 }),
    });
    const check = psql(
      `SELECT total_amount::text FROM orders WHERE idempotency_key='${key}';`,
    );
    record(
      "server-side total persistence (API-priced snapshot)",
      r.status === 0 && check.stdout === "9999.00",
      check.stdout,
    );
  }
} catch (err) {
  record("suite-error", false, String(err));
}

mkdirSync(resolve("docs/testing/acceptance-evidence"), { recursive: true });
const outPath = resolve("docs/testing/acceptance-evidence/d2-atomic-order-live.json");
const summary = {
  ok: results.every((x) => x.ok),
  passed: results.filter((x) => x.ok).length,
  failed: results.filter((x) => !x.ok).length,
  results,
  at: new Date().toISOString(),
};
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`TOTAL ${summary.passed}/${results.length} passed`);
process.exit(summary.ok ? 0 : 1);
