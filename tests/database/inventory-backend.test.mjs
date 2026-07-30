import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730160000_inventory_backend.sql"),
  "utf8",
);

describe("Inventory backend migration", () => {
  it("creates inventory_items and stock_movements with required columns", () => {
    assert.match(migration, /create table if not exists public\.inventory_items/);
    assert.match(migration, /create table if not exists public\.stock_movements/);
    for (const col of [
      "branch_id",
      "sku",
      "name",
      "category",
      "unit",
      "current_stock",
      "minimum_stock",
      "reorder_level",
      "cost_price",
      "status",
    ]) {
      assert.match(migration, new RegExp(col));
    }
    for (const col of [
      "inventory_item_id",
      "movement_type",
      "quantity",
      "reference_type",
      "reference_id",
      "reason",
      "created_by",
    ]) {
      assert.match(migration, new RegExp(col));
    }
  });

  it("enables branch-scoped RLS and service_role grants", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /grant all on public\.inventory_items to service_role/);
    assert.match(migration, /grant all on public\.stock_movements to service_role/);
    assert.match(migration, /grant select on public\.inventory_items to authenticated/);
    assert.match(migration, /grant select on public\.stock_movements to authenticated/);
  });

  it("seeds inventory.manage permission", () => {
    assert.match(migration, /inventory\.manage/);
  });
});
