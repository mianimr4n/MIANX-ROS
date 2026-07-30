import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730220000_atomic_inventory_and_grn_stock.sql"),
  "utf8",
);
const inventoryService = readFileSync(
  join(root, "backend/api/src/services/inventory/management.ts"),
  "utf8",
);
const purchasingService = readFileSync(
  join(root, "backend/api/src/services/purchasing/management.ts"),
  "utf8",
);

describe("Atomic inventory + GRN stock migration", () => {
  it("defines adjust_inventory_stock_atomic with FOR UPDATE + movement + stock in one function", () => {
    assert.match(migration, /create or replace function public\.adjust_inventory_stock_atomic/);
    assert.match(migration, /for update/i);
    assert.match(migration, /insert into public\.stock_movements/);
    assert.match(migration, /update public\.inventory_items[\s\S]*current_stock/);
    assert.match(migration, /INVENTORY_STOCK_UPDATE_FAILED/);
    assert.match(migration, /grant execute on function public\.adjust_inventory_stock_atomic/);
    assert.match(migration, /revoke all on function public\.adjust_inventory_stock_atomic/);
  });

  it("defines create_goods_receiving_with_stock_atomic posting purchase movements for GRN", () => {
    assert.match(migration, /create or replace function public\.create_goods_receiving_with_stock_atomic/);
    assert.match(migration, /create table if not exists public\.goods_receiving_lines/);
    assert.match(migration, /movement_type[\s\S]*'purchase'/);
    assert.match(migration, /reference_type[\s\S]*'GRN'/);
    assert.match(migration, /raise warning/i);
    assert.match(migration, /inventory_item_not_found/);
  });

  it("services call the atomic RPCs (no separate non-atomic movement+update path)", () => {
    assert.match(inventoryService, /adjust_inventory_stock_atomic/);
    assert.doesNotMatch(
      inventoryService,
      /from\("stock_movements"\)[\s\S]*insert[\s\S]*from\("inventory_items"\)[\s\S]*update\(\{ current_stock/,
    );
    assert.match(purchasingService, /create_goods_receiving_with_stock_atomic/);
  });
});
