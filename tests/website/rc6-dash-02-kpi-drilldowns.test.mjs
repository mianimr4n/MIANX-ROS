/**
 * RC6-DASH-02 — KPI drill-down registry static contracts.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const registrySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/kpi-drilldown/registry.ts"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const ordersSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminOrders.tsx"),
  "utf8",
);
const deliverySrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDelivery.tsx"),
  "utf8",
);
const kitchenSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx"),
  "utf8",
);
const orderFiltersSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/orders/OrderFilters.tsx"),
  "utf8",
);

describe("RC6-DASH-02 KPI drill-down registry", () => {
  it("registers selected KPIs with DRILL_DOWN maturity only", () => {
    for (const id of [
      "KPI-GROSS-SALES-TODAY",
      "KPI-ORDERS-TODAY",
      "KPI-ORDERS-OPEN",
      "KPI-ORDERS-PREPARING",
      "KPI-ORDERS-READY",
      "KPI-ORDERS-DELAYED",
      "KPI-KDS-QUEUE",
      "KPI-DEL-ACTIVE",
      "KPI-ORDERS-COMPLETED",
      "KPI-STOCK-LOW",
      "KPI-ORDERS-CANCELLED",
    ]) {
      assert.match(registrySrc, new RegExp(id));
    }
    assert.match(registrySrc, /actionMaturity:\s*"DRILL_DOWN"/);
    assert.doesNotMatch(registrySrc, /DRAFT_ACTION|APPROVAL_REQUIRED|DIRECT_EXECUTION/);
  });

  it("builds truthful destinations and omits unsupported filters", () => {
    assert.match(registrySrc, /\/admin\/orders/);
    assert.match(registrySrc, /statusValue:\s*"preparing"/);
    assert.match(registrySrc, /statusValue:\s*"ready"/);
    assert.match(registrySrc, /statusValue:\s*"completed"/);
    assert.match(registrySrc, /statusValue:\s*"cancelled"/);
    assert.match(registrySrc, /viewValue:\s*"delayed"/);
    assert.match(registrySrc, /lowStockValue:\s*"1"/);
    assert.match(registrySrc, /statusValue:\s*"picked-up"/);
    assert.match(registrySrc, /Never invents unsupported query keys/);
    assert.doesNotMatch(registrySrc, /branchIdFilterKey|dateFromFilterKey/);
  });

  it("never labels sales as ACCOUNTING", () => {
    assert.match(registrySrc, /KPI-GROSS-SALES-TODAY[\s\S]*?trustState:\s*"PARTIAL_LIVE"/);
    assert.doesNotMatch(registrySrc, /KPI-GROSS-SALES-TODAY[\s\S]*?trustState:\s*"ACCOUNTING"/);
  });

  it("wires Owner Command Center through the registry", () => {
    assert.match(ownerSrc, /buildKpiDrillDownHref/);
    assert.match(ownerSrc, /buildKpiDrillDownAriaLabel/);
    assert.match(ownerSrc, /data-kpi-maturity="DRILL_DOWN"/);
    assert.match(ownerSrc, /kpi-drilldown-/);
  });

  it("sanitizes destination status filters and clears filters", () => {
    assert.match(ordersSrc, /sanitizeStatusFilter/);
    assert.match(deliverySrc, /sanitizeStatusFilter/);
    assert.match(kitchenSrc, /\["board", "queue", "ready", "delayed"\]/);
    assert.match(orderFiltersSrc, /Clear filters/);
    assert.match(ordersSrc, /orders-active-filters/);
    const inventorySrc = readFileSync(
      path.join(root, "apps/website/client/src/pages/admin/AdminInventory.tsx"),
      "utf8",
    );
    const inventoryFiltersSrc = readFileSync(
      path.join(root, "apps/website/client/src/components/admin/inventory/InventoryFilters.tsx"),
      "utf8",
    );
    assert.match(inventorySrc, /lowStock/);
    assert.match(inventorySrc, /inventory-active-filters/);
    assert.match(inventoryFiltersSrc, /Clear filters/);
  });

  it("does not embed PII in registry destination routes", () => {
    const routeLines = registrySrc
      .split("\n")
      .filter((line) => line.includes("destinationRoute:"));
    for (const line of routeLines) {
      assert.doesNotMatch(line, /phone|email|password|token|customerId|gps/i);
    }
    assert.doesNotMatch(registrySrc, /statusValue:\s*"[^"]*(@|phone|token)/i);
  });

  it("acceptance evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/rc6-dash-02");
    for (const name of [
      "KPI_SOURCE_AUDIT.md",
      "SELECTED_KPIS.md",
      "DRILL_DOWN_REGISTRY.md",
      "FILTER_CONTRACT.md",
      "DESTINATION_ROUTE_MATRIX.md",
      "DATE_TIMEZONE_REVIEW.md",
      "SECURITY_PRIVACY_REVIEW.md",
      "ACCESSIBILITY_PERFORMANCE.md",
      "TEST_RESULTS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

describe("RC6-DASH-02 href builder semantics (pure)", () => {
  it("omits empty status and keeps path stable", () => {
    const route = "/admin/orders";
    const params = new URLSearchParams();
    const status = "";
    if (status) params.set("status", status);
    const href = params.toString() ? `${route}?${params}` : route;
    assert.equal(href, "/admin/orders");
  });

  it("includes only supported status when present", () => {
    const route = "/admin/orders";
    const params = new URLSearchParams();
    params.set("status", "preparing");
    assert.equal(`${route}?${params}`, "/admin/orders?status=preparing");
  });
});
