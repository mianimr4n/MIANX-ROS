/**
 * Reports & Business Intelligence V1 — composition and honesty wiring (static).
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

describe("Reports & Business Intelligence V1 (static)", () => {
  it("composes /admin/reports from reusable BI components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.match(page, /ReportsHeader/);
    assert.match(page, /ReportsStatusBanner/);
    assert.match(page, /ReportsFilters/);
    assert.match(page, /ExecutiveKPIs/);
    assert.match(page, /SalesReport/);
    assert.match(page, /OrdersReport/);
    assert.match(page, /CustomerReport/);
    assert.match(page, /KitchenReport/);
    assert.match(page, /DeliveryReport/);
    assert.match(page, /InventoryReport/);
    assert.match(page, /FinanceReport/);
    assert.match(page, /BranchComparison/);
    assert.match(page, /TrendAnalysis/);
    assert.match(page, /ExportPanel/);
    assert.doesNotMatch(page, /ReportsFoundationPanel|ReportsReadinessSections|Integration readiness/);
    assert.match(page, /BusinessInsights/);
    assert.match(page, /canAccessAdminReports/);
    assert.match(page, /fetchAdminOperationsDashboard/);
    assert.match(page, /fetchSalesReport/);
    assert.match(page, /downloadSalesReportCsv/);
    assert.match(page, /downloadOrdersReportCsv/);
  });

  it("wires live sales analytics without fabricating growth", () => {
    const trend = read("apps/website/client/src/components/admin/reports/TrendAnalysis.tsx");
    assert.match(trend, /Sales analytics/);
    assert.match(trend, /No sales data for selected period/);
    assert.match(trend, /fetchSalesReport|SalesReport|grossSales/);
    assert.doesNotMatch(trend, /growthPercent|mockSeries|lastMonth/i);
    assert.doesNotMatch(trend, /MISSING|Coming Soon/);
    const kpis = read("apps/website/client/src/components/admin/reports/ExecutiveKPIs.tsx");
    assert.match(kpis, /Sales growth/);
    assert.match(kpis, /FOUNDATION/);
    assert.match(kpis, /Operations dashboard payload unavailable/);
    assert.doesNotMatch(kpis, /todayOrders \?\? 0|kitchenWaiting \?\? 0|activeDeliveries \?\? 0/);
    const page = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.match(page, /customerSnapshot=\{data != null \? customerSnapshot : null\}/);
    assert.match(page, /dateRange/);
  });

  it("charts use real dashboard data only", () => {
    const charts = read("apps/website/client/src/components/admin/reports/ReportCharts.tsx");
    assert.match(charts, /role="img"/);
    assert.doesNotMatch(charts, /mockData|fakeSeries|\[4,\s*6,\s*5/i);
    const sales = read("apps/website/client/src/components/admin/reports/ReportSections.tsx");
    assert.match(sales, /sourceChartData/);
    assert.match(sales, /statusChartData/);
  });

  it("exports wire live CSV with Excel/PDF Planned for Phase 2", () => {
    const exports = read("apps/website/client/src/components/admin/reports/ExportPanel.tsx");
    assert.match(exports, /Export sales CSV/);
    assert.match(exports, /Export orders CSV/);
    assert.match(exports, /Export Excel \/ PDF · Planned for Phase 2/);
    assert.match(exports, /onExportSales/);
    assert.match(exports, /onExportOrders/);
    assert.doesNotMatch(exports, /MISSING/);
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /\/admin\/reports\/sales\/export/);
    assert.match(api, /\/admin\/reports\/orders\/export/);
  });

  it("inventory and finance reports remain Foundation", () => {
    const sections = read("apps/website/client/src/components/admin/reports/ReportSections.tsx");
    assert.match(sections, /Inventory reporting foundation/);
    assert.match(sections, /Finance reporting foundation/);
    assert.doesNotMatch(sections, /inventoryValue|netProfit|grossMargin:\s*\d/i);
  });

  it("Mianx business insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/reports/BusinessInsights.tsx");
    assert.match(insights, /Mianx\.ai Business Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Missing finance linkage/);
    assert.doesNotMatch(insights, /demand prediction|revenue forecast|future sales/i);
  });

  it("gates /admin/reports with canAccessAdminReports", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminReports/);
    assert.match(access, /reports\.read/);
    assert.match(access, /canAccessAdminOrdersApi/);
    assert.match(access, /requiresReports/);
    assert.match(access, /href: "\/admin\/reports"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminReports/);
    assert.match(app, /path="\/admin\/reports"/);
    const page = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks mark sales analytics and CSV exports PRESENT", () => {
    const helper = read("apps/website/client/src/lib/admin-reports.ts");
    assert.match(helper, /Historical time-series analytics/);
    assert.match(helper, /id: "historical-analytics"[\s\S]*?status: "present"/);
    assert.match(helper, /id: "exports"[\s\S]*?status: "present"/);
    assert.match(helper, /GET \/admin\/reports\/sales/);
    assert.match(helper, /reports\.read seeded/);
  });
});
