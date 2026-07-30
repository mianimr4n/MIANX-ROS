/**
 * Owner Handover Phase 1 — Settings truth, Owner diagnostics strip, empty/unavailable honesty.
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

describe("Owner Handover Phase 1 (static)", () => {
  it("Settings marks Inventory and Purchasing as LIVE / available — not unimplemented", () => {
    const helper = read("apps/website/client/src/lib/admin-settings.ts");
    assert.match(helper, /id: "inventory"[\s\S]*?classification: "LIVE"/);
    assert.match(helper, /id: "purchasing"[\s\S]*?classification: "LIVE"/);
    assert.match(helper, /domain: "Inventory"[\s\S]*?classification: "LIVE"/);
    assert.match(helper, /domain: "Purchasing"[\s\S]*?classification: "LIVE"/);

    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /Admin → Inventory/);
    assert.match(panels, /Admin → Purchasing/);
    assert.doesNotMatch(panels, /Inventory module is not implemented|no stock ledger/i);
    assert.doesNotMatch(panels, /no supplier or PO backend/i);
    assert.doesNotMatch(panels, /Save · Foundation|Reset · Foundation|Cancel · Foundation/);
  });

  it("Owner Settings UI does not expose raw API / entity / permission diagnostics", () => {
    const page = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    assert.doesNotMatch(page, /SettingsCapabilityMatrix|SettingsIntegrationReadiness/);
    assert.doesNotMatch(page, /Integration readiness|PRESENT|Write API/);
    assert.match(page, /ConfigurationInsights/);

    const inventoryPage = read("apps/website/client/src/pages/admin/AdminInventory.tsx");
    assert.doesNotMatch(
      inventoryPage,
      /InventoryFoundationPanel|InventoryReadinessSections|Integration readiness/,
    );

    const purchasingPage = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    assert.doesNotMatch(
      purchasingPage,
      /ProcurementFoundationPanel|ProcurementReadinessSections|Integration readiness/,
    );

    const save = read("apps/website/client/src/components/admin/settings/SettingsPrimitives.tsx");
    assert.doesNotMatch(save, /Save · Foundation|Save · Planned for Phase 2|Cancel · Planned/);
    assert.match(save, /never shows fake Cancel \/ Reset \/ Save/);
  });

  it("verified empty results use owner-friendly empty states", () => {
    const inventoryTable = read("apps/website/client/src/components/admin/inventory/InventoryTable.tsx");
    assert.match(inventoryTable, /Welcome — no stock items yet|no stock items yet/i);

    const purchasingTables = read(
      "apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx",
    );
    assert.match(purchasingTables, /Add Supplier|Add supplier/i);
    assert.match(purchasingTables, /No suppliers added yet|Add a supplier before/i);
    assert.match(purchasingTables, /Add a supplier first|Add a supplier before creating/i);

    const purchasingPage = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    const supplierIdx = purchasingPage.indexOf("<SupplierTable");
    const poIdx = purchasingPage.indexOf("<PurchaseOrderTable");
    assert.ok(supplierIdx >= 0 && poIdx >= 0 && supplierIdx < poIdx);
  });

  it("source failure is not rendered as numeric zero in Executive KPIs", () => {
    const kpis = read("apps/website/client/src/components/admin/dashboard/ExecutiveKPIs.tsx");
    assert.match(kpis, /Source unavailable/);
    assert.match(kpis, /opsUnavailable \? null : formatCount/);
    assert.match(kpis, /procurementUnavailable \? null : formatCount/);
    assert.doesNotMatch(kpis, /value=\{0\}|value="0"/);
    assert.match(kpis, /Pending PO approvals/);
    assert.match(kpis, /Awaiting delivery POs/);
    assert.match(kpis, /Outstanding invoices/);
    assert.match(kpis, /Ready Orders/);
    assert.match(kpis, /Delayed Orders/);
  });

  it("dashboard widgets respect branch scope via branchIdFilter on verified endpoints", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /fetchAdminOperationsDashboard\(token!, \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listPurchaseOrders\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listSupplierInvoices\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listKitchenTickets\(token!, \{ branchId: branchIdFilter/);
    assert.match(dashboard, /listDeliveryAssignments\(token!, \{ branchId: branchIdFilter/);
    assert.match(dashboard, /comingSoonBranch/);
  });

  it("Mianx insights remain deterministic with CEO-friendly Owner Brief copy", () => {
    const panel = read("apps/website/client/src/components/admin/dashboard/MianxInsightsPanel.tsx");
    assert.match(panel, /buildDeterministicMianxInsights/);
    assert.match(panel, /Mianx\.ai Owner Brief/);
    assert.match(panel, /not generative AI/i);
    assert.match(panel, /sr-only[\s\S]*Rule ID/);
    assert.doesNotMatch(panel, /openai|llm|autonomous action|forecast model/i);
    assert.match(panel, /INVENTORY\.LOW_STOCK/);
    assert.match(panel, /No low-stock action needed|Stock levels look healthy/);

    const team = read("apps/website/client/src/lib/mianx-team.ts");
    assert.match(team, /case "inventory-purchasing":[\s\S]*status: "ACTIVE"/);
    assert.doesNotMatch(team, /No stock ledger \/ purchasing settlement backend/);
  });
});
