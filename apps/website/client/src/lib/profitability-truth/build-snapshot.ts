/**
 * Build Profitability Truth snapshot from verified ops + posted P&L sources.
 * Read-only — never invents COGS, net sales, or posted profit from orders.
 */

import type {
  AccountingProfitability,
  ExcludedProfitMetric,
  OperationalProfitability,
  ProfitMetric,
  ProfitabilityReconciliation,
  ProfitabilitySnapshot,
  ProfitabilitySourceInput,
} from "./types";
import {
  ACCOUNTING_CONFIGURED_COUNT,
  OPERATIONAL_CONFIGURED_COUNT,
  MIN_OPERATIONAL_COVERAGE_PERCENT,
  confidenceFromCoverage,
  coveragePercent,
  formatCount,
  formatMoneyPkr,
  hasPostedPlActivity,
  mapFreshness,
  sourceFailed,
} from "./formula";

const DEFERRED_OPERATIONAL: ExcludedProfitMetric[] = [
  {
    id: "OP-NET-SALES",
    label: "Net Sales",
    reason:
      "Not shown — analytics net formula risks double-counting discounts already reflected in order totals.",
    maturity: "Not Available",
  },
  {
    id: "OP-EST-COGS",
    label: "Estimated COGS",
    reason: "Recipe cost estimates exist per recipe but are not aggregated for the Owner dashboard window.",
    maturity: "Not Available",
  },
  {
    id: "OP-EST-GROSS-PROFIT",
    label: "Estimated Gross Profit",
    reason: "Requires verified estimated COGS coverage — omitted rather than inventing costs.",
    maturity: "Insufficient Data",
  },
  {
    id: "OP-EST-GROSS-MARGIN",
    label: "Estimated Gross Margin",
    reason: "Deferred with estimated gross profit (zero-denominator and COGS gaps).",
    maturity: "Insufficient Data",
  },
  {
    id: "OP-LABOR",
    label: "Estimated Labor Cost",
    reason: "Payroll labour analytics are partial and may expose sensitive payroll detail.",
    maturity: "Not Available",
  },
  {
    id: "OP-DELIVERY-COST",
    label: "Estimated Delivery Cost",
    reason: "Rider/delivery cost allocation is not a verified dashboard aggregate.",
    maturity: "Not Available",
  },
  {
    id: "OP-OPEX",
    label: "Estimated Operating Expenses",
    reason: "Expense claims are workflow totals — not a complete operating-cost set for contribution.",
    maturity: "Not Available",
  },
  {
    id: "OP-OPERATING-RESULT",
    label: "Estimated Operating Result",
    reason: "Material cost categories absent — full estimated profit would be misleading.",
    maturity: "Insufficient Data",
  },
];

const DEFERRED_ACCOUNTING: ExcludedProfitMetric[] = [
  {
    id: "ACC-POSTED-COGS",
    label: "Posted COGS",
    reason: "COGS auto-post from inventory consumption is foundation-only; not included in posted totals.",
    maturity: "Not Available",
  },
  {
    id: "ACC-POSTED-GROSS-PROFIT",
    label: "Posted Gross Profit",
    reason: "Requires posted COGS — Finance UI keeps Gross profit UNAVAILABLE until COGS auto-post.",
    maturity: "Not Available",
  },
  {
    id: "ACC-DRAFT",
    label: "Draft journals",
    reason: "Draft / unposted journal entries are excluded from Accounting Posted by contract.",
    maturity: "Accounting Draft",
  },
];

export function buildProfitabilitySnapshot(input: ProfitabilitySourceInput): ProfitabilitySnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAt = new Date(nowMs).toISOString();
  const timezone = input.timezone || input.ops.data?.timezone || "Asia/Karachi";
  const opsWindow = input.ops.data?.dayStart
    ? `${timezone} business day starting ${input.ops.data.dayStart}`
    : `${timezone} business day (operations dashboard)`;

  const operational = buildOperational(input, opsWindow);
  const accounting = buildAccounting(input);
  const reconciliation = buildReconciliation(operational, accounting, opsWindow);

  const freshnessParts = [
    mapFreshness(input.ops.state, input.ops.data != null),
    input.financeEnabled
      ? mapFreshness(input.accounting.state, input.accounting.profitLoss != null)
      : ("UNAVAILABLE" as const),
  ];
  let freshnessState: ProfitabilitySnapshot["freshnessState"] = "FRESH";
  if (freshnessParts.every((f) => f === "UNAVAILABLE")) freshnessState = "UNAVAILABLE";
  else if (freshnessParts.some((f) => f === "UNAVAILABLE")) freshnessState = "PARTIAL";
  else if (freshnessParts.some((f) => f === "STALE")) freshnessState = "STALE";
  else if (freshnessParts.every((f) => f === "LIVE")) freshnessState = "LIVE";

  const limitations = [
    "Operational Estimate ≠ Accounting Posted — never combine into one unlabeled total.",
    "Estimated profit, COGS, and net sales are deferred until verified formulas and coverage exist.",
    "Posted figures require posted journals only; empty GL is not a zero-profit claim.",
    ...operational.limitations.slice(0, 2),
    ...accounting.limitations.slice(0, 2),
  ];

  return {
    branchId: input.branchId,
    branchName: input.branchName,
    businessWindow: opsWindow,
    timezone,
    currency: "PKR",
    evaluatedAt,
    operational,
    accounting,
    reconciliation,
    sourceCoverage: {
      operationalPercent: operational.coveragePercent,
      accountingPercent: accounting.coveragePercent,
    },
    freshnessState,
    limitations,
    actionMaturity: "DRILL_DOWN",
  };
}

function buildOperational(
  input: ProfitabilitySourceInput,
  opsWindow: string,
): OperationalProfitability {
  const opsHas = input.ops.data != null;
  const fresh = mapFreshness(input.ops.state, opsHas);
  const metrics: ProfitMetric[] = [];
  const limitations: string[] = [];

  if (sourceFailed(input.ops.state, opsHas)) {
    return {
      state: "UNAVAILABLE",
      maturityLabel: "Operational Estimate",
      metrics: [],
      excludedComponents: DEFERRED_OPERATIONAL,
      coveragePercent: 0,
      confidence: "LOW",
      businessWindow: opsWindow,
      currency: "PKR",
      sourceDetails: ["Operations dashboard unavailable"],
      limitations: [
        "Operational sales source failed — values not replaced with zeros.",
        ...DEFERRED_OPERATIONAL.map((d) => `${d.label}: ${d.reason}`),
      ],
    };
  }

  if (input.ops.state === "LOADING" && !opsHas) {
    return {
      state: "LOADING",
      maturityLabel: "Operational Estimate",
      metrics: [],
      excludedComponents: DEFERRED_OPERATIONAL,
      coveragePercent: 0,
      confidence: "LOW",
      businessWindow: opsWindow,
      currency: "PKR",
      sourceDetails: ["Operations dashboard loading"],
      limitations: ["Waiting for operations dashboard."],
    };
  }

  if (!opsHas) {
    return {
      state: "INSUFFICIENT_DATA",
      maturityLabel: "Operational Estimate",
      metrics: [],
      excludedComponents: DEFERRED_OPERATIONAL,
      coveragePercent: 0,
      confidence: "LOW",
      businessWindow: opsWindow,
      currency: "PKR",
      sourceDetails: ["Operations dashboard not loaded"],
      limitations: ["Missing operational data is not treated as zero sales."],
    };
  }

  const kpis = input.ops.data!.kpis;
  metrics.push({
    id: "OP-GROSS-SALES",
    label: "Gross Sales (Operational Estimate)",
    maturity: "Operational Estimate",
    trustState: "ESTIMATED",
    value: formatMoneyPkr(kpis.todayGrossSales),
    rawValue: kpis.todayGrossSales,
    unit: "PKR",
    source: "Operations dashboard KPI (todayGrossSales)",
    formula: "SUM(order.total_amount) for non-cancelled orders in the Karachi business day",
    businessWindow: opsWindow,
    freshnessState: fresh,
    drillDown: {
      href: "/admin/orders",
      label: "View orders contributing to Operational Gross Sales",
    },
    limitation:
      "Ops gross sales — not Accounting Posted revenue. Cancelled orders excluded per ops dashboard definition.",
  });
  metrics.push({
    id: "OP-ORDERS",
    label: "Orders (Operational)",
    maturity: "Operational Estimate",
    trustState: "LIVE",
    value: formatCount(kpis.todayOrders),
    rawValue: kpis.todayOrders,
    unit: "count",
    source: "Operations dashboard KPI (todayOrders)",
    formula: "Count of non-cancelled orders in the Karachi business day",
    businessWindow: opsWindow,
    freshnessState: fresh,
    drillDown: {
      href: "/admin/orders",
      label: "View today’s operational orders",
    },
  });
  metrics.push({
    id: "OP-AOV",
    label: "Average Order Value (Operational)",
    maturity: "Operational Estimate",
    trustState: "DERIVED",
    value: formatMoneyPkr(kpis.averageOrderValue),
    rawValue: kpis.averageOrderValue,
    unit: "PKR",
    source: "Operations dashboard KPI (averageOrderValue)",
    formula: "todayGrossSales ÷ todayOrders when orders > 0; otherwise null",
    businessWindow: opsWindow,
    freshnessState: fresh,
    drillDown: {
      href: "/admin/reports",
      label: "Open sales reports for multi-day context",
    },
    limitation: kpis.averageOrderValue == null ? "AOV unavailable when order count is zero." : undefined,
  });

  const evaluated = metrics.filter((m) => m.rawValue != null || m.id === "OP-GROSS-SALES").length;
  // Gross sales of 0 is a valid evaluated zero (proven empty day), not missing data.
  const coverage = coveragePercent(evaluated, OPERATIONAL_CONFIGURED_COUNT);
  const stale = fresh === "STALE";
  const confidence = confidenceFromCoverage(coverage, stale);
  const state =
    coverage < MIN_OPERATIONAL_COVERAGE_PERCENT
      ? "INSUFFICIENT_DATA"
      : stale
        ? "STALE"
        : "AVAILABLE";

  limitations.push(
    "No estimated gross profit or operating contribution in this slice — material costs are excluded.",
  );

  return {
    state,
    maturityLabel: "Operational Estimate",
    metrics,
    excludedComponents: DEFERRED_OPERATIONAL,
    coveragePercent: coverage,
    confidence,
    businessWindow: opsWindow,
    currency: "PKR",
    sourceDetails: [
      "Operations dashboard /admin/dashboard/operations",
      `Trust: ESTIMATED gross sales · LIVE order count · DERIVED AOV`,
    ],
    limitations,
  };
}

function buildAccounting(input: ProfitabilitySourceInput): AccountingProfitability {
  if (!input.financeEnabled) {
    return {
      state: "PERMISSION_RESTRICTED",
      maturityLabel: "Not Available",
      accountingPeriod: null,
      periodStatus: "UNAVAILABLE",
      postedThrough: null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "LOW",
      currency: "PKR",
      sourceDetails: ["Finance module not authorized for this principal"],
      limitations: [
        "Accounting Posted lane omitted — finance access is permission-gated (not treated as zero).",
      ],
    };
  }

  if (!input.branchId) {
    return {
      state: "INSUFFICIENT_DATA",
      maturityLabel: "Insufficient Data",
      accountingPeriod: null,
      periodStatus: "UNAVAILABLE",
      postedThrough: null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "LOW",
      currency: "PKR",
      sourceDetails: ["P&L API requires a selected branchId"],
      limitations: [
        "Select a single branch to load Accounting Posted P&L. Aggregate all-branches posted P&L is not supported in this slice.",
      ],
    };
  }

  if (input.accounting.unavailable || sourceFailed(input.accounting.state, input.accounting.profitLoss != null)) {
    return {
      state: "UNAVAILABLE",
      maturityLabel: "Not Available",
      accountingPeriod: null,
      periodStatus: "UNAVAILABLE",
      postedThrough: null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "LOW",
      currency: "PKR",
      sourceDetails: ["Posted P&L source unavailable"],
      limitations: ["Accounting source failed — not substituted with operational estimates."],
    };
  }

  if (input.accounting.state === "LOADING" && !input.accounting.profitLoss) {
    return {
      state: "LOADING",
      maturityLabel: "Accounting Posted",
      accountingPeriod: null,
      periodStatus: "UNAVAILABLE",
      postedThrough: null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "LOW",
      currency: "PKR",
      sourceDetails: ["Posted P&L loading"],
      limitations: ["Waiting for posted profit & loss."],
    };
  }

  const pl = input.accounting.profitLoss;
  if (!pl) {
    return {
      state: "INSUFFICIENT_DATA",
      maturityLabel: "Insufficient Data",
      accountingPeriod: null,
      periodStatus: "UNAVAILABLE",
      postedThrough: null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "LOW",
      currency: "PKR",
      sourceDetails: ["Posted P&L not loaded"],
      limitations: ["Missing posted P&L is not treated as Rs 0 net income."],
    };
  }

  const period = `${pl.fromDate || "default"} → ${pl.toDate || "today"}`;
  const fresh = mapFreshness(input.accounting.state, true);
  const active = hasPostedPlActivity(pl);

  if (!active) {
    return {
      state: "EMPTY",
      maturityLabel: "Accounting Posted",
      accountingPeriod: period,
      periodStatus: "NO_POSTED_ACTIVITY",
      postedThrough: pl.toDate || null,
      metrics: [],
      excludedComponents: DEFERRED_ACCOUNTING,
      coveragePercent: 0,
      confidence: "MEDIUM",
      currency: "PKR",
      sourceDetails: [
        "finance_profit_loss RPC (posted journals only)",
        `Period ${period}`,
      ],
      limitations: [
        "No posted P&L activity yet — empty ledger is not a claim of zero daily profit.",
        "Draft journals are excluded from Accounting Posted.",
        ...DEFERRED_ACCOUNTING.map((d) => `${d.label}: ${d.reason}`),
      ],
    };
  }

  const metrics: ProfitMetric[] = [
    {
      id: "ACC-POSTED-REVENUE",
      label: "Posted Revenue",
      maturity: "Accounting Posted",
      trustState: "ACCOUNTING",
      value: formatMoneyPkr(pl.revenue),
      rawValue: pl.revenue,
      unit: "PKR",
      source: "Posted REVENUE journal lines (finance_profit_loss)",
      formula: "Sum of posted revenue account activity in the accounting period",
      businessWindow: period,
      freshnessState: fresh,
      drillDown: {
        href: "/admin/finance",
        label: "Open posted accounting summary",
      },
      limitation: "Not operational order gross sales.",
    },
    {
      id: "ACC-POSTED-EXPENSES",
      label: "Posted Operating Expenses",
      maturity: "Accounting Posted",
      trustState: "ACCOUNTING",
      value: formatMoneyPkr(pl.expenses),
      rawValue: pl.expenses,
      unit: "PKR",
      source: "Posted EXPENSE journal lines (finance_profit_loss)",
      formula: "Sum of posted expense account activity in the accounting period",
      businessWindow: period,
      freshnessState: fresh,
      drillDown: {
        href: "/admin/finance",
        label: "Open posted expense accounts",
      },
    },
    {
      id: "ACC-POSTED-NET",
      label: "Posted Net Result",
      maturity: "Accounting Posted",
      trustState: "ACCOUNTING",
      value: formatMoneyPkr(pl.netIncome),
      rawValue: pl.netIncome,
      unit: "PKR",
      source: "Posted P&L (revenue − expenses)",
      formula: "postedRevenue − postedExpenses (GL); may be negative",
      businessWindow: period,
      freshnessState: fresh,
      drillDown: {
        href: "/admin/finance",
        label: "Open posted profit & loss",
      },
      limitation: "Does not include unposted sales/COGS/payroll until those journals exist.",
    },
  ];

  // Foundation metrics shown as Not Available rows for honesty (not in coverage numerator).
  metrics.push({
    id: "ACC-POSTED-COGS",
    label: "Posted COGS",
    maturity: "Not Available",
    trustState: "FOUNDATION",
    value: null,
    rawValue: null,
    unit: "PKR",
    source: "COGS auto-post foundation",
    formula: "Not available — inventory COGS events require posting",
    businessWindow: period,
    freshnessState: "UNAVAILABLE",
    drillDown: {
      href: "/admin/inventory",
      label: "Open inventory (COGS source foundation)",
    },
    limitation: "Omitted from posted totals and coverage.",
  });
  metrics.push({
    id: "ACC-POSTED-GROSS-PROFIT",
    label: "Posted Gross Profit",
    maturity: "Not Available",
    trustState: "FOUNDATION",
    value: null,
    rawValue: null,
    unit: "PKR",
    source: "Requires posted COGS",
    formula: "Not available",
    businessWindow: period,
    freshnessState: "UNAVAILABLE",
    drillDown: {
      href: "/admin/finance",
      label: "Open finance (gross profit remains UNAVAILABLE)",
    },
  });

  const coverage = coveragePercent(ACCOUNTING_CONFIGURED_COUNT, ACCOUNTING_CONFIGURED_COUNT);
  return {
    state: fresh === "STALE" ? "STALE" : "AVAILABLE",
    maturityLabel: "Accounting Posted",
    accountingPeriod: period,
    periodStatus: "HAS_POSTED_ACTIVITY",
    postedThrough: pl.toDate || null,
    metrics,
    excludedComponents: DEFERRED_ACCOUNTING,
    coveragePercent: coverage,
    confidence: confidenceFromCoverage(coverage, fresh === "STALE"),
    currency: "PKR",
    sourceDetails: [
      "finance_profit_loss — status=posted journals only",
      `Period ${period}`,
      "Late journals may still change an open period — period close not declared in this slice.",
    ],
    limitations: [
      "Accounting period semantics differ from the operational Karachi business day.",
      "Posted Gross Profit / COGS remain Not Available.",
    ],
  };
}

function buildReconciliation(
  operational: OperationalProfitability,
  accounting: AccountingProfitability,
  opsWindow: string,
): ProfitabilityReconciliation {
  const accountingWindow = accounting.accountingPeriod;
  return {
    state: "NOT_COMPARABLE",
    comparable: false,
    operationalWindow: opsWindow,
    accountingWindow,
    revenueDifference: null,
    cogsDifference: null,
    resultDifference: null,
    explanation:
      "Operational and accounting figures are not directly comparable for this window. " +
      "Operational Gross Sales use the Asia/Karachi business-day order totals; Accounting Posted uses journal posting dates and may span a different from/to period. " +
      "Tax basis, refund journals, and sales auto-post completeness also differ.",
    limitations: [
      "No variance percentage is shown between incompatible windows.",
      "Do not reconcile ops gross sales to posted revenue until windows and posting rules align.",
    ],
  };
}
