/**
 * Delivery Management V1 — composition and honesty wiring (static).
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

describe("Delivery Management V1 (static)", () => {
  it("composes /admin/delivery from reusable delivery components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(page, /DeliveryKPIs/);
    assert.match(page, /DeliveryFilters/);
    assert.match(page, /DispatchQueue/);
    assert.match(page, /DeliveryCards/);
    assert.match(page, /DeliveryDrawer/);
    assert.match(page, /DeliveryInsights/);
    assert.match(page, /listDeliveryAssignments/);
    assert.match(page, /assignDeliveryRider/);
    assert.match(page, /updateDeliveryStatus/);
    assert.match(page, /assignmentsOp\.data != null \? kpiSnapshot : null/);
    const kpis = read("apps/website/client/src/components/admin/delivery/DeliveryKPIs.tsx");
    assert.match(kpis, /Delivery assignment payload unavailable/);
    assert.match(kpis, /UnavailableDeliveryKpis/);
    assert.doesNotMatch(kpis, /snapshot\?\.waiting \?\? 0/);
  });

  it("keeps map, export, failed, and call actions Foundation", () => {
    const page = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(page, /Export · Planned for Phase 2/);
    assert.match(page, /DeliveryMapFoundation/);
    const cards = read("apps/website/client/src/components/admin/delivery/DeliveryCards.tsx");
    assert.match(cards, /Mark failed · Planned for Phase 2/);
    assert.match(cards, /Call customer · Planned for Phase 2/);
    const map = read("apps/website/client/src/components/admin/delivery/DeliverySidePanels.tsx");
    assert.match(map, /No Google Maps/);
  });

  it("labels AI panel as rule-based only without traffic claims", () => {
    const insights = read("apps/website/client/src/components/admin/delivery/DeliveryInsights.tsx");
    assert.match(insights, /Mianx\.ai Delivery Assistant/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction or live traffic/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous/i);
  });

  it("gates delivery nav with delivery access helpers", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminDelivery/);
    assert.match(access, /requiresDelivery/);
    assert.match(access, /canAssignDeliveries/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminDelivery/);
    assert.doesNotMatch(app, /DeliveryComingSoon/);
  });
});
