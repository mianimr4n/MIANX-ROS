/**
 * Purchasing & Suppliers V1 — composition and honesty wiring (static).
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

describe("Purchasing & Suppliers V1 (static)", () => {
  it("composes /admin/purchasing from reusable procurement components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    assert.match(page, /PurchasingHeader/);
    assert.match(page, /ProcurementStatusBanner/);
    assert.match(page, /PurchasingKPIs/);
    assert.match(page, /PurchasingFilters/);
    assert.match(page, /PurchaseOrderTable/);
    assert.match(page, /SupplierTable/);
    assert.match(page, /ReceivingGrnPanel/);
    assert.match(page, /InvoiceMatchingPanel/);
    assert.match(page, /ProcurementFoundationPanel/);
    assert.match(page, /ProcurementInsights/);
    assert.match(page, /canAccessAdminPurchasing/);
  });

  it("does not fabricate suppliers or purchase orders", () => {
    const suppliers = read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx");
    assert.match(suppliers, /No suppliers in repository/);
    assert.doesNotMatch(suppliers, /PO-\d+|GRN-\d+|supplierCode:\s*"/i);
    const orders = read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx");
    assert.match(orders, /No purchase orders in repository/);
    assert.match(orders, /customer sales — not supplier procurement/i);
  });

  it("disables receiving and does not update inventory from frontend", () => {
    const header = read("apps/website/client/src/components/admin/purchasing/PurchasingHeader.tsx");
    assert.match(header, /Receive goods · Foundation/);
    assert.match(header, /disabled/);
    const receiving = read("apps/website/client/src/components/admin/purchasing/ProcurementPanels.tsx");
    assert.match(receiving, /increment stock balances/);
    assert.doesNotMatch(receiving, /setOnHand|quantity_on_hand|stockBalance/i);
  });

  it("does not derive purchase cost from menu selling price", () => {
    const banner = read("apps/website/client/src/components/admin/purchasing/ProcurementStatusBanner.tsx");
    assert.match(banner, /Menu selling prices are not purchase costs/);
    const helper = read("apps/website/client/src/lib/admin-purchasing.ts");
    assert.doesNotMatch(helper, /displayPrice|formatPkr|menu\.price/i);
  });

  it("approval and invoice matching remain Foundation without backend", () => {
    const panels = read("apps/website/client/src/components/admin/purchasing/ProcurementPanels.tsx");
    assert.match(panels, /server-side approval workflow required/i);
    assert.match(panels, /Invoice Matching Foundation/);
    assert.match(panels, /Customer payment records are not supplier payables/);
    assert.doesNotMatch(panels, /onApprove|approvePurchase|threeWayMatch\(/i);
  });

  it("Mianx procurement insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/purchasing/ProcurementInsights.tsx");
    assert.match(insights, /Mianx\.ai Procurement Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /supplier risk|autonomous purchase|demand forecast/i);
  });

  it("gates /admin/purchasing with canAccessAdminPurchasing (branch.manage)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminPurchasing/);
    assert.match(access, /branch\.manage/);
    assert.match(access, /requiresPurchasing/);
    assert.match(access, /href: "\/admin\/purchasing"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminPurchasing/);
    assert.match(app, /path="\/admin\/purchasing"/);
    const page = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document missing supplier and PO backend", () => {
    const helper = read("apps/website/client/src/lib/admin-purchasing.ts");
    assert.match(helper, /purchase_orders/);
    assert.match(helper, /goods_receipts/);
    assert.match(helper, /purchasing\.manage \(proposed\)/);
    assert.doesNotMatch(helper, /permissions\.includes\("purchasing\.manage"\)/);
  });
});
