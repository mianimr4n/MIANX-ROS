/**
 * Inventory Management V1 — composition and honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Inventory Management V1 (static)", () => {
  it("composes /admin/inventory from reusable inventory components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminInventory.tsx");
    assert.match(page, /InventoryHeader/);
    assert.match(page, /InventoryStatusBanner/);
    assert.match(page, /InventoryKPIs/);
    assert.match(page, /InventoryFilters/);
    assert.match(page, /InventoryTable/);
    assert.match(page, /StockMovementTimeline/);
    assert.match(page, /RecipeMappingPanel/);
    assert.doesNotMatch(page, /InventoryFoundationPanel|InventoryReadinessSections|Integration readiness/);
    assert.match(page, /InventoryInsights/);
    assert.match(page, /canAccessAdminInventory/);
    assert.match(page, /listInventoryItems/);
    assert.match(page, /createStockAdjustment/);
    assert.match(page, /listStockMovements/);
  });

  it("wires live stock table and does not fabricate balances", () => {
    const table = read("apps/website/client/src/components/admin/inventory/InventoryTable.tsx");
    assert.match(table, /No stock items added yet/);
    assert.doesNotMatch(table, /onHand:\s*\d|quantity_on_hand|fakeStock/i);
    const timeline = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(timeline, /No stock movements yet/);
    assert.match(timeline, /Order history is not a substitute/);
    assert.doesNotMatch(timeline, /FOUNDATION — NO WRITE API/i);
  });

  it("does not use menu availability or selling price as inventory cost", () => {
    const kpis = read("apps/website/client/src/components/admin/inventory/InventoryKPIs.tsx");
    assert.match(kpis, /Not derived from menu flags/);
    assert.match(kpis, /cost_price|Stock value/);
    assert.match(kpis, /Menu catalog payload unavailable|UnavailableInventoryKpis/);
    assert.doesNotMatch(kpis, /menuBrowseSkus \?\? 0/);
    const page = read("apps/website/client/src/pages/admin/AdminInventory.tsx");
    assert.match(page, /snapshot=\{isLoading \? null : snapshot\}/);
    const valuation = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(valuation, /Retail menu price is not inventory cost/);
    assert.match(valuation, /Menu selling prices must not be used/);
    const helper = read("apps/website/client/src/lib/admin-inventory.ts");
    assert.match(helper, /no ingredient recipes|Recipe \/ BOM/);
    assert.doesNotMatch(helper, /displayPrice|formatPkr.*stock/i);
  });

  it("wires receiving and waste to live APIs and keeps transfers as Phase 2", () => {
    const panels = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(panels, /LIVE via Purchasing/);
    assert.match(panels, /movementType=waste|movementType: "waste"/);
    assert.match(panels, /Planned for Phase 2/);
    assert.match(panels, /Post adjustment/);
    assert.match(panels, /onAdjust/);
    const header = read("apps/website/client/src/components/admin/inventory/InventoryHeader.tsx");
    assert.match(header, /Receive \(GRN\)/);
    assert.match(header, /Log waste/);
    assert.match(header, /\/admin\/purchasing/);
    assert.doesNotMatch(header, /Coming Soon/);
  });

  it("classifies recipe consumption as Phase 2 without server engine", () => {
    const recipe = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(recipe, /Recipe Mapping — Planned for Phase 2/);
    assert.match(recipe, /server-side recipe consumption engine required/i);
    assert.doesNotMatch(recipe, /deduct.*order|subtract.*quantity/i);
  });

  it("Mianx inventory insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/inventory/InventoryInsights.tsx");
    assert.match(insights, /Mianx\.ai Inventory Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /demand forecast|autonomous replenishment|AI pricing/i);
  });

  it("gates /admin/inventory with canAccessAdminInventory", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminInventory/);
    assert.match(access, /inventory\.manage/);
    assert.match(access, /branch\.manage/);
    assert.match(access, /requiresInventory/);
    assert.match(access, /href: "\/admin\/inventory"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminInventory/);
    assert.match(app, /path="\/admin\/inventory"/);
    assert.doesNotMatch(app, /InventoryComingSoon/);
    const page = read("apps/website/client/src/pages/admin/AdminInventory.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document live ledger and remaining gaps honestly", () => {
    const helper = read("apps/website/client/src/lib/admin-inventory.ts");
    assert.match(helper, /inventory_items/);
    assert.match(helper, /stock_movements/);
    assert.match(helper, /inventory\.manage/);
    assert.match(helper, /status: "present"/);
    assert.match(helper, /Recipe \/ BOM mapping/);
    assert.match(helper, /id: "receiving"[\s\S]*status: "present"/);
  });
});
