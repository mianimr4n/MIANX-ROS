/**
 * Opening Operations M3 — SOP / training / Founder / handover readiness truth.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

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
    sopOrderConfirmApproved: false,
    sopOrderConfirmReviewed: false,
    sopOrderConfirmFailed: false,
    sopKitchenApproved: false,
    sopKitchenReviewed: false,
    sopKitchenFailed: false,
    sopDeliveryApproved: false,
    sopDeliveryReviewed: false,
    sopDeliveryFailed: false,
    sopCancelRefundApproved: false,
    sopCancelRefundReviewed: false,
    sopCancelRefundFailed: false,
    sopOpeningChecklistApproved: false,
    sopOpeningChecklistFailed: false,
    sopClosingChecklistApproved: false,
    sopClosingChecklistFailed: false,
    trainingBmComplete: false,
    trainingBmFailed: false,
    trainingCashierComplete: false,
    trainingCashierFailed: false,
    trainingKitchenComplete: false,
    trainingKitchenFailed: false,
    trainingRiderComplete: false,
    trainingRiderFailed: false,
    trainingHostWaiterComplete: false,
    trainingHostWaiterFailed: false,
    e2eRehearsalComplete: false,
    e2eRehearsalFailed: false,
    founderGoApproved: false,
    founderGoFailed: false,
    ownerHandoverReady: false,
  };
}

function withChecks(partial) {
  return {
    nowIso: "2026-07-29T12:00:00.000Z",
    branchCode: "royal-orchard",
    branchStatus: "operating",
    northernBypassStatus: "coming-soon",
    readinessReport: {
      readinessGrade: "BLOCKED",
      checks: { ...emptyChecks(), ...partial },
      blockers: [],
    },
    readinessError: false,
    readinessOffline: false,
    reservationsOk: true,
    waitlistOk: true,
    healthOk: true,
    healthError: false,
    healthOffline: false,
  };
}

describe("opening M3 governance readiness", () => {
  it("documentation alone does not complete SOP", () => {
    const items = model.evaluateOpeningReadiness(withChecks({}));
    assert.equal(items.find((i) => i.id === "ops-order-confirm-sop")?.status, "WAITING_ON_HUMAN");
  });

  it("reviewed SOP becomes ACTIVE when configured probe true", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ sopOrderConfirmReviewed: true }));
    assert.equal(items.find((i) => i.id === "ops-order-confirm-sop")?.status, "ACTIVE");
  });

  it("approved+verified SOP becomes COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ sopOrderConfirmApproved: true }));
    assert.equal(items.find((i) => i.id === "ops-order-confirm-sop")?.status, "COMPLETE");
  });

  it("failed training becomes BLOCKED", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ trainingBmFailed: true }));
    assert.equal(items.find((i) => i.id === "training-bm")?.status, "BLOCKED");
  });

  it("passed rehearsal becomes COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ trainingCashierComplete: true }));
    assert.equal(items.find((i) => i.id === "training-cashier")?.status, "COMPLETE");
  });

  it("incomplete e2e does not count", () => {
    const items = model.evaluateOpeningReadiness(withChecks({}));
    assert.notEqual(items.find((i) => i.id === "training-e2e")?.status, "COMPLETE");
  });

  it("Founder GO_APPROVED only when probe true", () => {
    const waiting = model.evaluateOpeningReadiness(withChecks({}));
    assert.equal(waiting.find((i) => i.id === "gov-founder-approval")?.status, "WAITING_ON_HUMAN");
    const go = model.evaluateOpeningReadiness(withChecks({ founderGoApproved: true }));
    assert.equal(go.find((i) => i.id === "gov-founder-approval")?.status, "COMPLETE");
  });

  it("NO_GO blocks Founder item", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ founderGoFailed: true }));
    assert.equal(items.find((i) => i.id === "gov-founder-approval")?.status, "BLOCKED");
  });

  it("percentage recalculates dynamically", () => {
    const emptyPct = model.computeOpeningPercentage(model.evaluateOpeningReadiness(withChecks({})));
    const richer = model.evaluateOpeningReadiness(
      withChecks({
        sopOpeningChecklistApproved: true,
        trainingBmComplete: true,
        e2eRehearsalComplete: true,
        founderGoApproved: true,
      }),
    );
    const richerPct = model.computeOpeningPercentage(richer);
    assert.ok(richerPct.completed > emptyPct.completed);
  });

  it("keeps fourteen agents and no owner role in panel", () => {
    assert.equal(team.MIANX_AGENT_REGISTRY.length, 14);
    const panel = readFileSync(
      join(root, "apps/website/client/src/components/admin/OpeningGovernancePanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Local verification only/);
    assert.match(panel, /No `owner` role code/);
    assert.doesNotMatch(panel, /roleCode:\s*["']owner["']/);
    assert.doesNotMatch(panel, /roleCode:\s*["']founder["']/);
  });

  it("migration forbids owner role and secrets", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/20260729020000_opening_m3_sops_training_governance.sql"),
      "utf8",
    );
    const ddl = migration.replace(/--[^\n]*/g, "");
    assert.doesNotMatch(ddl, /'owner'/);
    assert.doesNotMatch(ddl, /\bpassword\b/i);
    assert.match(migration, /immutable/i);
  });
});
