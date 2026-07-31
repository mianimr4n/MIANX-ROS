/**
 * Owner Handover Phase 1 — Settings truth, Owner diagnostics strip, empty/unavailable honesty.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Owner Handover Phase 1 (static)", () => {
  it("1. Settings no longer marks Inventory as unimplemented", () => {
    const helper = read("apps/website/client/src/lib/admin-settings.ts");
    assert.match(helper, /id: "inventory"[\s\S]*?classification: "LIVE"/);
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /Admin → Inventory/);
    assert.doesNotMatch(panels, /Inventory module is not implemented|no stock ledger/i);
  });

  it("2. Settings no longer marks Purchasing as foundation-only", () => {
    const helper = read("apps/website/client/src/lib/admin-settings.ts");
    assert.match(helper, /id: "purchasing"[\s\S]*?classification: "LIVE"/);
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /Admin → Purchasing/);
    assert.doesNotMatch(panels, /no supplier or PO backend|Purchasing module is Foundation/i);
  });

  it("3–4. Owner UI does not expose raw API paths or entity/permission diagnostics", () => {
    const inventoryPage = read("apps/website/client/src/pages/admin/AdminInventory.tsx");
    const purchasingPage = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    const settingsPage = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    const ownerUi = [
      read("apps/website/client/src/components/admin/inventory/InventoryKPIs.tsx"),
      read("apps/website/client/src/components/admin/purchasing/PurchasingKPIs.tsx"),
      read("apps/website/client/src/components/admin/inventory/InventoryTable.tsx"),
      read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx"),
      read("apps/website/client/src/components/admin/inventory/InventoryInsights.tsx"),
      read("apps/website/client/src/components/admin/purchasing/ProcurementInsights.tsx"),
      read("apps/website/client/src/components/admin/dashboard/ExecutiveKPIs.tsx"),
      read("apps/website/client/src/components/admin/dashboard/MianxInsightsPanel.tsx"),
      read("apps/website/client/src/components/admin/hr/HRKPIs.tsx"),
      read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx"),
      read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
      read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts"),
    ];

    for (const src of ownerUi) {
      assert.doesNotMatch(src, /GET \/admin\/|POST \/admin\/|PATCH \/admin\//);
      assert.doesNotMatch(src, /Integration readiness/);
      assert.doesNotMatch(src, /status === "present"|PRESENT \+/);
      assert.doesNotMatch(src, />Entities<|>Permission</);
    }

    assert.doesNotMatch(inventoryPage, /InventoryFoundationPanel|InventoryReadinessSections|Integration readiness/);
    assert.doesNotMatch(purchasingPage, /ProcurementFoundationPanel|ProcurementReadinessSections|Integration readiness/);
    assert.doesNotMatch(settingsPage, /SettingsCapabilityMatrix|SettingsIntegrationReadiness/);

    const hrPage = read("apps/website/client/src/pages/admin/AdminHr.tsx");
    assert.doesNotMatch(hrPage, /HRFoundationPanel|HRReadinessSections|Integration readiness/);
    const hrInsights = read("apps/website/client/src/lib/admin-hr.ts");
    assert.doesNotMatch(hrInsights, /detail: `Live count from GET|detail: "Live from GET|detail: "Permission gate for GET/);
  });

  it("5. Successful empty API responses display honest zero or welcome states", () => {
    const inventoryTable = read("apps/website/client/src/components/admin/inventory/InventoryTable.tsx");
    assert.match(inventoryTable, /No stock items added yet/);
    assert.match(inventoryTable, /Add ingredients and opening quantities to begin stock tracking/);
    assert.match(inventoryTable, /Add stock item/);

    const purchasingTables = read(
      "apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx",
    );
    assert.match(purchasingTables, /No suppliers added yet/);
    assert.match(purchasingTables, /Add your first supplier before creating purchase orders/);
    assert.match(purchasingTables, /Add supplier/);
  });

  it("6. API failure is not rendered as numeric zero", () => {
    const kpis = read("apps/website/client/src/components/admin/dashboard/ExecutiveKPIs.tsx");
    assert.match(kpis, /Source unavailable|Data unavailable|Access unavailable/);
    assert.match(kpis, /opsUnavailable \? null : formatCount/);
    assert.match(kpis, /procurementUnavailable \? null : formatCount/);
    assert.doesNotMatch(kpis, /value=\{0\}|value="0"/);

    const inventoryKpis = read("apps/website/client/src/components/admin/inventory/InventoryKPIs.tsx");
    assert.match(inventoryKpis, /Data unavailable|Access unavailable/);
    assert.doesNotMatch(inventoryKpis, /value="0"/);
  });

  it("7. Dashboard widgets respect selected branch scope", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /fetchAdminOperationsDashboard\(token!, \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listPurchaseOrders\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listSupplierInvoices\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listKitchenTickets\(token!, \{ branchId: branchIdFilter/);
    assert.match(dashboard, /listDeliveryAssignments\(token!, \{ branchId: branchIdFilter/);
  });

  it("8. Northern Bypass remains coming-soon", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /comingSoonBranch/);
    assert.match(dashboard, /northern-bypass|coming-soon/);
  });

  it("9. Mianx.ai insights remain deterministic", () => {
    const panel = read("apps/website/client/src/components/admin/dashboard/MianxInsightsPanel.tsx");
    assert.match(panel, /buildDeterministicMianxInsights/);
    assert.match(panel, /Mianx\.ai Owner Brief/);
    assert.match(panel, /not generative AI/i);
    assert.match(panel, /sr-only[\s\S]*Rule ID/);
    assert.doesNotMatch(panel, /openai|llm|autonomous action|forecast model/i);

    const inventoryInsights = read("apps/website/client/src/lib/admin-inventory.ts");
    assert.match(
      inventoryInsights,
      /No inventory items have been added|Recipe consumption tracking is not configured yet/,
    );
    assert.match(inventoryInsights, /lack active recipes|will not deduct stock|Recipe consumption/i);

    const purchasingInsights = read("apps/website/client/src/lib/admin-purchasing.ts");
    assert.match(purchasingInsights, /No suppliers have been added|Add suppliers before creating purchase orders/);
  });

  it("10. No production mutation or migration was introduced in this slice", () => {
    const migrationsDir = join(root, "supabase/migrations");
    assert.equal(existsSync(migrationsDir), true);
    const names = readdirSync(migrationsDir);
    assert.ok(!names.some((n) => /owner.?handover|owner_handover_phase1/i.test(n)));

    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.doesNotMatch(dashboard, /supabase\/migrations|db\.push|production mutation/i);

    const aside = read("apps/website/client/src/components/admin/dashboard/ExecutiveWidgets.tsx");
    assert.match(aside, /Open POS/);
    assert.match(aside, /Add stock item/);
    assert.match(aside, /Add supplier/);
    assert.match(aside, /Create requisition/);
    assert.match(aside, /Create purchase order/);
    assert.match(aside, /Open Reports/);
    assert.match(aside, /Open Settings/);
  });
});
