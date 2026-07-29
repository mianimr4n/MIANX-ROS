/**
 * Opening Operations M4 — staff seed / live config / dry-run readiness truth.
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
    founderGoApproved: false,
    founderGoFailed: false,
    ownerHandoverReady: false,
    staffSeedSimulated: false,
    staffSeedFailed: false,
    liveConfigCaptured: false,
    dryRunLocalPassed: false,
    dryRunProductionComplete: false,
    dryRunFailed: false,
    dryRunGoRecorded: false,
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

describe("opening M4 dry-run readiness", () => {
  it("registers staff seed, live config, and dry-run items", () => {
    const ids = model.OPENING_READINESS_DEFINITIONS.map((d) => d.id);
    assert.ok(ids.includes("gov-staff-seed"));
    assert.ok(ids.includes("gov-live-config"));
    assert.ok(ids.includes("gov-dry-run"));
  });

  it("missing staff seed waits on human", () => {
    const items = model.evaluateOpeningReadiness(withChecks({}));
    assert.equal(items.find((i) => i.id === "gov-staff-seed")?.status, "WAITING_ON_HUMAN");
  });

  it("simulated staff seed becomes COMPLETE for local workflow item", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ staffSeedSimulated: true }));
    assert.equal(items.find((i) => i.id === "gov-staff-seed")?.status, "COMPLETE");
  });

  it("failed staff seed becomes BLOCKED", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ staffSeedFailed: true }));
    assert.equal(items.find((i) => i.id === "gov-staff-seed")?.status, "BLOCKED");
  });

  it("live config snapshot becomes COMPLETE when captured", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ liveConfigCaptured: true }));
    assert.equal(items.find((i) => i.id === "gov-live-config")?.status, "COMPLETE");
  });

  it("local dry-run pass is ACTIVE not Production COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ dryRunLocalPassed: true }));
    assert.equal(items.find((i) => i.id === "gov-dry-run")?.status, "ACTIVE");
  });

  it("production dry-run complete becomes COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ dryRunProductionComplete: true }));
    assert.equal(items.find((i) => i.id === "gov-dry-run")?.status, "COMPLETE");
  });

  it("failed dry-run becomes BLOCKED", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ dryRunFailed: true }));
    assert.equal(items.find((i) => i.id === "gov-dry-run")?.status, "BLOCKED");
  });

  it("percentage recalculates dynamically", () => {
    const emptyPct = model.computeOpeningPercentage(model.evaluateOpeningReadiness(withChecks({})));
    const richer = model.evaluateOpeningReadiness(
      withChecks({
        staffSeedSimulated: true,
        liveConfigCaptured: true,
        dryRunProductionComplete: true,
      }),
    );
    const richerPct = model.computeOpeningPercentage(richer);
    assert.ok(richerPct.completed > emptyPct.completed);
  });

  it("keeps fourteen agents and dry-run panel never shows passwords", () => {
    assert.equal(team.MIANX_AGENT_REGISTRY.length, 14);
    const panel = readFileSync(
      join(root, "apps/website/client/src/components/admin/OpeningDryRunPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Passwords never shown/);
    assert.doesNotMatch(panel, /roleCode:\s*["']owner["']/);
    assert.doesNotMatch(panel, /tempPassword/);
  });

  it("migration forbids plaintext password columns", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/20260729030000_opening_m4_staff_seed_dry_run.sql"),
      "utf8",
    );
    assert.match(migration, /password_fingerprint/);
    assert.doesNotMatch(migration, /temp_password\s+text/i);
    assert.match(migration, /immutable/i);
    assert.match(migration, /OPENING_M4|Production apply requires explicit Founder auth/i);
  });
});
