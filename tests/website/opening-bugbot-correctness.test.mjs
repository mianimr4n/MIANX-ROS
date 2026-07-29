/**
 * PR #112 Bugbot corrective regressions — eight exact correctness findings.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const modelUrl = pathToFileURL(join(root, "apps/website/client/src/lib/opening-readiness-model.ts")).href;
const teamUrl = pathToFileURL(join(root, "apps/website/client/src/lib/mianx-team.ts")).href;
const evidenceUrl = pathToFileURL(join(root, "apps/website/client/src/lib/opening-release-evidence.ts")).href;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const model = await import(modelUrl);
const team = await import(teamUrl);
const evidence = await import(evidenceUrl);

function baseSignals(overrides = {}) {
  return {
    nowIso: "2026-07-28T00:00:00.000Z",
    branchCode: "royal-orchard",
    branchStatus: "operating",
    northernBypassStatus: "coming-soon",
    readinessReport: {
      readinessGrade: "BLOCKED",
      checks: {
        phone: true,
        operatingHours: true,
        branchManagerAssigned: false,
        cashierAssigned: false,
        hostAssigned: false,
        waiterAssigned: false,
        kitchenAssigned: false,
        riderAssigned: false,
        statusOperating: true,
        floorConfigured: false,
        bookingPolicyConfigured: false,
        menuAssigned: true,
        posReady: false,
        kdsReady: false,
        deliveryReady: false,
        paymentConfigured: false,
        notificationConfigured: false,
        deviceVerified: false,
      },
      blockers: [],
    },
    readinessError: false,
    readinessOffline: false,
    reservationsOk: true,
    waitlistOk: true,
    healthOk: true,
    healthError: false,
    healthOffline: false,
    rollbackRunbookPresent: true,
    incidentRunbookPresent: true,
    ...overrides,
  };
}

describe("Bugbot #1 — Exec null-signal inflation", () => {
  it("successful zero does not become UNAVAILABLE and null does not earn COMPLETE", () => {
    const withNull = model.evaluateOpeningReadiness(
      baseSignals({ reservationsOk: null, waitlistOk: null, healthOk: null }),
    );
    assert.equal(withNull.find((i) => i.id === "reservations-route").status, "UNAVAILABLE");
    assert.equal(withNull.find((i) => i.id === "reliability-api").status, "UNAVAILABLE");
    assert.notEqual(withNull.find((i) => i.id === "reservations-route").status, "COMPLETE");

    const withZeroOk = model.evaluateOpeningReadiness(baseSignals({ reservationsOk: true, waitlistOk: true }));
    assert.equal(withZeroOk.find((i) => i.id === "reservations-route").status, "COMPLETE");
  });

  it("UNAVAILABLE does not inflate critical blockers; ERROR/OFFLINE stay honest", () => {
    const nullSignals = model.evaluateOpeningReadiness(
      baseSignals({ reservationsOk: null, waitlistOk: null, healthOk: null }),
    );
    const loaded = model.evaluateOpeningReadiness(baseSignals());
    // Null health/reservations must not invent extra critical blockers vs loaded success path.
    assert.ok(model.criticalBlockerCount(nullSignals) <= model.criticalBlockerCount(loaded) + 0);
    for (const item of nullSignals.filter((i) => i.status === "UNAVAILABLE")) {
      assert.ok(
        !(
          item.requiredForOpening &&
          (item.blockingSeverity === "critical" || item.blockingSeverity === "high") &&
          model.criticalBlockerCount([item]) > 0
        ),
      );
    }

    const errored = model.evaluateOpeningReadiness(
      baseSignals({ healthError: true, healthOk: null, healthOffline: false }),
    );
    assert.equal(errored.find((i) => i.id === "reliability-api").status, "ERROR");
    const offline = model.evaluateOpeningReadiness(
      baseSignals({ healthOffline: true, healthOk: null, healthError: false }),
    );
    assert.equal(offline.find((i) => i.id === "reliability-api").status, "OFFLINE");
  });

  it("Exec bridge fetches shared signals and does not hardcode runbook true", () => {
    const bridge = read("apps/website/client/src/components/admin/dashboard/OpeningExecSummaryBridge.tsx");
    assert.match(bridge, /listReservations/);
    assert.match(bridge, /listWaitlist/);
    assert.match(bridge, /fetchSystemHealth/);
    assert.match(bridge, /getOpeningReleaseEvidence/);
    assert.doesNotMatch(bridge, /rollbackRunbookPresent:\s*true/);
    assert.doesNotMatch(bridge, /incidentRunbookPresent:\s*true/);
  });
});

describe("Bugbot #2 — Hardcoded runbook completion", () => {
  it("documented runbooks are ACTIVE not COMPLETE; missing docs are BLOCKED", () => {
    const documented = model.evaluateOpeningReadiness(baseSignals());
    assert.equal(documented.find((i) => i.id === "reliability-rollback").status, "ACTIVE");
    assert.equal(documented.find((i) => i.id === "reliability-incident").status, "ACTIVE");
    assert.match(documented.find((i) => i.id === "reliability-rollback").problem, /documented/i);
    assert.match(documented.find((i) => i.id === "reliability-rollback").problem, /verification still required/i);

    const missing = model.evaluateOpeningReadiness(
      baseSignals({ rollbackRunbookPresent: false, incidentRunbookPresent: false }),
    );
    assert.equal(missing.find((i) => i.id === "reliability-rollback").status, "BLOCKED");
    assert.equal(missing.find((i) => i.id === "reliability-incident").status, "BLOCKED");

    const undefinedFlags = model.evaluateOpeningReadiness(
      baseSignals({ rollbackRunbookPresent: undefined, incidentRunbookPresent: undefined }),
    );
    assert.equal(undefinedFlags.find((i) => i.id === "reliability-rollback").status, "BLOCKED");
  });

  it("ops SOPs stay WAITING_ON_HUMAN when only documentation exists", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    for (const id of [
      "ops-order-confirm-sop",
      "ops-kitchen-sop",
      "ops-delivery-sop",
      "ops-cancel-refund-sop",
      "ops-opening-checklist",
      "ops-closing-checklist",
      "training-e2e",
    ]) {
      assert.equal(items.find((i) => i.id === id).status, "WAITING_ON_HUMAN", id);
    }
  });

  it("release-evidence paths exist and percentage drops without fake COMPLETE runbooks", () => {
    for (const path of Object.values(evidence.OPENING_DOCUMENTED_RUNBOOK_PATHS)) {
      assert.ok(existsSync(join(root, path)), path);
    }
    const flags = evidence.getOpeningReleaseEvidence();
    assert.equal(flags.rollbackRunbookDocumented, true);
    const pct = model.computeOpeningPercentage(model.evaluateOpeningReadiness(baseSignals()));
    assert.ok(pct.completed < pct.total);
    // Hardcoded COMPLETE flags must be absent from consumers.
    for (const file of [
      "apps/website/client/src/pages/admin/AdminAiTeam.tsx",
      "apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx",
      "apps/website/client/src/components/admin/dashboard/OpeningExecSummaryBridge.tsx",
    ]) {
      assert.doesNotMatch(read(file), /rollbackRunbookPresent:\s*true/);
    }
  });
});

describe("Bugbot #3–6 — Agent metric honesty", () => {
  it("order agent never falls back to activeOrders and labels pending confirmation", () => {
    const ai = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.doesNotMatch(ai, /statusCounts\?\.pending\s*\?\?\s*kpis\?\.activeOrders/);
    assert.match(ai, /statusCounts\?\.pending/);

    const cards = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 1,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 0,
      deliveriesProvisional: 1,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: "BLOCKED",
      openingError: false,
      healthOk: true,
      healthError: false,
      healthOffline: false,
      isSuperAdmin: true,
      readinessItems: model.evaluateOpeningReadiness(baseSignals()),
      openingPercentage: model.computeOpeningPercentage(model.evaluateOpeningReadiness(baseSignals())),
    });
    const order = cards.find((c) => c.id === "order-control");
    assert.match(order.verifiedSignal, /Pending customer confirmation: 1/);
    assert.doesNotMatch(order.verifiedSignal, /activeOrders|kitchen queue|active delivery/i);
  });

  it("kitchen agent uses actual kitchen ticket counts and ERROR on failure", () => {
    const ai = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.match(ai, /listKitchenTickets/);
    assert.doesNotMatch(ai, /kitchenTickets:\s*opsFailed \? null : \(kpis\?\.kitchenWaiting/);

    const ok = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 0,
      ordersError: false,
      kitchenTickets: 2,
      kitchenError: false,
      deliveriesActive: 0,
      deliveriesProvisional: 0,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: null,
      openingError: false,
      healthOk: true,
      healthError: false,
      isSuperAdmin: true,
      readinessItems: model.evaluateOpeningReadiness(baseSignals()),
    });
    assert.match(ok.find((c) => c.id === "kitchen-control").verifiedSignal, /Actual kitchen tickets: 2/);

    const err = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: null,
      ordersError: true,
      kitchenTickets: null,
      kitchenError: true,
      deliveriesActive: null,
      deliveriesProvisional: null,
      deliveryError: true,
      reservationsCount: null,
      reservationsError: false,
      waitlistCount: null,
      waitlistError: false,
      openingGrade: null,
      openingError: false,
      healthOk: null,
      healthError: false,
      isSuperAdmin: true,
    });
    assert.equal(err.find((c) => c.id === "kitchen-control").status, "ERROR");
    assert.doesNotMatch(err.find((c) => c.id === "kitchen-control").verifiedSignal, /LIVE 0|tickets: 0/i);
  });

  it("delivery agent distinguishes active dispatched vs provisional", () => {
    const ai = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.match(ai, /listDeliveryAssignments/);
    assert.match(ai, /isProvisionalDelivery/);
    assert.doesNotMatch(ai, /deliveriesActive:\s*opsFailed \? null : \(kpis\?\.activeDeliveries/);

    const cards = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 1,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 1,
      deliveriesProvisional: 2,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: null,
      openingError: false,
      healthOk: true,
      healthError: false,
      isSuperAdmin: true,
      readinessItems: model.evaluateOpeningReadiness(baseSignals()),
    });
    const delivery = cards.find((c) => c.id === "delivery-control");
    assert.match(delivery.verifiedSignal, /Active dispatched deliveries: 1/);
    assert.match(delivery.verifiedSignal, /Provisional delivery records: 2/);
    assert.doesNotMatch(delivery.verifiedSignal, /Active dispatch \(assigned\/picked-up\)/);
  });

  it("health OFFLINE is not labeled as API error", () => {
    const offline = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 0,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 0,
      deliveriesProvisional: 0,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: null,
      openingError: false,
      healthOk: null,
      healthError: false,
      healthOffline: true,
      isSuperAdmin: true,
    });
    const reliability = offline.find((c) => c.id === "reliability-deployment");
    assert.equal(reliability.status, "OFFLINE");
    assert.match(reliability.verifiedSignal, /OFFLINE/);
    assert.doesNotMatch(reliability.verifiedSignal, /error/i);

    const errored = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 0,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 0,
      deliveriesProvisional: 0,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: null,
      openingError: false,
      healthOk: null,
      healthError: true,
      healthOffline: false,
      isSuperAdmin: true,
    });
    assert.equal(errored.find((c) => c.id === "reliability-deployment").status, "ERROR");
  });
});

describe("Bugbot #7 — Opening Readiness Lead uses shared model", () => {
  it("ignores empty API blockers when shared model has critical/waiting items", () => {
    const items = model.evaluateOpeningReadiness(baseSignals({ readinessReport: { ...baseSignals().readinessReport, blockers: [] } }));
    assert.ok(model.criticalBlockerCount(items) > 0);
    assert.ok(model.waitingOnHumanCount(items) > 0);
    const next = model.buildOwnerDecisionQueue(items, "Royal Orchard")[0];

    const cards = team.buildMianxAgentCards({
      nowIso: "2026-07-28T00:00:00.000Z",
      branchLabel: "Royal Orchard",
      branchStatus: "operating",
      northernBypassStatus: "coming-soon",
      ordersPending: 0,
      ordersError: false,
      kitchenTickets: 0,
      kitchenError: false,
      deliveriesActive: 0,
      deliveriesProvisional: 0,
      deliveryError: false,
      reservationsCount: 0,
      reservationsError: false,
      waitlistCount: 0,
      waitlistError: false,
      openingGrade: "BLOCKED",
      openingBlockers: 0,
      openingError: false,
      healthOk: true,
      healthError: false,
      isSuperAdmin: true,
      readinessItems: items,
      openingPercentage: model.computeOpeningPercentage(items),
      openingCriticalBlockers: model.criticalBlockerCount(items),
      openingWaitingOnHuman: model.waitingOnHumanCount(items),
      openingNextDecision: next,
    });
    const lead = cards.find((c) => c.id === "opening-readiness");
    assert.equal(lead.status, "WAITING_ON_HUMAN");
    assert.match(lead.verifiedSignal, /critical blockers/);
    // Governance decision: Founder approval nextAction takes priority over the top Owner
    // Decision Queue item whenever founder approval isn't COMPLETE — "human governance
    // supersedes operations" is a core Telepizza ROS / Mianx.ai governance principle.
    assert.match(
      lead.nextAction,
      /Review readiness evidence and record an immutable Founder decision/i,
      "When Founder approval is not COMPLETE, it must take priority over the top Owner Decision Queue item.",
    );
    assert.doesNotMatch(lead.verifiedSignal, /blockers 0/);
  });

  it("Northern Bypass does not inherit Royal Orchard readiness helpers in AI Team", () => {
    const page = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.match(page, /comingSoonSelected/);
    assert.match(page, /Royal Orchard opening percentage is not inherited/);
  });
});

describe("Bugbot #8 — Forbidden-role validator", () => {
  it("rejects forbidden role assignment patterns and accepts clean copy", () => {
    assert.equal(model.assertNoForbiddenRolesInReadinessCopy('role: "branch-manager"'), true);
    assert.equal(model.assertNoForbiddenRolesInReadinessCopy('role_code: owner'), false);
    assert.equal(model.assertNoForbiddenRolesInReadinessCopy("roles include `founder`"), false);
    assert.equal(model.assertNoForbiddenRolesInReadinessCopy("Founder go/no-go decision"), true);
    assert.equal(model.assertNoForbiddenRolesInReadinessCopy("gov-owner-handover"), true);
    model.validateOpeningReadinessRegistryCopy();
  });
});

describe("Branch isolation and percentage honesty", () => {
  it("recalculates percentage without runbook COMPLETE inflation", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    const pct = model.computeOpeningPercentage(items);
    const completeIds = items
      .filter((i) => i.requiredForOpening && i.contributesToPercentage && i.status === "COMPLETE")
      .map((i) => i.id);
    assert.ok(!completeIds.includes("reliability-rollback"));
    assert.ok(!completeIds.includes("reliability-incident"));
    assert.equal(pct.completed, completeIds.length);
    assert.match(pct.label, new RegExp(`${pct.completed} of ${pct.total}`));
  });
});
