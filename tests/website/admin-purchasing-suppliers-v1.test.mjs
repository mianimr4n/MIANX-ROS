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
    assert.match(page, /listSuppliers/);
    assert.match(page, /listPurchaseOrders/);
    assert.match(page, /listPurchaseRequisitions/);
    assert.match(page, /listGoodsReceiving/);
  });

  it("does not fabricate suppliers or purchase orders", () => {
    const suppliers = read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx");
    assert.match(suppliers, /No suppliers added yet/);
    assert.doesNotMatch(suppliers, /supplierCode:\s*"|fakeSupplier/i);
    const orders = read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx");
    assert.match(orders, /No purchase orders created yet/);
    assert.match(orders, /customer sales — not supplier procurement/i);
    assert.match(orders, /No purchase requisitions created yet/);
  });

  it("wires live GRN with atomic server-side stock posting for mapped lines", () => {
    const receiving = read("apps/website/client/src/components/admin/purchasing/ProcurementPanels.tsx");
    assert.match(receiving, /No goods received yet/);
    assert.match(receiving, /post stock atomically/i);
    assert.doesNotMatch(receiving, /setOnHand|quantity_on_hand|stockBalance/i);
  });

  it("does not derive purchase cost from menu selling price", () => {
    const banner = read("apps/website/client/src/components/admin/purchasing/ProcurementStatusBanner.tsx");
    assert.match(banner, /Menu selling prices are not purchase costs/);
    const helper = read("apps/website/client/src/lib/admin-purchasing.ts");
    assert.doesNotMatch(helper, /displayPrice|formatPkr|menu\.price/i);
  });

  it("wires live PO approval while keeping invoice matching Coming Soon", () => {
    const panels = read("apps/website/client/src/components/admin/purchasing/ProcurementPanels.tsx");
    assert.match(panels, /Live PO approve\/reject/i);
    assert.match(panels, /Invoice Matching — Coming Soon/);
    assert.match(panels, /Customer payment records are not supplier payables/);
    assert.doesNotMatch(panels, /threeWayMatch\(/i);
    const orders = read("apps/website/client/src/components/admin/purchasing/PurchasingTables.tsx");
    assert.match(orders, /Approve/);
    assert.match(orders, /Reject/);
    const page = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    assert.match(page, /decidePurchaseOrderApproval/);
  });

  it("Mianx procurement insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/purchasing/ProcurementInsights.tsx");
    assert.match(insights, /Mianx\.ai Procurement Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /supplier risk|autonomous purchase|demand forecast/i);
  });

  it("gates /admin/purchasing with canAccessAdminPurchasing", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminPurchasing/);
    assert.match(access, /purchasing\.manage/);
    assert.match(access, /branch\.manage/);
    assert.match(access, /requiresPurchasing/);
    assert.match(access, /href: "\/admin\/purchasing"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminPurchasing/);
    assert.match(app, /path="\/admin\/purchasing"/);
    const page = read("apps/website/client/src/pages/admin/AdminPurchasing.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document live supplier/PO/requisition/GRN/approval APIs and remaining gaps", () => {
    const helper = read("apps/website/client/src/lib/admin-purchasing.ts");
    assert.match(helper, /purchase_orders/);
    assert.match(helper, /goods_receiving/);
    assert.match(helper, /purchase_requisitions/);
    assert.match(helper, /orders\/:id\/approve/);
    assert.match(helper, /purchasing\.manage/);
    assert.match(helper, /status: "present"/);
    assert.match(helper, /Three-way matching/);
    assert.match(helper, /id: "approvals"[\s\S]*status: "present"/);
  });
});
