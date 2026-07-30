/**
 * Orders Management V1 — composition and honesty wiring (static).
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

describe("Orders Management V1 (static)", () => {
  it("composes /admin/orders from reusable order components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminOrders.tsx");
    assert.match(page, /OrderKPIs/);
    assert.match(page, /OrderFilters/);
    assert.match(page, /OrderGrid/);
    assert.match(page, /OrderDrawer/);
    assert.match(page, /OrderAIInsights/);
    assert.match(page, /listAdminOrders/);
    assert.match(page, /fetchAdminOperationsDashboard/);
    assert.match(page, /transitionAdminOrder/);
  });

  it("keeps unsupported filters and export labeled Planned for Phase 2", () => {
    const filters = read("apps/website/client/src/components/admin/orders/OrderFilters.tsx");
    assert.match(filters, /Planned for Phase 2/);
    assert.match(filters, /disabled/);
    const page = read("apps/website/client/src/pages/admin/AdminOrders.tsx");
    assert.match(page, /Export · Planned for Phase 2/);
  });

  it("labels AI panel as rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/orders/OrderAIInsights.tsx");
    assert.match(insights, /Mianx\.ai Order Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous/i);
    assert.match(insights, /No prediction models/i);
  });

  it("exposes avg prep time as UNAVAILABLE and uses live KPI sources", () => {
    const kpis = read("apps/website/client/src/components/admin/orders/OrderKPIs.tsx");
    assert.match(kpis, /Avg preparation time/);
    assert.match(kpis, /UNAVAILABLE/);
    assert.match(kpis, /source="LIVE"/);
    assert.match(kpis, /Order KPI payload unavailable/);
    assert.doesNotMatch(kpis, /\?\? 0/);
  });

  it("does not invent schema migrations or auth changes in this slice", () => {
    const page = read("apps/website/client/src/pages/admin/AdminOrders.tsx");
    assert.doesNotMatch(page, /supabase\/migrations|signInWithOAuth|createClient/);
    const drawer = read("apps/website/client/src/components/admin/orders/OrderDrawer.tsx");
    assert.match(drawer, /order\.manage/);
  });
});
