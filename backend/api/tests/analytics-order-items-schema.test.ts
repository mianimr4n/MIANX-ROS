/**
 * RC5-TEST-01 — Analytics order_items schema regression guards.
 * Runs under `pnpm test` / CI (Vitest). No live DB or Production.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { aggregateTopItemsByMenuItemId } from "../src/services/analytics/engine.js";
import {
  FORBIDDEN_ORDER_ITEMS_NAME_MESSAGE,
  analyzeAnalyticsOrderItemsSource,
  extractOrderItemsSelectLists,
  selectListRequestsOrderItemsName,
  selectListRequestsProductName,
} from "./helpers/analytics-order-items-schema-guard.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const analyticsRuntimeDir = join(repoRoot, "backend/api/src/services/analytics");

function loadAnalyticsRuntimeSources(): { file: string; source: string }[] {
  return readdirSync(analyticsRuntimeDir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({
      file: `backend/api/src/services/analytics/${name}`,
      source: readFileSync(join(analyticsRuntimeDir, name), "utf8"),
    }));
}

describe("analytics product order_items schema contract", () => {
  const runtimeFiles = loadAnalyticsRuntimeSources();

  it("scans all Analytics runtime modules for order_items selects", () => {
    const withQueries = runtimeFiles.filter((f) => extractOrderItemsSelectLists(f.source).length > 0);
    expect(withQueries.map((f) => f.file)).toEqual(["backend/api/src/services/analytics/engine.ts"]);
  });

  it("rejects bare order_items.name on every Analytics runtime order_items select", () => {
    const violations = [];
    for (const file of runtimeFiles) {
      const result = analyzeAnalyticsOrderItemsSource(file.source, file.file);
      violations.push(...result.violations);
    }
    expect(violations, JSON.stringify(violations)).toEqual([]);
  });

  it("requires product_name on Analytics order_items quantity/top-item selections", () => {
    const missing = [];
    for (const file of runtimeFiles) {
      const result = analyzeAnalyticsOrderItemsSource(file.source, file.file);
      missing.push(...result.missingProductName);
    }
    expect(missing, JSON.stringify(missing)).toEqual([]);

    const engine = runtimeFiles.find((f) => f.file.endsWith("engine.ts"));
    expect(engine).toBeTruthy();
    const selects = extractOrderItemsSelectLists(engine!.source);
    expect(selects.length).toBeGreaterThan(0);
    for (const selectList of selects) {
      expect(selectListRequestsProductName(selectList)).toBe(true);
      expect(selectListRequestsOrderItemsName(selectList)).toBe(false);
    }
  });

  it("mutation self-check: restoring order_items.name fails the guard", () => {
    const engine = runtimeFiles.find((f) => f.file.endsWith("engine.ts"));
    expect(engine).toBeTruthy();
    const mutated = engine!.source.replace(
      /select\(\s*["']menu_item_id,\s*quantity,\s*product_name["']\s*\)/,
      'select("menu_item_id, quantity, name")',
    );
    expect(mutated).not.toEqual(engine!.source);

    const result = analyzeAnalyticsOrderItemsSource(mutated, "engine.ts (mutated in-memory)");
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]?.message).toBe(FORBIDDEN_ORDER_ITEMS_NAME_MESSAGE);
    expect(result.missingProductName.length).toBeGreaterThan(0);
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

  it("keeps different menu_item_id rows separate when product_name text matches", () => {
    const top = aggregateTopItemsByMenuItemId([
      { menu_item_id: "sku-a", product_name: "Classic Pizza", quantity: 2 },
      { menu_item_id: "sku-b", product_name: "Classic Pizza", quantity: 3 },
    ]);
    expect(top).toHaveLength(2);
    expect(top).toEqual([
      { menuItemId: "sku-b", label: "Classic Pizza", quantity: 3 },
      { menuItemId: "sku-a", label: "Classic Pizza", quantity: 2 },
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
