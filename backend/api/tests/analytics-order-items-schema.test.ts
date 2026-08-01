import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { aggregateTopItemsByMenuItemId } from "../src/services/analytics/engine.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const engineSource = readFileSync(join(root, "backend/api/src/services/analytics/engine.ts"), "utf8");

describe("analytics product order_items schema contract", () => {
  it("does not select nonexistent order_items.name", () => {
    expect(engineSource).not.toMatch(/\.from\(\s*["']order_items["']\s*\)\s*\.select\(\s*["'][^"']*\bname\b/);
    expect(engineSource).not.toMatch(/select\(\s*["']menu_item_id,\s*quantity,\s*name["']/);
  });

  it("selects canonical order-time product_name snapshot", () => {
    expect(engineSource).toMatch(
      /\.from\(\s*["']order_items["']\s*\)\s*\.select\(\s*["']menu_item_id,\s*quantity,\s*product_name["']/,
    );
  });
});

describe("aggregateTopItemsByMenuItemId", () => {
  it("aggregates quantity by menu_item_id and uses product_name labels", () => {
    const top = aggregateTopItemsByMenuItemId([
      { menu_item_id: "sku-a", product_name: "Tele Special", quantity: 2 },
      { menu_item_id: "sku-a", product_name: "Tele Special", quantity: 1 },
      { menu_item_id: "sku-b", product_name: "Zinger Burger", quantity: 5 },
    ]);
    expect(top).toEqual([
      { menuItemId: "sku-b", label: "Zinger Burger", quantity: 5 },
      { menuItemId: "sku-a", label: "Tele Special", quantity: 3 },
    ]);
  });

  it("keeps totals when menu relation is missing and labels blank snapshots honestly", () => {
    const top = aggregateTopItemsByMenuItemId([
      { menu_item_id: "orphan-sku", product_name: null, quantity: 4 },
      { menu_item_id: "orphan-sku", product_name: "   ", quantity: 1 },
      { menu_item_id: null, product_name: "Ghost", quantity: 99 },
    ]);
    expect(top).toEqual([
      { menuItemId: "orphan-sku", label: "Unavailable item name", quantity: 5 },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(aggregateTopItemsByMenuItemId([])).toEqual([]);
  });

  it("prefers a non-blank snapshot when mixing blank and named rows for one SKU", () => {
    const top = aggregateTopItemsByMenuItemId([
      { menu_item_id: "sku-a", product_name: null, quantity: 1 },
      { menu_item_id: "sku-a", product_name: "Kept Snapshot", quantity: 2 },
    ]);
    expect(top[0]).toEqual({ menuItemId: "sku-a", label: "Kept Snapshot", quantity: 3 });
  });
});
