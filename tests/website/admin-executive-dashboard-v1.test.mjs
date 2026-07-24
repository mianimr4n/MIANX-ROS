/**
 * Executive Admin Dashboard v1 — reusable foundation wiring (static).
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
  });

  it("keeps unavailable KPIs honest without inventing inventory or CSAT", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /Inventory alerts/);
    assert.match(dashboard, /Customer satisfaction/);
    assert.match(dashboard, /UNAVAILABLE/);
    assert.match(dashboard, /source="LIVE"|source=\{/);
    assert.doesNotMatch(dashboard, /percentageLabel|trendLabel/);
  });

  it("labels AI foundation insights separately from live signals", () => {
    const widgets = read("apps/website/client/src/components/admin/dashboard/ExecutiveWidgets.tsx");
    assert.match(widgets, /Mianx\.ai Operations Insights/);
    assert.match(widgets, /Rule-based summary/);
    assert.doesNotMatch(widgets, /demand predicted|autonomous|LLM/i);
  });

  it("registers POS and WhatsApp reserved routes without removing existing admin routes", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /\/admin\/dashboard/);
    assert.match(app, /\/admin\/orders/);
    assert.match(app, /\/admin\/pos/);
    assert.match(app, /\/admin\/whatsapp/);
  });

  it("does not change auth or introduce migrations in this slice", () => {
    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.doesNotMatch(dashboard, /signInWithOAuth|createClient/);
    assert.doesNotMatch(dashboard, /supabase\/migrations/);
  });
});
