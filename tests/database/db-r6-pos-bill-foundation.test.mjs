import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(
  workspaceRoot,
  "supabase",
  "migrations",
  "20260718170000_db_r6_pos_bill_foundation.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("DB-R6 migration timestamp is after R5 and avoids collisions", () => {
  const names = readdirSync(join(workspaceRoot, "supabase", "migrations")).filter((n) =>
    n.endsWith(".sql"),
  );
  assert.ok(names.includes("20260718170000_db_r6_pos_bill_foundation.sql"));
  assert.ok(names.includes("20260718160000_db_r5_kitchen_tickets.sql"));
  assert.ok(names.includes("20260718150000_db_r4_dine_in_sessions.sql"));
  assert.ok(
    "20260718170000_db_r6_pos_bill_foundation.sql" > "20260718160000_db_r5_kitchen_tickets.sql",
  );
  assert.notEqual(
    "20260718170000_db_r6_pos_bill_foundation.sql",
    "20260718160000_db_r5_kitchen_tickets.sql",
  );
});

test("restaurant_bills schema matches DB-R6 contract", () => {
  assert.match(migration, /create table if not exists public\.restaurant_bills/i);
  assert.match(migration, /dine_in_session_id uuid not null/i);
  assert.match(migration, /references public\.dine_in_sessions/i);
  assert.match(migration, /branch_id uuid not null[\s\S]*references public\.branches/i);
  assert.match(migration, /bill_number text not null/i);
  assert.match(migration, /uq_restaurant_bills_branch_bill_number unique \(branch_id, bill_number\)/i);
  assert.match(
    migration,
    /status text not null default 'open'[\s\S]*check \([\s\S]*'open'[\s\S]*'billed'[\s\S]*'paid'[\s\S]*'voided'/i,
  );
  assert.doesNotMatch(migration, /'refunded'/i);
  assert.match(migration, /subtotal numeric\(10, 2\) not null default 0/i);
  assert.match(migration, /tax_amount numeric\(10, 2\) not null default 0/i);
  assert.match(migration, /discount_amount numeric\(10, 2\) not null default 0/i);
  assert.match(migration, /grand_total numeric\(10, 2\) not null default 0/i);
  assert.match(migration, /opened_by_user_id uuid references public\.users/i);
  assert.match(migration, /closed_by_user_id uuid references public\.users/i);
  assert.match(migration, /opened_at timestamptz not null/i);
  assert.match(migration, /closed_at timestamptz/i);
  assert.doesNotMatch(migration, /create table if not exists public\.pos_sessions/i);
  assert.doesNotMatch(migration, /create table if not exists public\.payment_splits/i);
});

test("bill_orders junction (architecture alias restaurant_bill_orders)", () => {
  assert.match(migration, /create table if not exists public\.bill_orders/i);
  assert.match(migration, /restaurant_bill_id uuid not null/i);
  assert.match(migration, /order_id uuid not null unique/i);
  assert.match(migration, /uq_bill_orders_bill_order unique \(restaurant_bill_id, order_id\)/i);
  assert.match(migration, /added_at timestamptz not null default/i);
  assert.match(migration, /alias restaurant_bill_orders/i);
  assert.doesNotMatch(migration, /create table if not exists public\.restaurant_bill_orders/i);
});

test("one open bill per session partial unique", () => {
  assert.match(migration, /uq_restaurant_bills_one_open_per_session/i);
  assert.match(
    migration,
    /unique index[\s\S]*on public\.restaurant_bills \(dine_in_session_id\)[\s\S]*where status = 'open'/i,
  );
});

test("branch match trigger: bill.branch_id = session.branch_id", () => {
  assert.match(migration, /enforce_restaurant_bill_branch_match/i);
  assert.match(migration, /trg_restaurant_bills_branch_match/i);
  assert.match(migration, /restaurant_bills\.branch_id must match dine_in_sessions\.branch_id/i);
});

test("paid/voided immutability + allowed status transitions", () => {
  assert.match(migration, /enforce_restaurant_bill_immutability/i);
  assert.match(migration, /trg_restaurant_bills_immutability/i);
  assert.match(migration, /are immutable/i);
  assert.match(migration, /old\.status in \('paid', 'voided'\)/i);
  assert.match(migration, /old\.status = 'open' and new\.status in \('billed', 'paid', 'voided'\)/i);
  assert.match(migration, /old\.status = 'billed' and new\.status in \('paid', 'voided'\)/i);
});

test("bill_orders reject links to paid/voided bills", () => {
  assert.match(migration, /enforce_bill_orders_bill_open/i);
  assert.match(migration, /trg_bill_orders_bill_open/i);
  assert.match(migration, /bill_status not in \('open', 'billed'\)/i);
  assert.match(migration, /cannot add orders to restaurant_bills in status/i);
});

test("bill number helper PREFIX-YYYYMMDD-####", () => {
  assert.match(migration, /next_restaurant_bill_number/i);
  assert.match(migration, /YYYYMMDD/i);
  assert.match(migration, /lpad\(v_seq::text, 4, '0'\)/i);
});

test("RLS helper: cashier / branch-manager / super-admin; denies kitchen/rider/customer", () => {
  assert.match(migration, /current_user_can_access_restaurant_bills/i);
  assert.match(migration, /r\.code in \('cashier', 'branch-manager'\)/i);
  assert.match(migration, /current_user_is_super_admin\(\)/i);
  assert.match(migration, /Kitchen, rider, customer-support, customer, anon: denied/i);
});

test("RLS: SELECT/UPDATE for POS roles; no anon; no authenticated insert/delete", () => {
  assert.match(migration, /alter table public\.restaurant_bills enable row level security/i);
  assert.match(migration, /alter table public\.bill_orders enable row level security/i);
  assert.match(migration, /create policy "POS select branch restaurant bills"/i);
  assert.match(migration, /create policy "POS update branch restaurant bills"/i);
  assert.match(migration, /create policy "POS select branch bill orders"/i);
  assert.match(migration, /current_user_can_access_restaurant_bills\(branch_id\)/i);
  assert.doesNotMatch(migration, /for insert\s+to authenticated/i);
  assert.doesNotMatch(migration, /for delete\s+to authenticated/i);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*to anon/i);
});

test("post-R0 grants: authenticated SELECT/UPDATE; service_role DML; anon blocked", () => {
  assert.match(migration, /revoke all on table public\.restaurant_bills from anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.bill_orders from anon, authenticated/i);
  assert.match(migration, /grant select, update on table public\.restaurant_bills to authenticated/i);
  assert.match(migration, /grant select on table public\.bill_orders to authenticated/i);
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.restaurant_bills to service_role/i,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.bill_orders to service_role/i,
  );
  assert.doesNotMatch(migration, /grant select on table public\.restaurant_bills to anon/i);
  assert.doesNotMatch(
    migration,
    /grant insert on table public\.restaurant_bills to (anon|authenticated)/i,
  );
});

test("documents R4 dependency, Option B auto-link, no pos_sessions", () => {
  assert.match(migration, /REQUIRES DB-R4/i);
  assert.match(migration, /Option B/i);
  assert.match(migration, /backend service on dine-in order/i);
  assert.doesNotMatch(migration, /insert into public\.restaurant_bills/i);
});
