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

test("modifier migration creates catalog and order snapshot tables", () => {
  assert.match(migration, /create table if not exists public\.modifier_groups/i);
  assert.match(migration, /create table if not exists public\.modifier_options/i);
  assert.match(migration, /create table if not exists public\.item_modifier_groups/i);
  assert.match(migration, /create table if not exists public\.order_item_modifiers/i);
  assert.match(migration, /price_delta_by_size/i);
  assert.match(migration, /linked_menu_item_id/i);
});

test("modifier migration uses locked grant model", () => {
  assert.match(migration, /grant select on table public\.modifier_groups to anon, authenticated/i);
  assert.match(migration, /grant select on table public\.order_item_modifiers to authenticated/i);
  assert.match(
    migration,
    /grant select, insert, update, delete on table public\.order_item_modifiers to service_role/i,
  );
  assert.match(migration, /revoke all on table public\.order_item_modifiers from anon/i);
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
