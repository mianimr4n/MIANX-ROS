import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260718120000_product_modifier_system.sql"),
  "utf8",
);
const alignment = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260718130200_db_r2_modifier_owner_alignment.sql"),
  "utf8",
);

test("modifier migration creates catalog and order snapshot tables", () => {
  assert.match(migration, /create table if not exists public\.modifier_groups/i);
  assert.match(migration, /create table if not exists public\.modifier_options/i);
  assert.match(migration, /create table if not exists public\.item_modifier_groups/i);
  assert.match(migration, /create table if not exists public\.order_item_modifiers/i);
  assert.match(migration, /create table if not exists public\.branch_modifier_options/i);
  assert.match(migration, /price_delta_by_size/i);
  assert.match(migration, /linked_menu_item_id/i);
});

test("junction documents menu_item_modifier_groups alias and branch uniqueness", () => {
  assert.match(migration, /item_modifier_groups\s*≡\s*menu_item_modifier_groups/i);
  assert.match(migration, /branch_id uuid/i);
  assert.match(migration, /is_available boolean not null default true/i);
  assert.match(
    migration,
    /uq_item_modifier_groups_item_group_branch[\s\S]*nulls not distinct/i,
  );
});

test("order_item_modifiers stores snapshot unit_price and total_price", () => {
  assert.match(migration, /option_name varchar\(150\) not null/i);
  assert.match(migration, /unit_price numeric\(12,\s*2\) not null default 0/i);
  assert.match(migration, /total_price numeric\(12,\s*2\) not null default 0/i);
  assert.match(migration, /quantity integer not null default 1/i);
  assert.match(migration, /group_code varchar\(80\) not null/i);
  assert.match(migration, /option_code varchar\(80\) not null/i);
});

test("modifier migration uses locked grant model (no client DML)", () => {
  assert.match(migration, /grant select on table public\.modifier_groups to anon, authenticated/i);
  assert.match(migration, /grant select on table public\.order_item_modifiers to authenticated/i);
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.order_item_modifiers to service_role/i,
  );
  assert.match(migration, /revoke all on table public\.order_item_modifiers from anon/i);
  assert.match(migration, /grant select on table public\.branch_modifier_options to anon, authenticated/i);
  assert.doesNotMatch(
    migration,
    /grant insert on table public\.modifier_groups to anon/i,
  );
});

test("modifier migration seeds pizza groups and wires catalog pizzas", () => {
  assert.match(migration, /'crust'/);
  assert.match(migration, /'extra-chicken'/);
  assert.match(migration, /'extra-cheese'/);
  assert.match(migration, /'extra-vegetables'/);
  assert.match(migration, /'extra-toppings'/);
  assert.match(migration, /'add-drinks'/);
  assert.match(migration, /'add-sides'/);
  assert.match(migration, /tele-special/);
  assert.match(migration, /bihari-kabab/);
});

test("topping SKUs are linked into modifiers without delete", () => {
  assert.match(migration, /product_type = 'topping'/i);
  assert.match(migration, /Do NOT delete topping rows/i);
  assert.doesNotMatch(migration, /delete from public\.menu_items where product_type = 'topping'/i);
});

test("selection_type uses single|multi (multi ≡ multiple)", () => {
  assert.match(migration, /check \(selection_type in \('single', 'multi'\)\)/);
  assert.match(migration, /'multi' ≡ owner wording 'multiple'/i);
});

test("DB-R2 alignment migration is idempotent for prior local applies", () => {
  assert.match(alignment, /add column if not exists branch_id/i);
  assert.match(alignment, /add column if not exists unit_price/i);
  assert.match(alignment, /add column if not exists total_price/i);
  assert.match(alignment, /create table if not exists public\.branch_modifier_options/i);
  assert.match(alignment, /nulls not distinct/i);
});

test("pricing integrity is documented in migration header", () => {
  assert.match(migration, /Client-sent money fields are never trusted/i);
  assert.match(migration, /immutable snapshots/i);
});
