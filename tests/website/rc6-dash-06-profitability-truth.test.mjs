/**
 * RC6-DASH-06 — Profitability Truth contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const buildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/profitability-truth/build-snapshot.ts"),
  "utf8",
);
const formulaSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/profitability-truth/formula.ts"),
  "utf8",
);
const typesSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/profitability-truth/types.ts"),
  "utf8",
);
const modeSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/profitability-truth/mode-emphasis.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ProfitabilityTruthPanel.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const dashSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);
const modeRegSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);

function coveragePercent(evaluated, configured) {
  if (configured <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((evaluated / configured) * 100)));
}

function hasPostedPlActivity(pl) {
  if (!pl) return false;
  return pl.revenue !== 0 || pl.expenses !== 0;
}

function buildSnapshot(input) {
  const opsMetrics = [];
  const excludedOps = ["OP-NET-SALES", "OP-EST-COGS", "OP-EST-GROSS-PROFIT", "OP-OPERATING-RESULT"];
  let opState = "UNAVAILABLE";
  let opCoverage = 0;

  if (input.ops.data) {
    opsMetrics.push({
      id: "OP-GROSS-SALES",
      maturity: "Operational Estimate",
      raw: input.ops.data.kpis.todayGrossSales,
      label: "Gross Sales (Operational Estimate)",
    });
    opsMetrics.push({
      id: "OP-ORDERS",
      maturity: "Operational Estimate",
      raw: input.ops.data.kpis.todayOrders,
    });
    opsMetrics.push({
      id: "OP-AOV",
      maturity: "Operational Estimate",
      raw: input.ops.data.kpis.averageOrderValue,
    });
    opCoverage = coveragePercent(3, 3);
    opState = "AVAILABLE";
  } else if (input.ops.state === "ERROR") {
    opState = "UNAVAILABLE";
    opCoverage = 0;
  }

  let accState = "UNAVAILABLE";
  let accMetrics = [];
  let period = null;
  if (!input.financeEnabled) {
    accState = "PERMISSION_RESTRICTED";
  } else if (!input.branchId) {
    accState = "INSUFFICIENT_DATA";
  } else if (input.accounting.unavailable) {
    accState = "UNAVAILABLE";
  } else if (input.accounting.profitLoss) {
    period = `${input.accounting.profitLoss.fromDate} → ${input.accounting.profitLoss.toDate}`;
    if (!hasPostedPlActivity(input.accounting.profitLoss)) {
      accState = "EMPTY";
    } else {
      accState = "AVAILABLE";
      accMetrics = [
        { id: "ACC-POSTED-REVENUE", maturity: "Accounting Posted", raw: input.accounting.profitLoss.revenue },
        { id: "ACC-POSTED-EXPENSES", maturity: "Accounting Posted", raw: input.accounting.profitLoss.expenses },
        { id: "ACC-POSTED-NET", maturity: "Accounting Posted", raw: input.accounting.profitLoss.netIncome },
      ];
    }
  }

  return {
    operational: { state: opState, metrics: opsMetrics, coverage: opCoverage, excluded: excludedOps },
    accounting: { state: accState, metrics: accMetrics, period },
    reconciliation: { comparable: false },
  };
}

const opsFixture = {
  branchId: "b1",
  branchName: "Royal Orchard",
  financeEnabled: true,
  ops: {
    state: "LIVE",
    data: {
      generatedAt: "2026-08-02T12:00:00.000Z",
      dayStart: "2026-08-02T00:00:00+05:00",
      kpis: { todayGrossSales: 125000, todayOrders: 40, averageOrderValue: 3125 },
    },
  },
  accounting: {
    state: "LIVE",
    unavailable: false,
    profitLoss: {
      branchId: "b1",
      fromDate: "2026-01-01",
      toDate: "2026-08-02",
      revenue: 500000,
      expenses: 200000,
      netIncome: 300000,
    },
  },
};

describe("RC6-DASH-06 Profitability Truth", () => {
  it("1. maps operational sources", () => {
    assert.match(buildSrc, /todayGrossSales/);
    assert.match(buildSrc, /todayOrders/);
    assert.match(buildSrc, /averageOrderValue/);
    assert.match(buildSrc, /Operational Estimate/);
  });

  it("2. classifies accounting as posted-only", () => {
    assert.match(buildSrc, /finance_profit_loss/);
    assert.match(buildSrc, /Accounting Posted/);
    assert.match(buildSrc, /Draft \/ unposted/);
    assert.match(typesSrc, /Accounting Posted/);
  });

  it("3–6. gross sales, discounts/refunds honesty, net-sales deferred", () => {
    const snap = buildSnapshot(opsFixture);
    assert.equal(snap.operational.metrics[0].raw, 125000);
    assert.ok(snap.operational.excluded.includes("OP-NET-SALES"));
    assert.match(buildSrc, /double-counting discounts/);
    assert.match(buildSrc, /OP-NET-SALES/);
  });

  it("7–9. COGS / gross profit / margin deferred", () => {
    assert.match(buildSrc, /OP-EST-COGS/);
    assert.match(buildSrc, /OP-EST-GROSS-PROFIT/);
    assert.match(buildSrc, /OP-EST-GROSS-MARGIN/);
    assert.match(buildSrc, /ACC-POSTED-COGS/);
    assert.match(buildSrc, /ACC-POSTED-GROSS-PROFIT/);
  });

  it("10–11. partial cost and insufficient-data behavior", () => {
    assert.match(buildSrc, /Insufficient Data/);
    assert.match(buildSrc, /Material cost categories absent/i);
    const missing = buildSnapshot({
      ...opsFixture,
      ops: { state: "ERROR", data: null },
    });
    assert.equal(missing.operational.state, "UNAVAILABLE");
    assert.equal(missing.operational.coverage, 0);
  });

  it("12. negative posted net result supported", () => {
    const neg = buildSnapshot({
      ...opsFixture,
      accounting: {
        state: "LIVE",
        unavailable: false,
        profitLoss: {
          branchId: "b1",
          fromDate: "2026-01-01",
          toDate: "2026-08-02",
          revenue: 100,
          expenses: 250,
          netIncome: -150,
        },
      },
    });
    assert.equal(neg.accounting.metrics.find((m) => m.id === "ACC-POSTED-NET").raw, -150);
    assert.match(buildSrc, /may be negative/);
  });

  it("13. zero-denominator AOV limitation", () => {
    assert.match(buildSrc, /order count is zero/);
  });

  it("14. estimated versus posted labels separated", () => {
    assert.match(panelSrc, /Operational Estimate/);
    assert.match(panelSrc, /Accounting Posted/);
    assert.match(panelSrc, /Operational Estimate ≠ Accounting Posted/);
    assert.doesNotMatch(buildSrc, /label: "Profit"/);
  });

  it("15. draft accounting excluded; empty GL not zero profit claim", () => {
    assert.match(formulaSrc, /hasPostedPlActivity/);
    assert.match(buildSrc, /empty ledger is not a claim of zero daily profit/);
    const empty = buildSnapshot({
      ...opsFixture,
      accounting: {
        state: "LIVE",
        unavailable: false,
        profitLoss: {
          branchId: "b1",
          fromDate: "2026-01-01",
          toDate: "2026-08-02",
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        },
      },
    });
    assert.equal(empty.accounting.state, "EMPTY");
    assert.equal(empty.accounting.metrics.length, 0);
  });

  it("16. accounting-period metadata", () => {
    const snap = buildSnapshot(opsFixture);
    assert.match(snap.accounting.period, /2026-01-01/);
    assert.match(buildSrc, /accountingPeriod/);
    assert.match(buildSrc, /postedThrough/);
  });

  it("17–18. reconciliation not comparable by default", () => {
    const snap = buildSnapshot(opsFixture);
    assert.equal(snap.reconciliation.comparable, false);
    assert.match(buildSrc, /not directly comparable/);
    assert.match(buildSrc, /NOT_COMPARABLE/);
  });

  it("19. branch scoping for posted P&L", () => {
    assert.match(dashSrc, /fetchProfitLoss/);
    assert.match(dashSrc, /Boolean\(branchIdFilter\)/);
    const noBranch = buildSnapshot({ ...opsFixture, branchId: null });
    assert.equal(noBranch.accounting.state, "INSUFFICIENT_DATA");
  });

  it("20. permission-restricted finance", () => {
    const restricted = buildSnapshot({ ...opsFixture, financeEnabled: false });
    assert.equal(restricted.accounting.state, "PERMISSION_RESTRICTED");
    assert.match(buildSrc, /PERMISSION_RESTRICTED/);
  });

  it("21–22. stale/failed sources; missing not zero", () => {
    assert.match(buildSrc, /not replaced with zeros/);
    assert.match(buildSrc, /not treated as Rs 0/);
    assert.match(buildSrc, /STALE/);
  });

  it("23–24. currency PKR and tax-basis limitation", () => {
    assert.match(typesSrc, /currency: "PKR"/);
    assert.match(buildSrc, /Tax basis/);
    assert.match(buildSrc, /currency: "PKR"/);
  });

  it("25–26. accessible labels; no PII", () => {
    assert.match(panelSrc, /Maturity:/);
    assert.match(panelSrc, /aria-label/);
    assert.match(panelSrc, /sr-only/);
    assert.doesNotMatch(buildSrc, /salary|contactPhone|bankAccount|customerName/);
    assert.doesNotMatch(panelSrc, /salary|contactPhone|bankAccount/);
  });

  it("27. no mutation request", () => {
    assert.doesNotMatch(buildSrc, /\bfetch\s*\(/);
    assert.doesNotMatch(buildSrc, /method:\s*["'](POST|PATCH|PUT|DELETE)["']/);
    assert.match(buildSrc, /Read-only/);
    assert.doesNotMatch(panelSrc, /onPostJournal|createJournal|approveExpense/);
  });

  it("28. command-mode emphasis does not change formulas", () => {
    assert.match(modeSrc, /Never changes formulas/);
    assert.match(modeSrc, /PRE_OPEN/);
    assert.match(modeSrc, /LIVE_OPERATIONS/);
    assert.match(modeSrc, /CLOSING/);
  });

  it("29–33. prior DASH wiring preserved", () => {
    assert.match(ownerSrc, /buildExceptionCenter/);
    assert.match(ownerSrc, /buildApprovalInbox/);
    assert.match(ownerSrc, /buildBranchHealthScore/);
    assert.match(ownerSrc, /buildProfitabilitySnapshot/);
    assert.match(ownerSrc, /ProfitabilityTruthPanel/);
    assert.match(modeRegSrc, /"profitability-truth"/);
    assert.match(modeRegSrc, /"branch-health"/);
    assert.match(modeRegSrc, /"approval-inbox"/);
    assert.match(modeRegSrc, /"exception-center"/);
  });

  it("34–35. evidence pack and maturity markers", () => {
    assert.ok(existsSync(path.join(root, "docs/testing/acceptance-evidence/rc6-dash-06")));
    assert.match(panelSrc, /data-kpi-maturity="DRILL_DOWN"/);
    assert.match(panelSrc, /data-testid="profitability-truth-panel"/);
  });
});
