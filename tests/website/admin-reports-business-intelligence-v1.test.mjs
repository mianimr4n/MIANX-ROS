/**
 * Reports & Business Intelligence V1 — Owner BI workspace composition (static).
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
  it("composes /admin/reports as Owner BI workspace from server envelopes", () => {
    const page = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.match(page, /ReportsHeader/);
    assert.match(page, /ReportsStatusBanner/);
    assert.match(page, /ReportsFilters/);
    assert.match(page, /OwnerBiWorkspacePanel/);
    assert.match(page, /ExportPanel/);
    assert.match(page, /BusinessInsights/);
    assert.match(page, /canAccessAdminReports/);
    assert.match(page, /fetchAnalyticsWorkspace/);
    assert.match(page, /downloadAnalyticsExport/);
    assert.match(page, /downloadSalesReportCsv/);
    assert.match(page, /downloadOrdersReportCsv/);
    assert.match(page, /buildWorkspaceInsights/);
    assert.doesNotMatch(page, /fetchAdminOperationsDashboard/);
    assert.doesNotMatch(page, /buildCustomerReportSnapshot|buildPaymentMixSnapshot|filteredOrdersForReports/);
    assert.doesNotMatch(
      page,
      /from "@\/components\/admin\/reports\/(ExecutiveKPIs|ReportSections|TrendAnalysis|BranchComparison)"/,
    );
    assert.doesNotMatch(page, /ReportsFoundationPanel|ReportsReadinessSections|Integration readiness/);
  });

  it("does not compute KPI formulas from orders in the reports page", () => {
    const page = read("apps/website/client/src/pages/admin/AdminReports.tsx");
    assert.doesNotMatch(page, /useMemo/);
    assert.doesNotMatch(page, /filteredOrders|customerSnapshot|paymentMix/);
    assert.doesNotMatch(page, /grossSales\s*\+|totalOrders\s*\*|reduce\(/);
    const panel = read("apps/website/client/src/components/admin/reports/OwnerBiWorkspacePanel.tsx");
    assert.match(panel, /Owner BI Workspace/);
    assert.match(panel, /server-computed envelopes|GET \/admin\/analytics\/workspace/);
    assert.doesNotMatch(panel, /filteredOrders|buildCustomerReportSnapshot|aggregateCustomersFromOrders/);
    assert.match(panel, /formatMetricValue|metric\.value/);
  });

  it("workspace panel renders module metric envelopes only", () => {
    const panel = read("apps/website/client/src/components/admin/reports/OwnerBiWorkspacePanel.tsx");
    assert.match(panel, /AdminKpiCard/);
    assert.match(panel, /module\.metrics/);
    assert.match(panel, /metricId/);
    assert.doesNotMatch(panel, /mockSeries|fakeMetric|invented/i);
  });

  it("exports wire live CSV, Excel, and PDF via analytics export", () => {
    const exports = read("apps/website/client/src/components/admin/reports/ExportPanel.tsx");
    assert.match(exports, /Export analytics CSV/);
    assert.match(exports, /Export Excel/);
    assert.match(exports, /Export PDF/);
    assert.match(exports, /Export sales CSV/);
    assert.match(exports, /Export orders CSV/);
    assert.match(exports, /onExportAnalyticsCsv/);
    assert.match(exports, /onExportAnalyticsExcel/);
    assert.match(exports, /onExportAnalyticsPdf/);
    assert.doesNotMatch(exports, /Planned for Phase 2/);
    assert.doesNotMatch(exports, /MISSING/);
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /\/admin\/analytics\/export/);
    assert.match(api, /downloadAnalyticsExport/);
    assert.match(api, /format === "excel"|format: AnalyticsExportFormat/);
    assert.match(api, /\/admin\/reports\/sales\/export/);
    assert.match(api, /\/admin\/reports\/orders\/export/);
  });

  it("admin-api exposes analytics helpers for workspace and related endpoints", () => {
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /fetchAnalyticsWorkspace/);
    assert.match(api, /fetchAnalyticsModules/);
    assert.match(api, /fetchAnalyticsRegistry/);
    assert.match(api, /fetchAnalyticsModule/);
    assert.match(api, /fetchAnalyticsDrilldown/);
    assert.match(api, /fetchAnalyticsScheduledReports/);
    assert.match(api, /createAnalyticsScheduledReport/);
    assert.match(api, /fetchAnalyticsExceptions/);
    assert.match(api, /runAnalyticsDataQuality/);
    assert.match(api, /OwnerBiWorkspace/);
  });

  it("Mianx business insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/reports/BusinessInsights.tsx");
    assert.match(insights, /Mianx\.ai Business Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Missing finance linkage/);
    assert.match(insights, /server module/);
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

  it("integration checks mark analytics workspace and exports LIVE", () => {
    const helper = read("apps/website/client/src/lib/admin-reports.ts");
    assert.match(helper, /Owner BI workspace API/);
    assert.match(helper, /id: "owner-bi-workspace"[\s\S]*?status: "present"/);
    assert.match(helper, /id: "exports"[\s\S]*?status: "present"/);
    assert.match(helper, /GET \/admin\/analytics\/workspace/);
    assert.match(helper, /GET \/admin\/analytics\/export/);
    assert.match(helper, /buildWorkspaceInsights/);
    assert.match(helper, /reports\.read seeded/);
  });
});
