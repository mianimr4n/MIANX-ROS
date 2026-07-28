/**
 * Owner opening command center — readiness registry, percentage, Owner queue.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const modelUrl = pathToFileURL(
  join(root, "apps/website/client/src/lib/opening-readiness-model.ts"),
).href;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const model = await import(modelUrl);

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
      blockers: [{ code: "MANAGER_MISSING", message: "No manager" }],
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

describe("Readiness registry", () => {
  it("has unique IDs, next actions, source types, and no forbidden roles", () => {
    const ids = model.OPENING_READINESS_DEFINITIONS.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const def of model.OPENING_READINESS_DEFINITIONS) {
      assert.ok(def.nextAction || def.defaultNextAction);
      assert.ok(def.defaultNextAction.length > 8);
      assert.ok(def.sourceType);
      assert.ok(model.assertNoForbiddenRolesInReadinessCopy(JSON.stringify(def)));
    }
    const items = model.evaluateOpeningReadiness(baseSignals());
    for (const item of items) {
      if (item.status !== "COMPLETE") {
        assert.ok(item.problem && item.problem !== "None.", `missing problem for ${item.id}`);
        assert.ok(item.nextAction.length > 5, `missing next action for ${item.id}`);
      }
    }
  });

  it("preserves canonical people roles only", () => {
    assert.deepEqual([...model.OPENING_CANONICAL_PEOPLE_ROLES], [
      "branch-manager",
      "cashier",
      "kitchen",
      "rider",
      "host",
      "waiter",
      "customer-support",
    ]);
    for (const code of model.OPENING_FORBIDDEN_ROLE_CODES) {
      assert.ok(!model.OPENING_CANONICAL_PEOPLE_ROLES.includes(code));
    }
  });
});

describe("Opening percentage contract", () => {
  it("counts COMPLETE only; BLOCKED/WAITING/FOUNDATION do not earn credit", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    const pct = model.computeOpeningPercentage(items);
    assert.ok(pct.total > 0);
    assert.equal(pct.live, true);
    assert.match(pct.label, /of \d+ required checks complete/);
    assert.equal(pct.completed, items.filter((i) => i.requiredForOpening && i.contributesToPercentage && i.status === "COMPLETE").length);
    const blocked = items.filter((i) => i.status === "WAITING_ON_HUMAN" || i.status === "BLOCKED");
    assert.ok(blocked.length > 0);
    // phone/hours/status/menu/northern/reservations/waitlist/health may complete;
    // documented runbooks stay ACTIVE (not COMPLETE) until operationally verified.
    assert.ok(pct.percent != null && pct.percent < 100);
  });

  it("optional items do not reduce denominator", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    const optional = items.filter((i) => !i.requiredForOpening || !i.contributesToPercentage);
    assert.ok(optional.some((i) => i.id === "gov-owner-handover"));
    const pct = model.computeOpeningPercentage(items);
    const required = items.filter((i) => i.requiredForOpening && i.contributesToPercentage);
    assert.equal(pct.total, required.length);
  });

  it("API error prevents misleading LIVE percentage", () => {
    const items = model.evaluateOpeningReadiness(baseSignals({ readinessError: true, readinessReport: null }));
    const pct = model.computeOpeningPercentage(items, { readinessError: true });
    assert.equal(pct.live, false);
    assert.equal(pct.error, true);
    assert.equal(pct.percent, null);
    assert.match(pct.label, /ERROR/);
  });

  it("handles zero denominator safely", () => {
    const pct = model.computeOpeningPercentage([]);
    assert.equal(pct.percent, null);
    assert.equal(pct.total, 0);
  });
});

describe("Royal Orchard and Northern Bypass", () => {
  it("marks phone/hours/menu/status complete without inventing staff", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    assert.equal(items.find((i) => i.id === "branch-phone").status, "COMPLETE");
    assert.equal(items.find((i) => i.id === "branch-hours").status, "COMPLETE");
    assert.equal(items.find((i) => i.id === "menu-assigned").status, "COMPLETE");
    assert.equal(items.find((i) => i.id === "branch-status-operating").status, "COMPLETE");
    assert.equal(items.find((i) => i.id === "people-branch-manager").status, "WAITING_ON_HUMAN");
    assert.equal(items.find((i) => i.id === "payments-provider").status, "WAITING_ON_HUMAN");
    assert.equal(items.find((i) => i.id === "device-pos").status, "WAITING_ON_HUMAN");
    assert.doesNotMatch(JSON.stringify(items), /test@|fake staff|invented/i);
  });

  it("keeps Northern Bypass coming-soon without Royal Orchard % leakage helpers", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    const nb = items.find((i) => i.id === "gov-northern-bypass");
    assert.equal(nb.status, "COMPLETE");
    assert.match(nb.problem, /coming-soon/i);
    const page = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.match(page, /comingSoonSelected/);
    assert.match(page, /Royal Orchard opening percentage is not inherited/);
  });
});

describe("Owner decision queue", () => {
  it("lists unresolved decisions in priority order with next actions", () => {
    const items = model.evaluateOpeningReadiness(baseSignals());
    const queue = model.buildOwnerDecisionQueue(items, "Royal Orchard");
    assert.ok(queue.length > 0);
    assert.equal(queue[0].id, "people-staff-bundle");
    assert.equal(queue[0].priority, 1);
    for (const d of queue) {
      assert.ok(d.nextAction.length > 8);
      assert.equal(d.humanRequired, true);
    }
    const ids = queue.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
    const completed = model.recentlyCompletedItems(items);
    for (const c of completed) {
      assert.ok(!queue.some((d) => d.id === c.id));
    }
  });
});

describe("AI Team and dashboard wiring", () => {
  it("keeps exactly 14 agents and consumes shared readiness model", () => {
    const registry = read("apps/website/client/src/lib/mianx-team.ts");
    const ids = [...registry.matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, 14);
    assert.equal(new Set(ids).size, 14);
    assert.match(registry, /readinessItems/);
    assert.match(registry, /openingPercentage/);
    assert.doesNotMatch(registry, /working now|background workforce spinning/i);
    assert.doesNotMatch(registry, /readinessPct/);
  });

  it("Executive and Branch surfaces use honest CTAs", () => {
    const summary = read("apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx");
    assert.match(summary, /Open Mianx\.ai Team/);
    assert.match(summary, /Review opening plan/);
    assert.doesNotMatch(summary, /Complete opening readiness/);
    const branch = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");
    assert.match(branch, /Open Mianx\.ai Team/);
    assert.doesNotMatch(branch, /title="Complete opening readiness"/);
    const ai = read("apps/website/client/src/pages/admin/AdminAiTeam.tsx");
    assert.match(ai, /OwnerDecisionQueueView/);
    assert.match(ai, /OpeningPercentageBanner/);
    assert.match(ai, /data-testid="mianx-agent-grid"/);
  });
});

describe("Documentation updates", () => {
  it("documents software vs operational readiness and percentage contract", () => {
    const plan = read("docs/14-phases/OPENING_READINESS_PLAN.md");
    assert.match(plan, /software|Software/i);
    assert.match(plan, /operational/i);
    assert.match(plan, /percentage|denominator/i);
    const matrix = read("docs/12-quality/ACCEPTANCE_MATRIX.md");
    assert.match(matrix, /opening|Owner/i);
  });
});
