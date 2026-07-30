/**
 * Opening operational truth — presentation contracts (executable).
 * Imports client helpers via Node strip-types (modules without Vite @/ aliases).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const truthUrl = pathToFileURL(
  join(root, "apps/website/client/src/lib/operational-truth.ts"),
).href;
const mianxUrl = pathToFileURL(join(root, "apps/website/client/src/lib/mianx-team.ts")).href;
const deliveryUrl = pathToFileURL(
  join(root, "apps/website/client/src/lib/admin-delivery.ts"),
).href;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const truth = await import(truthUrl);
const mianx = await import(mianxUrl);
const delivery = await import(deliveryUrl);

function kitchenLabel(status) {
  return truth.kitchenRelationshipLabel(truth.kitchenRelationshipFromOrderStatus(status));
}

function deliveryLabel(status, orderType) {
  return truth.deliveryRelationshipLabel(truth.deliveryRelationshipFromOrder(status, orderType));
}

describe("Pending order truth", () => {
  it("Orders Kitchen = Not sent to kitchen; Delivery = Awaiting confirmation", () => {
    assert.equal(kitchenLabel("pending"), "Not sent to kitchen");
    assert.equal(deliveryLabel("pending", "delivery"), "Awaiting confirmation");
    assert.notEqual(kitchenLabel("pending"), "Queued");
    const format = read("apps/website/client/src/lib/admin-order-format.ts");
    assert.match(format, /Pending confirmation/);
    assert.match(format, /kitchenRelationshipFromOrderStatus/);
    assert.match(format, /deliveryRelationshipFromOrder/);
  });

  it("provisional delivery is not dispatch waiting, not assignable, not late", () => {
    const input = {
      deliveryStatus: "pending",
      orderStatus: "pending",
      assignedAt: null,
      pickedUpAt: null,
      nowMs: Date.now(),
    };
    assert.equal(truth.isProvisionalDelivery(input), true);
    assert.equal(truth.isDispatchWaitingForRider(input), false);
    assert.equal(truth.canAssignRider(input), false);
    assert.equal(truth.classifyDeliveryLate(input), "NOT_APPLICABLE");
  });

  it("Order Control Agent reports pending confirmation", () => {
    const cards = mianx.buildMianxAgentCards({
      nowIso: new Date().toISOString(),
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 1,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 0,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: "B",
      openingBlockers: 0,
      openingError: false,
      healthOk: true,
      healthError: false,
      isSuperAdmin: true,
    });
    const order = cards.find((c) => c.id === "order-control");
    assert.ok(order);
    assert.match(order.verifiedSignal, /Pending customer confirmation/);
    assert.match(order.currentProblem, /not a kitchen ticket/i);
    const kitchen = cards.find((c) => c.id === "kitchen-control");
    assert.match(kitchen.verifiedSignal, /Actual kitchen tickets: 0/);
    const deliveryAgent = cards.find((c) => c.id === "delivery-control");
    assert.match(deliveryAgent.currentProblem, /not active and not late/i);
  });
});

describe("Confirmed / preparing / ready / dispatched truth", () => {
  it("confirmed kitchen = Queued; delivery not dispatched", () => {
    assert.equal(kitchenLabel("confirmed"), "Queued");
    assert.equal(deliveryLabel("confirmed", "delivery"), "Not ready for dispatch");
    assert.equal(
      truth.canAssignRider({ deliveryStatus: "pending", orderStatus: "confirmed" }),
      false,
    );
  });

  it("preparing kitchen = Preparing; no rider-dispatched claim", () => {
    assert.equal(kitchenLabel("preparing"), "Preparing");
    assert.equal(deliveryLabel("preparing", "delivery"), "Not ready for dispatch");
    assert.equal(
      truth.isDispatchWaitingForRider({ deliveryStatus: "pending", orderStatus: "preparing" }),
      false,
    );
  });

  it("ready kitchen = Ready; may wait for rider", () => {
    assert.equal(kitchenLabel("ready"), "Ready");
    assert.equal(deliveryLabel("ready", "delivery"), "Waiting for rider");
    assert.equal(
      truth.isDispatchWaitingForRider({ deliveryStatus: "pending", orderStatus: "ready" }),
      true,
    );
    assert.equal(truth.canAssignRider({ deliveryStatus: "pending", orderStatus: "ready" }), true);
  });

  it("dispatched is out for delivery; late needs assign/pickup clock", () => {
    assert.equal(deliveryLabel("dispatched", "delivery"), "Out for delivery");
    assert.equal(
      truth.classifyDeliveryLate({
        deliveryStatus: "assigned",
        orderStatus: "dispatched",
        assignedAt: null,
        pickedUpAt: null,
      }),
      "UNAVAILABLE",
    );
    const assignedAt = new Date(Date.now() - 50 * 60_000).toISOString();
    assert.equal(
      truth.classifyDeliveryLate({
        deliveryStatus: "assigned",
        orderStatus: "dispatched",
        assignedAt,
        pickedUpAt: null,
        lateMinutes: 45,
      }),
      "LATE",
    );
  });
});

describe("Delivery timer honesty", () => {
  it("deliveryTimerStartIso never falls back to createdAt", () => {
    assert.equal(
      delivery.deliveryTimerStartIso({
        pickedUpAt: null,
        assignedAt: null,
        createdAt: "2026-07-27T00:00:00.000Z",
      }),
      null,
    );
    assert.equal(
      delivery.deliveryTimerStartIso({
        pickedUpAt: null,
        assignedAt: "2026-07-27T01:00:00.000Z",
        createdAt: "2026-07-27T00:00:00.000Z",
      }),
      "2026-07-27T01:00:00.000Z",
    );
  });
});

describe("Error / empty honesty wiring (static)", () => {
  it("kitchen API error surfaces do not claim LIVE zero queue", () => {
    const panels = read("apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx");
    assert.match(panels, /ERROR — kitchen status unavailable/);
    assert.match(panels, /Counts are not shown as zero/);
    const team = read("apps/website/client/src/lib/mianx-team.ts");
    assert.match(team, /Kitchen tickets API error — not LIVE/);
    assert.match(team, /refusing fake LIVE zero/);
  });

  it("delivery API error refuses fake LIVE zero", () => {
    const team = read("apps/website/client/src/lib/mianx-team.ts");
    assert.match(team, /Delivery assignments API error — not LIVE/);
    assert.match(team, /refusing fake LIVE zero/);
  });

  it("Delivery page separates provisional vs dispatch queue", () => {
    const page = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(page, /isProvisionalDelivery/);
    assert.match(page, /isDispatchWaitingForRider/);
    assert.match(page, /classifyDeliveryLate/);
    assert.match(page, /Awaiting confirmation/);
    assert.match(page, /Delivery record created — order awaiting confirmation/);
    const kpis = read("apps/website/client/src/components/admin/delivery/DeliveryKPIs.tsx");
    assert.match(kpis, /provisional/);
    assert.match(kpis, /Late uses assigned\/picked-up/);
  });
});

describe("Dashboard alignment (static)", () => {
  it("Executive Kitchen Queue stays confirmed + preparing with honest copy", () => {
    const kpis = read("apps/website/client/src/components/admin/dashboard/ExecutiveKPIs.tsx");
    assert.match(kpis, /Kitchen Queue/);
    assert.match(kpis, /Confirmed \+ preparing/);
    assert.match(kpis, /Open kitchen tickets|Orders confirmed or preparing|Kitchen Tickets API|order-derived kitchen waiting/);
    assert.match(kpis, /Active Deliveries/);
    assert.match(kpis, /Open rider assignments|Orders currently dispatched|Riders Assignments API|order-derived dispatched/);
    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dash, /listKitchenTickets/);
    assert.match(dash, /listDeliveryAssignments/);
  });

  it("Branch dashboard separates pending orders from kitchen tickets", () => {
    const branch = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");
    assert.match(branch, /Pending customer orders/);
    assert.match(branch, /not kitchen tickets/);
    assert.match(branch, /In kitchen \(orders\)/);
    assert.match(branch, /not a KDS ticket count/);
    assert.match(branch, /Customers awaiting staff/);
    const panels = read("apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx");
    assert.match(panels, /Kitchen status \(order-derived\)/);
    assert.match(panels, /not kitchen_tickets/);
    assert.match(panels, /Pending confirmation \(orders\)/);
  });

  it("AI Team agents match operational contracts", () => {
    const registry = read("apps/website/client/src/lib/mianx-team.ts");
    assert.match(registry, /Pending customer confirmation/);
    assert.match(registry, /Actual kitchen tickets/);
    assert.match(registry, /Active dispatched deliveries/);
    assert.match(registry, /Provisional delivery records/);
    assert.match(registry, /Provisional delivery rows for unconfirmed orders are not active and not late/);
    assert.match(registry, /Northern Bypass correctly remains coming-soon/);
  });
});

describe("RBAC wording alignment", () => {
  it("does not call UI subset the complete RBAC seed", () => {
    const settings = read("apps/website/client/src/lib/admin-settings.ts");
    assert.doesNotMatch(settings, /RBAC seed: \$\{input\.roleCount/);
    assert.match(settings, /Team roles on file|UI-visible roles/);
    assert.match(settings, /do not invent new permission codes|not the complete Seeded RBAC catalog/i);
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.match(panels, /Current session grants/);
    assert.match(panels, /UI-visible application roles/);
    assert.match(panels, /UI permission reference/);
    assert.doesNotMatch(panels, /RBAC seed: 6 roles/);
  });

  it("preserves canonical staff role codes and forbids owner/founder", () => {
    assert.deepEqual([...truth.CANONICAL_STAFF_ROLE_CODES], [
      "super-admin",
      "branch-manager",
      "kitchen",
      "cashier",
      "rider",
      "customer-support",
      "host",
      "waiter",
    ]);
    for (const code of truth.FORBIDDEN_ROLE_CODES) {
      assert.ok(!truth.CANONICAL_STAFF_ROLE_CODES.includes(code));
    }
    const hr = read("apps/website/client/src/lib/admin-hr.ts");
    for (const code of truth.CANONICAL_STAFF_ROLE_CODES) {
      assert.match(hr, new RegExp(`code: "${code}"`));
    }
    assert.doesNotMatch(hr, /code: "owner"|code: "founder"|code: "general-staff"/);
  });
});

describe("Northern Bypass", () => {
  it("remains coming-soon with no operational metrics mutation path", () => {
    const branchCtx = read("apps/website/client/src/contexts/BranchContext.tsx");
    assert.match(branchCtx, /Northern Bypass/);
    assert.match(branchCtx, /status: "coming-soon"/);
    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dash, /comingSoonBranch/);
  });
});

describe("Responsive and accessibility contracts (static)", () => {
  it("changed surfaces keep reflow grids, touch targets, and aria labels", () => {
    const gridFiles = [
      "apps/website/client/src/pages/admin/AdminDelivery.tsx",
      "apps/website/client/src/components/admin/delivery/DeliveryKPIs.tsx",
      "apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx",
      "apps/website/client/src/pages/admin/AdminBranchManager.tsx",
      "apps/website/client/src/pages/admin/AdminDashboard.tsx",
      "apps/website/client/src/components/admin/settings/SettingsPanels.tsx",
    ];
    for (const rel of gridFiles) {
      const src = read(rel);
      assert.match(src, /sm:grid-cols-2|xl:grid-cols|grid gap/, `reflow grid missing in ${rel}`);
      assert.doesNotMatch(src, new RegExp(["SUPABASE", "SERVICE", "ROLE"].join("_") + "|sk_live"), `secret/private in ${rel}`);
    }
    const delivery = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(delivery, /aria-label="Provisional delivery records"/);
    const kpis = read("apps/website/client/src/components/admin/delivery/DeliveryKPIs.tsx");
    assert.match(kpis, /aria-label="Delivery key performance indicators"/);
    const queue = read("apps/website/client/src/components/admin/delivery/DispatchQueue.tsx");
    assert.match(queue, /overflow-x-auto/);
    assert.match(queue, /min-h-10|min-h-11/);
    assert.match(queue, /focus-visible:outline/);
    assert.match(queue, /aria-label="Dispatch queue"/);
    const panels = read("apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx");
    assert.match(panels, /aria-labelledby="kitchen-status-heading"/);
  });
});

describe("Confirm → one kitchen ticket contract (repository)", () => {
  it("management confirm invokes createKitchenTicketForConfirmedOrder", () => {
    const management = read("backend/api/src/services/orders/management.ts");
    assert.match(management, /createKitchenTicketForConfirmedOrder/);
    const tickets = read("backend/api/src/services/kitchen/tickets.ts");
    assert.match(tickets, /Idempotent kitchen ticket/);
    assert.match(tickets, /createKitchenTicketForConfirmedOrder/);
    const tests = read("backend/api/tests/kitchen-tickets.test.ts");
    assert.match(tests, /createKitchenTicketForConfirmedOrder/);
    assert.match(tests, /does not create for non-confirmed/);
  });
});
