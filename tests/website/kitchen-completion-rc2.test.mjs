/**
 * Kitchen Completion (RC2) — production KDS contracts (static).
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

describe("Kitchen Completion RC2 (static)", () => {
  it("supports Pending → Accepted → Preparing → Ready → Completed lifecycle labels and actions", () => {
    const helpers = read("apps/website/client/src/lib/admin-kitchen.ts");
    assert.match(helpers, /queued: "Pending"/);
    assert.match(helpers, /accepted: "Accepted"/);
    assert.match(helpers, /preparing: "Preparing"/);
    assert.match(helpers, /ready: "Ready"/);
    assert.match(helpers, /completed: "Completed"/);
    assert.match(helpers, /toStatus: "accepted"/);
    assert.match(helpers, /toStatus: "preparing"/);
    assert.match(helpers, /toStatus: "ready"/);
    assert.match(helpers, /toStatus: "completed"/);
    const board = read("apps/website/client/src/components/admin/kitchen/KitchenBoard.tsx");
    assert.match(board, /title: "Pending"/);
    assert.match(board, /No active kitchen tickets/);
  });

  it("shows ticket fields from verified ticket + order enrichment", () => {
    const card = read("apps/website/client/src/components/admin/kitchen/KitchenCard.tsx");
    assert.match(card, /contactName/);
    assert.match(card, /orderType/);
    assert.match(card, /Special instructions/);
    assert.match(card, /Created/);
    assert.match(card, /Accepted/);
    assert.match(card, /Started/);
    assert.match(card, /Ready/);
    assert.match(card, /Assigned staff/);
    assert.match(card, /Station · Planned for Phase 2/);
    const details = read("apps/website/client/src/components/admin/kitchen/KitchenDetailsPanel.tsx");
    assert.match(details, /Special instructions/);
    assert.match(details, /Assigned station/);
    assert.match(details, /Planned for Phase 2/);
    assert.match(details, /acceptedByUserId/);
  });

  it("exposes live KPIs and never fabricates station utilization", () => {
    const kpis = read("apps/website/client/src/components/admin/kitchen/KitchenKPIs.tsx");
    assert.match(kpis, /Orders waiting/);
    assert.match(kpis, /Preparing/);
    assert.match(kpis, /Ready/);
    assert.match(kpis, /Completed today/);
    assert.match(kpis, /Delayed/);
    assert.match(kpis, /Average prep time/);
    assert.match(kpis, /Priority orders/);
    const perf = read("apps/website/client/src/components/admin/kitchen/KitchenPerformance.tsx");
    assert.match(perf, /Current queue/);
    assert.match(perf, /Station utilization/);
    assert.match(perf, /FOUNDATION|Planned for Phase 2/);
    assert.match(perf, /available/);
    assert.match(perf, /not shown as zero/);
  });

  it("lists stations honestly without assignment APIs", () => {
    const stations = read("apps/website/client/src/components/admin/kitchen/KitchenStationsPanel.tsx");
    assert.match(stations, /Pizza/);
    assert.match(stations, /Oven/);
    assert.match(stations, /Packing/);
    assert.match(stations, /Drinks/);
    assert.match(stations, /Desserts/);
    assert.match(stations, /Planned for Phase 2/);
    assert.doesNotMatch(stations, /assignStation|fakeStation|Math\.random/);
    const page = read("apps/website/client/src/pages/admin/AdminKitchen.tsx");
    assert.match(page, /KitchenStationsPanel/);
  });

  it("filters by branch, status, priority, order type, search; station deferred outside primary bar", () => {
    const filters = read("apps/website/client/src/components/admin/kitchen/KitchenFilters.tsx");
    assert.match(filters, /Branch/);
    assert.match(filters, /Status/);
    assert.match(filters, /Priority/);
    assert.match(filters, /Order type/);
    assert.match(filters, /Kitchen search/);
    assert.doesNotMatch(filters, /Stations — Planned for Phase 2/);
    assert.match(filters, /Pending/);
    const stations = read("apps/website/client/src/components/admin/kitchen/KitchenStationsPanel.tsx");
    assert.match(stations, /kitchen-stations-deferred/);
    assert.match(stations, /Planned for Phase 2/);
  });

  it("uses green / yellow / red elapsed timers without fake countdowns", () => {
    const helpers = read("apps/website/client/src/lib/admin-kitchen.ts");
    assert.match(helpers, /PREP_WARN_MINUTES = 15/);
    assert.match(helpers, /PREP_TARGET_MINUTES = 20/);
    assert.match(helpers, /timerTone/);
    assert.doesNotMatch(helpers, /countdown|setInterval/);
  });

  it("keeps Mianx Kitchen Assistant deterministic", () => {
    const insights = read("apps/website/client/src/components/admin/kitchen/KitchenInsights.tsx");
    assert.match(insights, /order\$\{waiting === 1 \? "" : "s"\} waiting|orders waiting/);
    assert.match(insights, /delayed ticket/);
    assert.match(insights, /No elevated kitchen signals/);
    assert.match(insights, /no AI prediction/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous|forecast|openai/i);
  });

  it("wires verified kitchen APIs with branch scope", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchen.tsx");
    assert.match(page, /listKitchenTickets\(token!, \{ branchId: branchIdFilter/);
    assert.match(page, /patchKitchenTicketStatus/);
    assert.match(page, /listAdminOrders/);
    assert.match(page, /getAdminOrder/);
    const ops = read("apps/website/client/src/lib/ops-api.ts");
    assert.match(ops, /acceptedByUserId/);
    assert.match(ops, /\/kitchen\/tickets/);
  });

  it("does not introduce migrations or RBAC changes in this slice", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchen.tsx");
    assert.doesNotMatch(page, /supabase\/migrations|GRANT |CREATE POLICY/);
    assert.doesNotMatch(page, /permissions\.push|roleAssignments/);
  });
});
