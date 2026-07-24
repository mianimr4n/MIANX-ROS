/**
 * Executive Admin Dashboard v1 — D1 polish static contract.
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

describe("Executive Admin Dashboard v1 (static)", () => {
  it("composes dashboard from reusable admin components", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /AdminKpiCard/);
    assert.match(dashboard, /ExecutiveFilterBar/);
    assert.match(dashboard, /OperationsModuleGrid/);
    assert.match(dashboard, /AiInsightsPanel/);
    assert.match(dashboard, /LiveActivityPanel/);
    assert.match(dashboard, /fetchAdminOperationsDashboard/);
    assert.match(dashboard, /buildMianxInsightItems/);
  });

  it("keeps the approved KPI contract without inventing inventory or CSAT", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /Today’s Orders/);
    assert.match(dashboard, /Today’s Sales/);
    assert.match(dashboard, /Active Orders/);
    assert.match(dashboard, /Kitchen Queue/);
    assert.match(dashboard, /Active Deliveries/);
    assert.match(dashboard, /Average Order Value/);
    assert.doesNotMatch(dashboard, /Inventory alerts/);
    assert.doesNotMatch(dashboard, /Customer satisfaction/);
    assert.doesNotMatch(dashboard, /percentageLabel|trendLabel/);
    assert.match(dashboard, /formatCount|formatPkr/);
  });

  it("labels Mianx insights as deterministic rule summaries with structured fields", () => {
    const widgets = read("apps/website/client/src/components/admin/dashboard/ExecutiveWidgets.tsx");
    assert.match(widgets, /Mianx\.ai Operations Insights/);
    assert.match(widgets, /Rule ID/);
    assert.match(widgets, /Recommended action/);
    assert.match(widgets, /buildMianxInsightItems/);
    assert.doesNotMatch(widgets, /demand predicted|autonomous|generative model/i);
  });

  it("limits operations grid to D1-supported cards with existing routes", () => {
    const grid = read("apps/website/client/src/components/admin/dashboard/OperationsModuleGrid.tsx");
    assert.match(grid, /title: "Orders"/);
    assert.match(grid, /title: "Employees"/);
    assert.match(grid, /moduleState/);
    assert.doesNotMatch(grid, /title: "WhatsApp"/);
    assert.doesNotMatch(grid, /title: "Loyalty"/);
    assert.doesNotMatch(grid, /\/admin\/ai-command-center/);
  });

  it("does not change auth or introduce migrations in this slice", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.doesNotMatch(dashboard, /signInWithOAuth|createClient/);
    assert.doesNotMatch(dashboard, /supabase\/migrations/);
  });
});
