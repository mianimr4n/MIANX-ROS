/**
 * Executive Dashboard Phase 1 — Owner Command Center static contracts.
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

describe("Executive Dashboard Phase 1 — Owner Command Center", () => {
  it("wires Owner Command Center into the executive dashboard", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /OwnerCommandCenter/);
    assert.match(dashboard, /fetchAdminOperationsDashboard/);
    assert.match(dashboard, /listAdminOrders/);
    assert.match(dashboard, /listKitchenTickets/);
    assert.match(dashboard, /listDeliveryAssignments/);
    assert.match(dashboard, /listPurchaseOrders/);
    assert.match(dashboard, /listSupplierInvoices/);
    assert.match(dashboard, /listStockMovements/);
    assert.match(dashboard, /listGoodsReceiving/);
    assert.match(dashboard, /listHrEmployees/);
    assert.match(dashboard, /fetchSalesReport/);
    assert.doesNotMatch(dashboard, /supabase\/migrations/);
    assert.doesNotMatch(dashboard, /signInWithOAuth|createClient/);
  });

  it("renders Today KPI contracts with loading / empty / unavailable states", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    assert.match(builders, /Today’s Sales/);
    assert.match(builders, /Today’s Orders/);
    assert.match(builders, /Average Order Value/);
    assert.match(builders, /Open Orders/);
    assert.match(builders, /state: "loading"/);
    assert.match(builders, /state: "unavailable"/);
    assert.match(builders, /unavailable \? null/);
    assert.doesNotMatch(builders, /fabricat|mockSales|fakeMetric/i);
  });

  it("renders Live Operations cards with module links", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    assert.match(builders, /Kitchen Queue/);
    assert.match(builders, /Orders Preparing/);
    assert.match(builders, /Ready Orders/);
    assert.match(builders, /Orders Out For Delivery/);
    assert.match(builders, /Delayed Orders/);
    assert.match(builders, /Completed Today/);
    assert.match(builders, /href: "\/admin\/kitchen-dashboard"/);
    assert.match(builders, /href: "\/admin\/delivery"/);
    assert.match(center, /MetricLinkCard/);
    assert.match(center, /Live operations/);
  });

  it("renders Business Attention cards with why-attention copy", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    assert.match(builders, /Low Stock Items/);
    assert.match(builders, /Pending Purchase Approvals/);
    assert.match(builders, /Awaiting Delivery Purchase Orders/);
    assert.match(builders, /Outstanding Supplier Invoices/);
    assert.match(builders, /Waste Logged Today/);
    assert.match(builders, /Cancelled Orders Today/);
    assert.match(builders, /Failed Payments/);
    assert.match(builders, /attentionWhy/);
    assert.match(builders, /No verified failed-payments feed exists yet/);
  });

  it("builds alerts only from verified data", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    assert.match(builders, /buildOwnerAlerts/);
    assert.match(builders, /Low Stock/);
    assert.match(builders, /Delayed Kitchen/);
    assert.match(builders, /Delayed Delivery/);
    assert.match(builders, /Pending Approvals/);
    assert.match(builders, /Outstanding Supplier Payments/);
    assert.doesNotMatch(builders, /Branch Offline/);
    assert.doesNotMatch(builders, /Failed Payment(?!s)/);
    assert.match(builders, /if \(!data\) return \[\]/);
  });

  it("keeps branch isolation on all Owner Command Center fetches", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /fetchAdminOperationsDashboard\(token!, \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listAdminOrders\([\s\S]*branchId: branchIdFilter/);
    assert.match(dashboard, /listKitchenTickets\(token!, \{ branchId: branchIdFilter/);
    assert.match(dashboard, /listDeliveryAssignments\(token!, \{ branchId: branchIdFilter/);
    assert.match(dashboard, /listPurchaseOrders\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listSupplierInvoices\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /listStockMovements\([\s\S]*branchId: branchIdFilter/);
    assert.match(dashboard, /listHrEmployees\(token!, branchIdFilter \? \{ branchId: branchIdFilter \}/);
    assert.match(dashboard, /fetchSalesReport\([\s\S]*branchId: branchIdFilter/);
    assert.match(dashboard, /comingSoonBranch/);
  });

  it("exposes required quick actions", () => {
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    for (const label of [
      "Open Orders",
      "Kitchen",
      "POS",
      "Inventory",
      "Add Stock Item",
      "Purchasing",
      "Create Purchase Order",
      "Record GRN",
      "Reports",
      "Settings",
      "Open HR",
    ]) {
      assert.match(center, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("Owner Brief is deterministic business language only", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    assert.match(builders, /Kitchen is operating normally/);
    assert.match(builders, /purchase approval/);
    assert.match(builders, /Inventory is healthy/);
    assert.match(builders, /No supplier invoices are overdue/);
    assert.match(center, /Owner Brief/);
    assert.match(center, /No AI prediction|no AI prediction/i);
    assert.doesNotMatch(builders, /autonomous|openai|llm|predict/i);
    assert.doesNotMatch(center, /autonomous|openai|llm/i);
    assert.match(center, /No forecasting/);
  });

  it("marks unverified product and hourly widgets unavailable", () => {
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    assert.match(center, /Today’s hourly sales/);
    assert.match(center, /Data unavailable — planned for a later release/);
    assert.match(center, /Top selling products/);
    assert.match(center, /Top categories/);
    assert.match(center, /Order channel mix/);
    assert.match(center, /Average basket/);
    assert.match(center, /Last 7 days/);
    assert.match(center, /Last 30 days/);
    assert.match(center, /No forecasting/);
    assert.match(center, /Recent Settings Changes: data unavailable/);
  });

  it("supports responsive reflow and accessibility contracts", () => {
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    assert.match(center, /sm:grid-cols-2/);
    assert.match(center, /xl:grid-cols/);
    assert.match(center, /min-w-0/);
    assert.match(center, /min-h-11/);
    assert.match(center, /focus-visible:outline/);
    assert.match(center, /aria-labelledby/);
    assert.match(center, /role="status"|role="alert"|role="list"/);
    assert.match(center, /sr-only/);
    assert.match(center, /aria-label=/);
  });

  it("does not introduce migrations, fake metrics, or permission mutations", () => {
    const builders = read("apps/website/client/src/components/admin/dashboard/owner-command-builders.ts");
    const center = read("apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx");
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    for (const src of [builders, center, dashboard]) {
      assert.doesNotMatch(src, /supabase\/migrations/);
      assert.doesNotMatch(src, /Math\.random\(\)|faker|mockDashboard|fakeKpi/i);
      assert.doesNotMatch(src, /GRANT |ALTER TABLE|CREATE POLICY/i);
    }
    assert.doesNotMatch(dashboard, /permissions\.push|roleAssignments\.create/);
  });
});
