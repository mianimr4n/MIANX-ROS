/**
 * RC6-DASH-06 — Profitability Truth (Operational Estimate ≠ Accounting Posted).
 */

export type ProfitTrustState =
  | "LIVE"
  | "DERIVED"
  | "ACCOUNTING"
  | "ESTIMATED"
  | "FOUNDATION"
  | "STALE"
  | "UNAVAILABLE";

export type FinancialMaturity =
  | "Operational Estimate"
  | "Accounting Posted"
  | "Accounting Draft"
  | "Partial Contribution"
  | "Insufficient Data"
  | "Not Available";

export type ProfitabilityLaneState =
  | "AVAILABLE"
  | "PARTIAL"
  | "EMPTY"
  | "LOADING"
  | "STALE"
  | "INSUFFICIENT_DATA"
  | "PERMISSION_RESTRICTED"
  | "UNAVAILABLE"
  | "FOUNDATION_ONLY";

export type ProfitMetricId =
  | "OP-GROSS-SALES"
  | "OP-ORDERS"
  | "OP-AOV"
  | "ACC-POSTED-REVENUE"
  | "ACC-POSTED-EXPENSES"
  | "ACC-POSTED-NET"
  | "ACC-POSTED-COGS"
  | "ACC-POSTED-GROSS-PROFIT";

export type ProfitMetric = {
  id: ProfitMetricId;
  label: string;
  maturity: FinancialMaturity;
  trustState: ProfitTrustState;
  /** Formatted display value; null when not shown. */
  value: string | null;
  /** Raw numeric when available (money or count). */
  rawValue: number | null;
  unit: "PKR" | "count" | "ratio";
  source: string;
  formula: string;
  businessWindow: string;
  freshnessState: "LIVE" | "FRESH" | "STALE" | "UNAVAILABLE";
  drillDown: { href: string; label: string };
  limitation?: string;
};

export type ExcludedProfitMetric = {
  id: string;
  label: string;
  reason: string;
  maturity: FinancialMaturity;
};

export type OperationalProfitability = {
  state: ProfitabilityLaneState;
  maturityLabel: "Operational Estimate";
  metrics: ProfitMetric[];
  excludedComponents: ExcludedProfitMetric[];
  coveragePercent: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  businessWindow: string;
  currency: "PKR";
  sourceDetails: string[];
  limitations: string[];
};

export type AccountingProfitability = {
  state: ProfitabilityLaneState;
  maturityLabel: "Accounting Posted" | "Not Available" | "Insufficient Data";
  accountingPeriod: string | null;
  periodStatus: "OPEN_OR_UNKNOWN" | "HAS_POSTED_ACTIVITY" | "NO_POSTED_ACTIVITY" | "UNAVAILABLE";
  postedThrough: string | null;
  metrics: ProfitMetric[];
  excludedComponents: ExcludedProfitMetric[];
  coveragePercent: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  currency: "PKR";
  sourceDetails: string[];
  limitations: string[];
};

export type ProfitabilityReconciliation = {
  state: "COMPARABLE" | "NOT_COMPARABLE" | "UNAVAILABLE";
  comparable: boolean;
  operationalWindow: string;
  accountingWindow: string | null;
  revenueDifference: number | null;
  cogsDifference: null;
  resultDifference: number | null;
  explanation: string;
  limitations: string[];
};

export type ProfitabilitySnapshot = {
  branchId: string | null;
  branchName: string;
  businessWindow: string;
  timezone: string;
  currency: "PKR";
  evaluatedAt: string;
  operational: OperationalProfitability;
  accounting: AccountingProfitability;
  reconciliation: ProfitabilityReconciliation;
  sourceCoverage: {
    operationalPercent: number;
    accountingPercent: number;
  };
  freshnessState: "LIVE" | "FRESH" | "STALE" | "PARTIAL" | "UNAVAILABLE";
  limitations: string[];
  actionMaturity: "DRILL_DOWN";
};

export type ProfitabilitySourceInput = {
  branchId: string | null;
  branchName: string;
  nowMs?: number;
  timezone?: string | null;
  financeEnabled: boolean;
  ops: {
    data: {
      generatedAt: string;
      timezone?: string;
      dayStart?: string;
      kpis: {
        todayGrossSales: number;
        todayOrders: number;
        averageOrderValue: number | null;
      };
    } | null;
    state: string;
  };
  accounting: {
    /** Posted P&L only — never draft journals. */
    profitLoss: {
      branchId: string;
      fromDate: string;
      toDate: string;
      revenue: number;
      expenses: number;
      netIncome: number;
    } | null;
    state: string;
    unavailable: boolean;
  };
};
