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
  "20260718140000_db_r3_restaurant_tables.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("DB-R3 migration timestamp is after applied R2 alignment", () => {
  const names = readdirSync(join(workspaceRoot, "supabase", "migrations")).filter((n) =>
    n.endsWith(".sql"),
  );
  assert.ok(names.includes("20260718140000_db_r3_restaurant_tables.sql"));
  assert.ok(names.includes("20260718130200_db_r2_modifier_owner_alignment.sql"));
  assert.ok("20260718140000_db_r3_restaurant_tables.sql" > "20260718130200_db_r2_modifier_owner_alignment.sql");
  assert.ok("20260718140000_db_r3_restaurant_tables.sql" > "20260718120000_product_modifier_system.sql");
});

test("restaurant_tables schema matches DB-R3 contract", () => {
  assert.match(migration, /create table if not exists public\.restaurant_tables/i);
  assert.match(migration, /branch_id uuid not null references public\.branches/i);
  assert.match(migration, /table_number text not null/i);
  assert.match(migration, /display_name text/i);
  assert.match(migration, /capacity integer/i);
  assert.match(migration, /floor_or_zone text/i);
  assert.match(
    migration,
    /status text not null default 'available'[\s\S]*check \([\s\S]*'available'[\s\S]*'occupied'[\s\S]*'reserved'[\s\S]*'inactive'/i,
  );
  assert.match(migration, /qr_token_hash text/i);
  assert.match(migration, /qr_version integer not null default 1/i);
  assert.match(migration, /is_active boolean not null default true/i);
  assert.match(migration, /uq_restaurant_tables_branch_table_number unique \(branch_id, table_number\)/i);
  assert.match(migration, /uq_restaurant_tables_qr_token_hash unique \(qr_token_hash\)/i);
});

test("QR hash is documented as SHA-256 storage only", () => {
  assert.match(migration, /SHA-256/i);
  assert.match(migration, /Never store or log plaintext/i);
  assert.doesNotMatch(migration, /qr_token(?!_hash|_version)/i);
});

test("RLS enabled with staff branch SELECT; no anon; no authenticated writes", () => {
  assert.match(migration, /alter table public\.restaurant_tables enable row level security/i);
  assert.match(migration, /create policy "Staff select branch restaurant tables"/i);
  assert.match(migration, /current_user_has_branch_access\(branch_id\)/i);
  assert.match(migration, /for select\s+to authenticated/i);
  assert.doesNotMatch(migration, /for insert\s+to authenticated/i);
  assert.doesNotMatch(migration, /for update\s+to authenticated/i);
  assert.doesNotMatch(migration, /for delete\s+to authenticated/i);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*to anon/i);
});

test("super-admin covered via current_user_has_branch_access helper", () => {
  // Helper includes current_user_is_super_admin(); policy must use it.
  assert.match(migration, /current_user_has_branch_access\(branch_id\)/i);
});

test("post-R0 grants: authenticated SELECT without hash; service_role DML; anon blocked", () => {
  assert.match(migration, /revoke all on table public\.restaurant_tables from anon, authenticated/i);
  assert.match(migration, /grant select on table public\.restaurant_tables to authenticated/i);
  assert.match(
    migration,
    /revoke select \(qr_token_hash\) on table public\.restaurant_tables from authenticated/i,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.restaurant_tables to service_role/i,
  );
  assert.doesNotMatch(migration, /grant select on table public\.restaurant_tables to anon/i);
  assert.doesNotMatch(migration, /grant insert on table public\.restaurant_tables to (anon|authenticated)/i);
});

test("no production table seed invented", () => {
  assert.doesNotMatch(migration, /insert into public\.restaurant_tables/i);
});
