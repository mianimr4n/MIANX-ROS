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
  "20260718160000_db_r5_kitchen_tickets.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("DB-R5 migration timestamp is after R2 and avoids R3/R4 collision slots", () => {
  const names = readdirSync(join(workspaceRoot, "supabase", "migrations")).filter((n) =>
    n.endsWith(".sql"),
  );
  assert.ok(names.includes("20260718160000_db_r5_kitchen_tickets.sql"));
  assert.ok(names.includes("20260718130200_db_r2_modifier_owner_alignment.sql"));
  assert.ok(
    "20260718160000_db_r5_kitchen_tickets.sql" > "20260718130200_db_r2_modifier_owner_alignment.sql",
  );
  // Reserved on other PRs — must not collide when R3/R4 merge
  assert.notEqual("20260718160000_db_r5_kitchen_tickets.sql", "20260718140000_db_r3_restaurant_tables.sql");
  assert.notEqual("20260718160000_db_r5_kitchen_tickets.sql", "20260718150000_db_r4_dine_in_sessions.sql");
  assert.ok("20260718160000_db_r5_kitchen_tickets.sql" > "20260718150000_db_r4_dine_in_sessions.sql");
});

test("kitchen_tickets schema: one ticket per order + status enum + staff user FK", () => {
  assert.match(migration, /create table if not exists public\.kitchen_tickets/i);
  assert.match(migration, /order_id uuid not null unique references public\.orders/i);
  assert.match(migration, /branch_id uuid not null references public\.branches/i);
  assert.match(
    migration,
    /status text not null default 'queued'[\s\S]*check \([\s\S]*'queued'[\s\S]*'accepted'[\s\S]*'preparing'[\s\S]*'ready'[\s\S]*'completed'[\s\S]*'cancelled'/i,
  );
  assert.match(migration, /priority integer not null default 0/i);
  assert.match(migration, /sequence_number integer/i);
  assert.match(migration, /accepted_by_user_id uuid references public\.users/i);
  assert.match(migration, /accepted_at timestamptz/i);
  assert.match(migration, /started_at timestamptz/i);
  assert.match(migration, /ready_at timestamptz/i);
  assert.match(migration, /completed_at timestamptz/i);
  assert.doesNotMatch(migration, /accepted_by_user_id uuid references auth\.users/i);
});

test("kitchen_ticket_items recommended line snapshots", () => {
  assert.match(migration, /create table if not exists public\.kitchen_ticket_items/i);
  assert.match(migration, /kitchen_ticket_id uuid not null/i);
  assert.match(migration, /order_item_id uuid not null/i);
  assert.match(migration, /item_name_snapshot text not null/i);
  assert.match(migration, /modifiers_snapshot jsonb not null default '\[\]'::jsonb/i);
  assert.match(migration, /quantity integer not null check \(quantity > 0\)/i);
  assert.match(migration, /is_completed boolean not null default false/i);
  assert.match(migration, /uq_kitchen_ticket_items_ticket_order_item/i);
});

test("kitchen_stations deferred (documented, not created)", () => {
  assert.match(migration, /kitchen_stations[\s\S]*deferred/i);
  assert.doesNotMatch(migration, /create table if not exists public\.kitchen_stations/i);
});

test("branch_id must match orders.branch_id via trigger", () => {
  assert.match(migration, /enforce_kitchen_ticket_branch_match/i);
  assert.match(migration, /trg_kitchen_tickets_branch_match/i);
  assert.match(migration, /kitchen_tickets\.branch_id must match orders\.branch_id/i);
});

test("RLS helper limits to kitchen / branch-manager / super-admin", () => {
  assert.match(migration, /current_user_can_access_kitchen_tickets/i);
  assert.match(migration, /r\.code in \('kitchen', 'branch-manager'\)/i);
  assert.match(migration, /current_user_is_super_admin\(\)/i);
  assert.match(migration, /u\.user_type <> 'customer'/i);
  // Explicit denial intent for rider/cashier/customer in comments + helper
  assert.match(migration, /Rider, cashier, customer-support, customer: denied/i);
});

test("RLS: SELECT/UPDATE for kitchen roles; no anon; no authenticated insert/delete", () => {
  assert.match(migration, /alter table public\.kitchen_tickets enable row level security/i);
  assert.match(migration, /alter table public\.kitchen_ticket_items enable row level security/i);
  assert.match(migration, /create policy "Kitchen select branch tickets"/i);
  assert.match(migration, /create policy "Kitchen update branch tickets"/i);
  assert.match(migration, /create policy "Kitchen select branch ticket items"/i);
  assert.match(migration, /create policy "Kitchen update branch ticket items"/i);
  assert.match(migration, /current_user_can_access_kitchen_tickets\(branch_id\)/i);
  assert.doesNotMatch(migration, /for insert\s+to authenticated/i);
  assert.doesNotMatch(migration, /for delete\s+to authenticated/i);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*to anon/i);
});

test("post-R0 grants: authenticated SELECT/UPDATE; service_role DML; anon blocked", () => {
  assert.match(migration, /revoke all on table public\.kitchen_tickets from anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.kitchen_ticket_items from anon, authenticated/i);
  assert.match(migration, /grant select, update on table public\.kitchen_tickets to authenticated/i);
  assert.match(migration, /grant select, update on table public\.kitchen_ticket_items to authenticated/i);
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.kitchen_tickets to service_role/i,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.kitchen_ticket_items to service_role/i,
  );
  assert.doesNotMatch(migration, /grant select on table public\.kitchen_tickets to anon/i);
  assert.doesNotMatch(
    migration,
    /grant insert on table public\.kitchen_tickets to (anon|authenticated)/i,
  );
});

test("documents Option B service creation (no ticket-create trigger)", () => {
  assert.match(migration, /Option B/i);
  assert.match(migration, /backend service on order/i);
  assert.doesNotMatch(migration, /create trigger[\s\S]*kitchen_ticket.*confirm/i);
  assert.doesNotMatch(migration, /create kitchen ticket on order/i);
});
