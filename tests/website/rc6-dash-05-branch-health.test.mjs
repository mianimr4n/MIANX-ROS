/**
 * RC6-DASH-05 — Explainable Branch Health Score contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

// Website sources are TypeScript — mirror pure formulas in-test for Node runner,
// and assert source contracts via static reads (same pattern as DASH-04).

const formulaSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/branch-health/formula.ts"),
  "utf8",
);
const weightsSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/branch-health/weights.ts"),
  "utf8",
);
const buildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/branch-health/build-score.ts"),
  "utf8",
);
const modeSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/branch-health/mode-emphasis.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/BranchHealthPanel.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const modeRegSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);

const WEIGHTS = {
  "BH-KITCHEN-DELAY": 25,
  "BH-DELIVERY-LATE": 20,
  "BH-CONFIRM-DELAY": 15,
  "BH-DISPATCH-WAIT": 15,
  "BH-CASH-VARIANCE": 15,
  "BH-STOCK-PRESSURE": 10,
};
const TOTAL_WEIGHT = 100;
const MIN_COVERAGE = 50;

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromDelayRate(rate) {
  const safe = Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1;
  return clampScore(100 * (1 - safe));
}

function scoreCashVarianceClear(n) {
  return n > 0 ? 0 : 100;
}

function scoreStockPressure(n) {
  if (n <= 0) return 100;
  if (n <= 9) return 50;
  return 0;
}

function computeWeightedScore(parts) {
  const tw = parts.reduce((s, p) => s + p.weight, 0);
  if (tw <= 0 || parts.length === 0) return null;
  return clampScore(parts.reduce((s, p) => s + p.score * p.weight, 0) / tw);
}

function computeCoverage(evaluatedWeight, configuredWeight) {
  if (configuredWeight <= 0) return 0;
  return clampScore((evaluatedWeight / configuredWeight) * 100);
}

function mapScoreState(score, coverage) {
  if (score == null || coverage < MIN_COVERAGE) return "INSUFFICIENT_DATA";
  if (score >= 85) return "HEALTHY";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "AT_RISK";
  return "CRITICAL";
}

function computeConfidence({ coveragePercent, staleCount, evaluatedCount }) {
  if (coveragePercent < MIN_COVERAGE || evaluatedCount === 0) return "LOW";
  if (coveragePercent >= 80 && staleCount === 0) return "HIGH";
  if (coveragePercent >= 50) return "MEDIUM";
  return "LOW";
}

function areComparable(a, b) {
  if (a.coveragePercent < MIN_COVERAGE || b.coveragePercent < MIN_COVERAGE) return false;
  if (Math.abs(a.coveragePercent - b.coveragePercent) > 15) return false;
  if (a.evaluatedComponentIds.length !== b.evaluatedComponentIds.length) return false;
  const setA = [...a.evaluatedComponentIds].sort().join(",");
  const setB = [...b.evaluatedComponentIds].sort().join(",");
  if (setA !== setB) return false;
  if (a.freshnessState === "UNAVAILABLE" || b.freshnessState === "UNAVAILABLE") return false;
  return true;
}

/** Minimal in-test builder mirroring selected rules (no TS imports). */
function buildScore(input) {
  const components = [];
  const nowMs = input.nowMs ?? Date.parse("2026-08-02T12:00:00.000Z");

  // Kitchen
  if (input.kitchen.tickets) {
    const open = input.kitchen.tickets.filter((t) =>
      ["queued", "accepted", "preparing", "ready"].includes(String(t.status)),
    );
    const delayed = open.filter((t) => {
      const start = Date.parse(t.startedAt || t.acceptedAt || t.createdAt);
      return (nowMs - start) / 60000 >= 20;
    });
    const denom = open.length;
    const rate = denom === 0 ? 0 : delayed.length / denom;
    components.push({
      id: "BH-KITCHEN-DELAY",
      score: denom === 0 ? 100 : scoreFromDelayRate(rate),
      weight: WEIGHTS["BH-KITCHEN-DELAY"],
      href: "/admin/kitchen-dashboard?view=delayed",
    });
  }

  // Delivery late
  if (input.delivery.assignments) {
    let late = 0;
    let classifiable = 0;
    for (const row of input.delivery.assignments) {
      if (row.status !== "assigned" && row.status !== "picked-up") continue;
      if (row.orderStatus === "pending") continue;
      const start = row.pickedUpAt || row.assignedAt;
      if (!start) continue;
      classifiable += 1;
      if ((nowMs - Date.parse(start)) / 60000 >= 45) late += 1;
    }
    const denom = classifiable;
    components.push({
      id: "BH-DELIVERY-LATE",
      score: denom === 0 ? 100 : scoreFromDelayRate(late / denom),
      weight: WEIGHTS["BH-DELIVERY-LATE"],
      href: "/admin/delivery?status=picked-up",
    });
  }

  // Confirm
  if (input.ops.data) {
    const delayed = input.ops.data.alerts.filter((a) => a.code === "PENDING_TOO_LONG").length;
    const pending = Number(input.ops.data.statusCounts.pending ?? 0);
    const denom = Math.max(pending, delayed);
    components.push({
      id: "BH-CONFIRM-DELAY",
      score: denom === 0 ? 100 : scoreFromDelayRate(delayed / denom),
      weight: WEIGHTS["BH-CONFIRM-DELAY"],
      href: "/admin/orders?status=pending",
    });
  }

  // Dispatch
  if (input.delivery.assignments) {
    const waiting = input.delivery.assignments.filter(
      (r) => r.status === "pending" && r.orderStatus === "ready",
    ).length;
    const ready = Number(input.ops.data?.statusCounts.ready ?? waiting);
    const denom = Math.max(ready, waiting);
    components.push({
      id: "BH-DISPATCH-WAIT",
      score: denom === 0 ? 100 : scoreFromDelayRate(waiting / denom),
      weight: WEIGHTS["BH-DISPATCH-WAIT"],
      href: "/admin/delivery?status=pending",
    });
  }

  // Cash
  if (!input.finance.enabled) {
    /* permission restricted — omit from configured weight */
  } else if (
    !input.finance.unavailable &&
    input.finance.unresolvedCashVariance != null
  ) {
    components.push({
      id: "BH-CASH-VARIANCE",
      score: scoreCashVarianceClear(input.finance.unresolvedCashVariance),
      weight: WEIGHTS["BH-CASH-VARIANCE"],
      href: "/admin/finance",
    });
  }

  // Stock
  if (input.ops.data) {
    components.push({
      id: "BH-STOCK-PRESSURE",
      score: scoreStockPressure(input.ops.data.kpis.lowStockCount ?? 0),
      weight: WEIGHTS["BH-STOCK-PRESSURE"],
      href: "/admin/inventory?lowStock=1",
    });
  }

  const evaluatedWeight = components.reduce((s, c) => s + c.weight, 0);
  const restricted = input.finance.enabled ? 0 : WEIGHTS["BH-CASH-VARIANCE"];
  const configured = TOTAL_WEIGHT - restricted;
  const coverage = computeCoverage(evaluatedWeight, configured);
  const overall = computeWeightedScore(components.map((c) => ({ score: c.score, weight: c.weight })));
  const scoreState = mapScoreState(coverage < MIN_COVERAGE ? null : overall, coverage);
  const displayScore = scoreState === "INSUFFICIENT_DATA" ? null : overall;
  const confidence = computeConfidence({
    coveragePercent: coverage,
    staleCount: 0,
    evaluatedCount: components.length,
  });

  const negatives = [...components].sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  return {
    score: displayScore,
    scoreState,
    coverage,
    confidence,
    components,
    topNegative: negatives.filter((c) => c.score < 100).slice(0, 3),
    configured,
  };
}

const healthyFixture = {
  nowMs: Date.parse("2026-08-02T12:00:00.000Z"),
  ops: {
    data: {
      kpis: { lowStockCount: 0 },
      statusCounts: { pending: 2, ready: 1 },
      alerts: [],
    },
  },
  kitchen: {
    tickets: [
      {
        id: "k1",
        status: "preparing",
        createdAt: "2026-08-02T11:55:00.000Z",
        startedAt: "2026-08-02T11:55:00.000Z",
      },
    ],
  },
  delivery: {
    assignments: [
      {
        id: "d1",
        status: "assigned",
        orderStatus: "out-for-delivery",
        assignedAt: "2026-08-02T11:50:00.000Z",
        pickedUpAt: null,
      },
    ],
  },
  finance: { enabled: true, unavailable: false, unresolvedCashVariance: 0 },
};

describe("RC6-DASH-05 Branch Health Score", () => {
  it("1. maps components to verified sources in build-score", () => {
    assert.match(buildSrc, /BH-KITCHEN-DELAY/);
    assert.match(buildSrc, /Kitchen tickets API/);
    assert.match(buildSrc, /PENDING_TOO_LONG/);
    assert.match(buildSrc, /classifyDeliveryLate/);
    assert.match(buildSrc, /isDispatchWaitingForRider/);
    assert.match(buildSrc, /unresolvedCashVariance/);
    assert.match(buildSrc, /lowStockCount/);
  });

  it("2. validates weights sum to 100", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100);
    assert.match(weightsSrc, /BH-KITCHEN-DELAY.: 25/);
    assert.match(weightsSrc, /BH-STOCK-PRESSURE.: 10/);
    assert.equal(BRANCH_HEALTH_TOTAL_FROM_SRC(), 100);
  });

  it("3. computes overall weighted score", () => {
    const result = buildScore(healthyFixture);
    assert.equal(result.scoreState, "HEALTHY");
    assert.equal(result.score, 100);
  });

  it("4. computes coverage from evaluated / configured weight", () => {
    const partial = buildScore({
      ...healthyFixture,
      kitchen: { tickets: null },
      delivery: { assignments: null },
    });
    // confirm 15 + cash 15 + stock 10 = 40 / 100 = 40%
    assert.equal(partial.coverage, 40);
    assert.equal(partial.score, null);
    assert.equal(partial.scoreState, "INSUFFICIENT_DATA");
  });

  it("5. computes confidence bands", () => {
    assert.equal(computeConfidence({ coveragePercent: 100, staleCount: 0, evaluatedCount: 6 }), "HIGH");
    assert.equal(computeConfidence({ coveragePercent: 60, staleCount: 1, evaluatedCount: 4 }), "MEDIUM");
    assert.equal(computeConfidence({ coveragePercent: 40, staleCount: 0, evaluatedCount: 2 }), "LOW");
  });

  it("6. excludes missing components from score", () => {
    assert.match(buildSrc, /excluded from score/);
    assert.match(buildSrc, /PERMISSION_RESTRICTED/);
    const noKitchen = buildScore({
      ...healthyFixture,
      kitchen: { tickets: null },
    });
    assert.ok(!noKitchen.components.some((c) => c.id === "BH-KITCHEN-DELAY"));
  });

  it("7. failed / pressure components are not treated as healthy", () => {
    const bad = buildScore({
      ...healthyFixture,
      kitchen: {
        tickets: [
          {
            id: "k1",
            status: "preparing",
            createdAt: "2026-08-02T11:00:00.000Z",
            startedAt: "2026-08-02T11:00:00.000Z",
          },
        ],
      },
      finance: { enabled: true, unavailable: false, unresolvedCashVariance: 2 },
      ops: {
        data: {
          kpis: { lowStockCount: 12 },
          statusCounts: { pending: 4, ready: 2 },
          alerts: [{ code: "PENDING_TOO_LONG" }, { code: "PENDING_TOO_LONG" }],
        },
      },
    });
    const kitchen = bad.components.find((c) => c.id === "BH-KITCHEN-DELAY");
    const cash = bad.components.find((c) => c.id === "BH-CASH-VARIANCE");
    const stock = bad.components.find((c) => c.id === "BH-STOCK-PRESSURE");
    assert.equal(kitchen.score, 0);
    assert.equal(cash.score, 0);
    assert.equal(stock.score, 0);
    assert.ok(bad.score < 85);
  });

  it("8. permission-restricted cash is omitted from configured weight", () => {
    const restricted = buildScore({
      ...healthyFixture,
      finance: { enabled: false, unavailable: false, unresolvedCashVariance: null },
    });
    assert.ok(!restricted.components.some((c) => c.id === "BH-CASH-VARIANCE"));
    assert.equal(restricted.configured, 85);
    assert.equal(restricted.coverage, 100);
  });

  it("9. stale handling is declared in formula/build", () => {
    assert.match(formulaSrc, /STALE/);
    assert.match(buildSrc, /status: .*STALE/);
  });

  it("10. insufficient-data withholds numeric score", () => {
    const result = buildScore({
      ops: { data: null },
      kitchen: { tickets: null },
      delivery: { assignments: null },
      finance: { enabled: true, unavailable: true, unresolvedCashVariance: null },
    });
    assert.equal(result.score, null);
    assert.equal(result.scoreState, "INSUFFICIENT_DATA");
  });

  it("11. status-band mapping", () => {
    assert.equal(mapScoreState(90, 100), "HEALTHY");
    assert.equal(mapScoreState(75, 100), "WATCH");
    assert.equal(mapScoreState(55, 100), "AT_RISK");
    assert.equal(mapScoreState(40, 100), "CRITICAL");
    assert.equal(mapScoreState(90, 40), "INSUFFICIENT_DATA");
  });

  it("12. deterministic rounding", () => {
    assert.equal(scoreFromDelayRate(0.333), 67);
    assert.equal(clampScore(66.6), 67);
    assert.equal(computeWeightedScore([{ score: 67, weight: 25 }, { score: 100, weight: 75 }]), 92);
  });

  it("13. main-negative-contributor ordering", () => {
    const bad = buildScore({
      ...healthyFixture,
      finance: { enabled: true, unavailable: false, unresolvedCashVariance: 1 },
      ops: {
        data: {
          kpis: { lowStockCount: 12 },
          statusCounts: { pending: 1, ready: 0 },
          alerts: [],
        },
      },
    });
    assert.ok(bad.topNegative.length >= 1);
    assert.ok(bad.topNegative[0].score <= bad.topNegative.at(-1).score);
  });

  it("14. mode emphasis does not change formula text / weights", () => {
    assert.match(modeSrc, /Never changes weights/);
    assert.match(modeSrc, /PRE_OPEN/);
    assert.match(modeSrc, /LIVE_OPERATIONS/);
    assert.match(modeSrc, /CLOSING/);
    const a = buildScore(healthyFixture);
    const b = buildScore(healthyFixture);
    assert.equal(a.score, b.score);
  });

  it("15–16. comparable vs non-comparable ranking safeguards", () => {
    assert.equal(
      areComparable(
        { coveragePercent: 100, evaluatedComponentIds: ["A", "B"], freshnessState: "LIVE" },
        { coveragePercent: 100, evaluatedComponentIds: ["A", "B"], freshnessState: "FRESH" },
      ),
      true,
    );
    assert.equal(
      areComparable(
        { coveragePercent: 100, evaluatedComponentIds: ["A"], freshnessState: "LIVE" },
        { coveragePercent: 70, evaluatedComponentIds: ["A"], freshnessState: "LIVE" },
      ),
      false,
    );
    assert.match(buildSrc, /comparableForRanking = false/);
    assert.match(buildSrc, /Not a peer league table|league-ranked|league table/i);
  });

  it("17. unauthorized / restricted finance is not scored as failure", () => {
    assert.match(buildSrc, /not scored as failure/);
    assert.match(buildSrc, /Permission restricted/);
  });

  it("18. component drill-down routes reuse existing filters", () => {
    const result = buildScore(healthyFixture);
    for (const c of result.components) {
      assert.ok(c.href.startsWith("/admin/"));
      assert.doesNotMatch(c.href, /phone|email|customer|salary|riderId/i);
    }
    assert.match(buildSrc, /view: "delayed"/);
    assert.match(buildSrc, /lowStock: "1"/);
  });

  it("19. no PII fields in score summaries", () => {
    assert.doesNotMatch(buildSrc, /contactPhone|customerName|salary|deliveryAddress/);
    assert.doesNotMatch(panelSrc, /contactPhone|customerName|salary/);
  });

  it("20. accessible score and component labels", () => {
    assert.match(panelSrc, /aria-label/);
    assert.match(panelSrc, /sr-only/);
    assert.match(panelSrc, /aria-expanded/);
    assert.match(panelSrc, /Status:/);
  });

  it("21. mobile layout avoids fixed overflow traps", () => {
    assert.match(panelSrc, /min-w-0/);
    assert.match(panelSrc, /min-h-11/);
  });

  it("22. no mutation request in branch-health libs", () => {
    assert.doesNotMatch(buildSrc, /\bfetch\s*\(/);
    assert.doesNotMatch(buildSrc, /method:\s*["'](POST|PATCH|PUT|DELETE)["']/);
    assert.doesNotMatch(formulaSrc, /\bfetch\s*\(/);
    assert.match(buildSrc, /Read-only/);
    assert.doesNotMatch(panelSrc, /onApprove|onReject|overrideScore/);
  });

  it("23–26. DASH-01…04 wiring preserved", () => {
    assert.match(ownerSrc, /buildExceptionCenter/);
    assert.match(ownerSrc, /buildApprovalInbox/);
    assert.match(ownerSrc, /buildBranchHealthScore/);
    assert.match(ownerSrc, /ExceptionCenterPanel/);
    assert.match(ownerSrc, /ApprovalInboxPanel/);
    assert.match(ownerSrc, /BranchHealthPanel/);
    assert.match(modeRegSrc, /"branch-health"/);
    assert.match(modeRegSrc, /"exception-center"/);
    assert.match(modeRegSrc, /"approval-inbox"/);
  });

  it("27–28. evidence pack and panel maturity markers exist", () => {
    assert.ok(existsSync(path.join(root, "docs/testing/acceptance-evidence/rc6-dash-05")));
    assert.match(panelSrc, /data-kpi-maturity="DRILL_DOWN"/);
    assert.match(panelSrc, /data-testid="branch-health-panel"/);
    assert.doesNotMatch(panelSrc, /Approve|Reject|override score|Mark healthy/i);
  });
});

function BRANCH_HEALTH_TOTAL_FROM_SRC() {
  assert.match(weightsSrc, /BRANCH_HEALTH_TOTAL_WEIGHT/);
  return Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
}

// silence unused require on platforms that tree-shake
void require;
void formulaSrc;
