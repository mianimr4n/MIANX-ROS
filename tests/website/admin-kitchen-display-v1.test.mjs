/**
 * Kitchen Display System V1 — composition and honesty wiring (static).
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

describe("Kitchen Display System V1 (static)", () => {
  it("composes /admin/kitchen from reusable kitchen components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminKitchen.tsx");
    assert.match(page, /KitchenKPIs/);
    assert.match(page, /KitchenFilters/);
    assert.match(page, /KitchenBoard/);
    assert.match(page, /KitchenDetailsPanel/);
    assert.match(page, /KitchenInsights/);
    assert.match(page, /KitchenPerformance/);
    assert.match(page, /listKitchenTickets/);
    assert.match(page, /patchKitchenTicketStatus/);
  });

  it("keeps station filter and capacity labeled Foundation", () => {
    const filters = read("apps/website/client/src/components/admin/kitchen/KitchenFilters.tsx");
    assert.match(filters, /Station/);
    assert.match(filters, /Foundation/);
    assert.match(filters, /disabled/);
    const kpis = read("apps/website/client/src/components/admin/kitchen/KitchenKPIs.tsx");
    assert.match(kpis, /Kitchen capacity/);
    assert.match(kpis, /FOUNDATION/);
    assert.match(kpis, /Kitchen ticket payload unavailable/);
    assert.doesNotMatch(kpis, /\?\? 0/);
    const page = read("apps/website/client/src/pages/admin/AdminKitchen.tsx");
    assert.match(page, /ticketsOp\.data != null \? kpiSnapshot : null/);
  });

  it("labels AI panel as rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/kitchen/KitchenInsights.tsx");
    assert.match(insights, /Mianx\.ai Kitchen Assistant/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous/i);
  });

  it("uses elapsed timestamps without fake countdown timers", () => {
    const helpers = read("apps/website/client/src/lib/admin-kitchen.ts");
    assert.match(helpers, /elapsedMinutes/);
    assert.match(helpers, /ticketTimerStartIso/);
    assert.doesNotMatch(helpers, /setInterval.*countdown|fakeTimer/i);
    const card = read("apps/website/client/src/components/admin/kitchen/KitchenCard.tsx");
    assert.match(card, /elapsed/);
  });

  it("gates kitchen nav with kitchen actor helpers", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminKitchen/);
    assert.match(access, /requiresKitchen/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminKitchen/);
    assert.doesNotMatch(app, /KitchenComingSoon/);
  });
});
