/**
 * Opening Operations M2 — payments / notifications / devices readiness truth.
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
    paymentMethodsConfigured: false,
    paymentProviderVerified: false,
    cardTerminalVerified: false,
    cashProcedureApproved: false,
    notifCustomerConfigured: false,
    notifKitchenConfigured: false,
    notifRiderConfigured: false,
    notifEscalationConfigured: false,
    devicePosVerified: false,
    deviceKdsVerified: false,
    devicePrinterVerified: false,
    deviceCardTerminalVerified: false,
    deviceRiderVerified: false,
    deviceInternetVerified: false,
    deviceBackupInternetVerified: false,
    deviceUpsVerified: false,
    paymentProviderFailed: false,
    cardTerminalFailed: false,
    cashProcedureFailed: false,
    notifCustomerFailed: false,
    notifKitchenFailed: false,
    notifRiderFailed: false,
    notifEscalationFailed: false,
    devicePosFailed: false,
    deviceKdsFailed: false,
    devicePrinterFailed: false,
    deviceCardTerminalFailed: false,
    deviceRiderFailed: false,
    deviceInternetFailed: false,
    deviceBackupInternetFailed: false,
    deviceUpsFailed: false,
  };
}

function baseSignals(overrides = {}) {
  return {
    nowIso: "2026-07-29T12:00:00.000Z",
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

function withChecks(partial) {
  return baseSignals({
    readinessReport: {
      readinessGrade: "BLOCKED",
      checks: { ...emptyChecks(), ...partial },
      blockers: [],
    },
  });
}

describe("opening M2 payments notifications devices readiness", () => {
  it("configured payment methods without provider stay ACTIVE for provider item", () => {
    const items = model.evaluateOpeningReadiness(
      withChecks({ paymentMethodsConfigured: true, paymentProviderVerified: false }),
    );
    assert.equal(items.find((i) => i.id === "payments-methods-decided")?.status, "COMPLETE");
    assert.equal(items.find((i) => i.id === "payments-provider")?.status, "ACTIVE");
  });

  it("verified provider becomes COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(
      withChecks({ paymentMethodsConfigured: true, paymentProviderVerified: true }),
    );
    assert.equal(items.find((i) => i.id === "payments-provider")?.status, "COMPLETE");
  });

  it("unverified card terminal remains WAITING_ON_HUMAN", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ paymentProviderVerified: true }));
    assert.equal(items.find((i) => i.id === "payments-card-terminal")?.status, "WAITING_ON_HUMAN");
  });

  it("failed card terminal becomes BLOCKED", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ cardTerminalFailed: true }));
    assert.equal(items.find((i) => i.id === "payments-card-terminal")?.status, "BLOCKED");
  });

  it("missing notification config remains WAITING_ON_HUMAN", () => {
    const items = model.evaluateOpeningReadiness(withChecks({}));
    assert.equal(items.find((i) => i.id === "notif-customer")?.status, "WAITING_ON_HUMAN");
  });

  it("failed notification becomes BLOCKED", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ notifCustomerFailed: true }));
    assert.equal(items.find((i) => i.id === "notif-customer")?.status, "BLOCKED");
  });

  it("verified device becomes COMPLETE", () => {
    const items = model.evaluateOpeningReadiness(withChecks({ devicePosVerified: true }));
    assert.equal(items.find((i) => i.id === "device-pos")?.status, "COMPLETE");
  });

  it("API error = ERROR and network = OFFLINE", () => {
    const errored = model.evaluateOpeningReadiness(
      baseSignals({ readinessError: true, readinessReport: null }),
    );
    assert.equal(errored.find((i) => i.id === "payments-provider")?.status, "ERROR");
    const offline = model.evaluateOpeningReadiness(
      baseSignals({ readinessOffline: true, readinessReport: null }),
    );
    assert.equal(offline.find((i) => i.id === "device-pos")?.status, "OFFLINE");
  });

  it("percentage recalculates dynamically without hardcoded totals", () => {
    const emptyPct = model.computeOpeningPercentage(model.evaluateOpeningReadiness(withChecks({})));
    const richer = model.evaluateOpeningReadiness(
      withChecks({
        paymentMethodsConfigured: true,
        paymentProviderVerified: true,
        cardTerminalVerified: true,
        cashProcedureApproved: true,
        notifCustomerConfigured: true,
        devicePosVerified: true,
      }),
    );
    const richerPct = model.computeOpeningPercentage(richer);
    assert.ok(richerPct.completed > emptyPct.completed);
    assert.equal(typeof richerPct.percent, "number");
    assert.ok(richerPct.total > 0);
  });

  it("exactly fourteen Mianx agents remain", () => {
    assert.equal(team.MIANX_AGENT_REGISTRY.length, 14);
  });

  it("UI panel labels local verification honestly", () => {
    const panel = readFileSync(
      join(root, "apps/website/client/src/components/admin/OpeningOperationsPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Local verification only/);
    assert.match(panel, /Never claims WhatsApp CONNECTED|never claim WhatsApp Connected/i);
    assert.doesNotMatch(panel, /status:\s*["']CONNECTED["']/i);
  });

  it("migration forbids secret columns", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/20260729010000_opening_m2_payments_notifications_devices.sql"),
      "utf8",
    );
    const ddl = migration.replace(/--[^\n]*/g, "");
    assert.doesNotMatch(ddl, /\bapi_key\b/i);
    assert.doesNotMatch(ddl, /\bpassword\b/i);
    assert.doesNotMatch(ddl, /\bcvv\b/i);
  });
});
