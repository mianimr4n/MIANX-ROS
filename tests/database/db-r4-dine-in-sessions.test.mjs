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
  "20260718150000_db_r4_dine_in_sessions.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("DB-R4 migration timestamp is after R3 restaurant tables", () => {
  const names = readdirSync(join(workspaceRoot, "supabase", "migrations")).filter((n) =>
    n.endsWith(".sql"),
  );
  assert.ok(names.includes("20260718150000_db_r4_dine_in_sessions.sql"));
  assert.ok(names.includes("20260718140000_db_r3_restaurant_tables.sql"));
  assert.ok(
    "20260718150000_db_r4_dine_in_sessions.sql" > "20260718140000_db_r3_restaurant_tables.sql",
  );
});

test("dine_in_sessions schema matches DB-R4 contract", () => {
  assert.match(migration, /create table if not exists public\.dine_in_sessions/i);
  assert.match(migration, /public_token_hash text/i);
  assert.match(migration, /branch_id uuid not null references public\.branches/i);
  assert.match(migration, /restaurant_table_id uuid not null references public\.restaurant_tables/i);
  assert.match(
    migration,
    /status text not null default 'open'[\s\S]*check \([\s\S]*'open'[\s\S]*'ordering'[\s\S]*'billed'[\s\S]*'paid'[\s\S]*'closed'[\s\S]*'cancelled'/i,
  );
  assert.match(migration, /guest_count integer/i);
  assert.match(migration, /opened_by_user_id uuid references public\.users/i);
  assert.match(migration, /opened_at timestamptz not null/i);
  assert.match(migration, /closed_at timestamptz/i);
  assert.match(migration, /uq_dine_in_sessions_public_token_hash unique \(public_token_hash\)/i);
});

test("one active session per table partial unique (open|ordering)", () => {
  assert.match(migration, /uq_dine_in_sessions_one_active_per_table/i);
  assert.match(
    migration,
    /unique index[\s\S]*on public\.dine_in_sessions \(restaurant_table_id\)[\s\S]*where status in \('open', 'ordering'\)/i,
  );
});

test("branch match trigger enforces session.branch_id = table.branch_id", () => {
  assert.match(migration, /enforce_dine_in_session_branch_match/i);
  assert.match(migration, /trg_dine_in_sessions_branch_match/i);
  assert.match(migration, /branch_id must match restaurant_tables\.branch_id/i);
});

test("orders dine-in linkage columns and phased CHECK", () => {
  assert.match(migration, /add column if not exists dine_in_session_id uuid/i);
  assert.match(migration, /add column if not exists restaurant_table_id uuid/i);
  assert.match(migration, /add column if not exists table_display_snapshot text/i);
  assert.match(migration, /chk_orders_dine_in_linkage/i);
  // delivery/pickup must be null
  assert.match(migration, /order_type in \('delivery', 'pickup'\)/i);
  assert.match(migration, /dine_in_session_id is null/i);
  // dine-in allows both-null (legacy) OR both-set
  assert.match(migration, /order_type = 'dine-in'/i);
  assert.match(migration, /legacy website dine-in/i);
});

test("public token hash is SHA-256 storage only", () => {
  assert.match(migration, /SHA-256/i);
  assert.match(migration, /Never store or log plaintext/i);
  assert.doesNotMatch(migration, /public_token(?!_hash)/i);
});

test("RLS enabled: staff SELECT/UPDATE by branch; no anon; no authenticated insert", () => {
  assert.match(migration, /alter table public\.dine_in_sessions enable row level security/i);
  assert.match(migration, /create policy "Staff select branch dine-in sessions"/i);
  assert.match(migration, /create policy "Staff update branch dine-in sessions"/i);
  assert.match(migration, /current_user_has_branch_access\(branch_id\)/i);
  assert.match(migration, /for select\s+to authenticated/i);
  assert.match(migration, /for update\s+to authenticated/i);
  assert.doesNotMatch(migration, /for insert\s+to authenticated/i);
  assert.doesNotMatch(migration, /for delete\s+to authenticated/i);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*to anon/i);
});

test("super-admin covered via current_user_has_branch_access helper", () => {
  assert.match(migration, /current_user_has_branch_access\(branch_id\)/i);
});

test("post-R0 grants: authenticated SELECT/UPDATE without hash; service_role DML; anon blocked", () => {
  assert.match(migration, /revoke all on table public\.dine_in_sessions from anon, authenticated/i);
  assert.match(migration, /grant select, update on table public\.dine_in_sessions to authenticated/i);
  assert.match(
    migration,
    /revoke select \(public_token_hash\) on table public\.dine_in_sessions from authenticated/i,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.dine_in_sessions to service_role/i,
  );
  assert.doesNotMatch(migration, /grant select on table public\.dine_in_sessions to anon/i);
  assert.doesNotMatch(migration, /grant insert on table public\.dine_in_sessions to (anon|authenticated)/i);
});

test("documents R3 dependency and no session seed", () => {
  assert.match(migration, /REQUIRES DB-R3/i);
  assert.doesNotMatch(migration, /insert into public\.dine_in_sessions/i);
});
