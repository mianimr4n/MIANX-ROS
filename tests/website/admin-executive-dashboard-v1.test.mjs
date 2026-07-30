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
    assert.match(dashboard, /ExecutiveKPIs/);
    assert.match(dashboard, /AiInsightsPanel/);
    assert.match(dashboard, /LiveActivityPanel/);
    assert.match(dashboard, /fetchAdminOperationsDashboard/);
    assert.match(dashboard, /listAdminOrders/);
    assert.match(dashboard, /listKitchenTickets/);
    assert.match(dashboard, /listDeliveryAssignments/);
    assert.match(dashboard, /buildMianxInsightItems/);
  });

  it("keeps the approved KPI contract with live low-stock from inventory_items", () => {
    const kpis = read("apps/website/client/src/components/admin/dashboard/ExecutiveKPIs.tsx");
    assert.match(kpis, /Today’s Orders/);
    assert.match(kpis, /Today’s Sales/);
    assert.match(kpis, /Active Orders/);
    assert.match(kpis, /Low-stock items/);
    assert.match(kpis, /Inventory levels are healthy/);
    assert.match(kpis, /below minimum stock level/);
    assert.match(kpis, /Kitchen Queue/);
    assert.match(kpis, /Active Deliveries/);
    assert.match(kpis, /Average Order Value/);
    assert.match(kpis, /Source: Orders API/);
    assert.match(kpis, /Source unavailable/);
    assert.doesNotMatch(kpis, /Customer satisfaction/);
    assert.doesNotMatch(kpis, /percentageLabel|trendLabel/);
    assert.match(kpis, /formatCount|formatPkr/);
  });

  it("labels Mianx insights as deterministic rule summaries with structured fields", () => {
    const panel = read("apps/website/client/src/components/admin/dashboard/MianxInsightsPanel.tsx");
    assert.match(panel, /Mianx\.ai Operations Insights/);
    assert.match(panel, /Rule ID/);
    assert.match(panel, /Recommended action/);
    assert.match(panel, /buildMianxInsightItems|buildDeterministicMianxInsights/);
    assert.match(panel, /Loading insights/);
    assert.match(panel, /pending order/);
    assert.match(panel, /INVENTORY\.LOW_STOCK/);
    assert.match(panel, /Inventory levels are healthy/);
    assert.doesNotMatch(panel, /demand predicted|autonomous|generative model|openai|llm/i);
  });

  it("maps canonical D2 states onto KPI cards (error and stale stay distinct)", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /if \(opState === "ERROR" \|\| opState === "OFFLINE"\) return "error"/);
    assert.match(dashboard, /if \(opState === "STALE"\) return "stale"/);
    assert.match(dashboard, /loading=\{loading && !data\}/);
  });

  it("limits operations grid to D1-supported cards with existing routes", () => {
    const grid = read("apps/website/client/src/components/admin/dashboard/OperationsModuleGrid.tsx");
    assert.match(grid, /title: "Orders"/);
    assert.match(grid, /title: "Employees"/);
    assert.match(grid, /OperationModuleCard/);
    assert.match(grid, /status:/);
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
