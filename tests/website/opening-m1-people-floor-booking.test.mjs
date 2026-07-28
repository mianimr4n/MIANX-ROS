/**
 * Opening Operations M1 — people / floor / booking readiness truth.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const modelUrl = pathToFileURL(join(root, "apps/website/client/src/lib/opening-readiness-model.ts")).href;
const teamUrl = pathToFileURL(join(root, "apps/website/client/src/lib/mianx-team.ts")).href;

const model = await import(modelUrl);
const team = await import(teamUrl);

function emptyChecks() {
  return {
    phone: false,
    operatingHours: false,
    branchManagerAssigned: false,
    cashierAssigned: false,
    hostAssigned: false,
    waiterAssigned: false,
    kitchenAssigned: false,
    riderAssigned: false,
    customerSupportAssigned: false,
    statusOperating: true,
    floorConfigured: false,
    tablesConfigured: false,
    bookingPolicyConfigured: false,
    menuAssigned: false,
    posReady: false,
    kdsReady: false,
    deliveryReady: false,
    paymentConfigured: false,
    notificationConfigured: false,
    deviceVerified: false,
  };
}

function baseSignals(overrides = {}) {
  return {
    nowIso: "2026-07-28T12:00:00.000Z",
    branchCode: "royal-orchard",
    branchStatus: "operating",
    northernBypassStatus: "coming-soon",
    readinessReport: {
      readinessGrade: "BLOCKED",
      checks: emptyChecks(),
      blockers: [],
    },
    readinessError: false,
    readinessOffline: false,
    reservationsOk: true,
    waitlistOk: true,
    healthOk: true,
    healthError: false,
    healthOffline: false,
    ...overrides,
  };
}

describe("opening M1 people floor booking readiness", () => {
  it("no staff = not COMPLETE for required people roles", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    for (const id of [
      "people-branch-manager",
      "people-cashier",
      "people-kitchen",
      "people-rider",
      "people-host",
      "people-waiter",
      "people-customer-support",
    ]) {
      assert.notEqual(items.find((i) => i.id === id)?.status, "COMPLETE", id);
    }
  });

  it("real ACTIVE assignments = COMPLETE", () => {
    const checks = {
      ...emptyChecks(),
      branchManagerAssigned: true,
      cashierAssigned: true,
      kitchenAssigned: true,
      riderAssigned: true,
      hostAssigned: true,
      waiterAssigned: true,
      customerSupportAssigned: true,
    };
    const items = model.evaluateOpeningReadiness(
      baseSignals({ readinessReport: { readinessGrade: "BLOCKED", checks, blockers: [] } }),
    );
    for (const id of [
      "people-branch-manager",
      "people-cashier",
      "people-kitchen",
      "people-rider",
      "people-host",
      "people-waiter",
      "people-customer-support",
    ]) {
      assert.equal(items.find((i) => i.id === id)?.status, "COMPLETE", id);
    }
  });

  it("floor without tables incomplete; both complete when present", () => {
    const floorOnly = model.evaluateOpeningReadiness(
      baseSignals({
        readinessReport: {
          readinessGrade: "BLOCKED",
          checks: { ...emptyChecks(), floorConfigured: true, tablesConfigured: false },
          blockers: [],
        },
      }),
    );
    assert.equal(floorOnly.find((i) => i.id === "floor-plan")?.status, "COMPLETE");
    assert.notEqual(floorOnly.find((i) => i.id === "floor-tables")?.status, "COMPLETE");

    const both = model.evaluateOpeningReadiness(
      baseSignals({
        readinessReport: {
          readinessGrade: "BLOCKED",
          checks: { ...emptyChecks(), floorConfigured: true, tablesConfigured: true },
          blockers: [],
        },
      }),
    );
    assert.equal(both.find((i) => i.id === "floor-plan")?.status, "COMPLETE");
    assert.equal(both.find((i) => i.id === "floor-tables")?.status, "COMPLETE");
  });

  it("booking policy COMPLETE only when bookingPolicyConfigured", () => {
    const draft = model.evaluateOpeningReadiness(baseSignals());
    assert.notEqual(draft.find((i) => i.id === "booking-policy")?.status, "COMPLETE");

    const active = model.evaluateOpeningReadiness(
      baseSignals({
        readinessReport: {
          readinessGrade: "BLOCKED",
          checks: { ...emptyChecks(), bookingPolicyConfigured: true },
          blockers: [],
        },
      }),
    );
    assert.equal(active.find((i) => i.id === "booking-policy")?.status, "COMPLETE");
  });

  it("API error = ERROR and network = OFFLINE", () => {
    const errored = model.evaluateOpeningReadiness(
      baseSignals({ readinessError: true, readinessReport: null }),
    );
    assert.ok(errored.some((i) => i.status === "ERROR"));

    const offline = model.evaluateOpeningReadiness(
      baseSignals({ readinessOffline: true, readinessReport: null }),
    );
    assert.ok(offline.some((i) => i.status === "OFFLINE"));
  });

  it("percentage recalculates dynamically; denominator from registry", () => {
    const emptyPct = model.computeOpeningPercentage(model.evaluateOpeningReadiness(baseSignals()));
    const filledChecks = {
      ...emptyChecks(),
      phone: true,
      operatingHours: true,
      menuAssigned: true,
      branchManagerAssigned: true,
      cashierAssigned: true,
      kitchenAssigned: true,
      riderAssigned: true,
      hostAssigned: true,
      waiterAssigned: true,
      customerSupportAssigned: true,
      floorConfigured: true,
      tablesConfigured: true,
      bookingPolicyConfigured: true,
    };
    const filledPct = model.computeOpeningPercentage(
      model.evaluateOpeningReadiness(
        baseSignals({
          readinessReport: { readinessGrade: "BLOCKED", checks: filledChecks, blockers: [] },
        }),
      ),
    );
    assert.ok(filledPct.completed > emptyPct.completed);
    assert.equal(filledPct.total, emptyPct.total);
    assert.ok(filledPct.total >= 50);
  });

  it("keeps exactly 14 AI agents", () => {
    assert.equal(team.MIANX_AGENT_REGISTRY.length, 14);
  });

  it("Northern Bypass remains coming-soon in signals contract", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    assert.ok(items.length > 0);
    assert.equal(baseSignals().northernBypassStatus, "coming-soon");
  });
});
