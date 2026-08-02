/**
 * RC6-DASH-05 — Explainable Branch Health Score (INSIGHT_ONLY + DRILL_DOWN).
 */

export type BranchHealthScoreState =
  | "HEALTHY"
  | "WATCH"
  | "AT_RISK"
  | "CRITICAL"
  | "INSUFFICIENT_DATA";

export type BranchHealthConfidence = "HIGH" | "MEDIUM" | "LOW";

export type BranchHealthFreshness =
  | "LIVE"
  | "FRESH"
  | "STALE"
  | "PARTIAL"
  | "UNAVAILABLE";

export type BranchHealthComponentStatus =
  | "EVALUATED"
  | "UNAVAILABLE"
  | "PERMISSION_RESTRICTED"
  | "EMPTY_HEALTHY"
  | "STALE";

export type BranchHealthComponentId =
  | "BH-KITCHEN-DELAY"
  | "BH-DELIVERY-LATE"
  | "BH-CONFIRM-DELAY"
  | "BH-DISPATCH-WAIT"
  | "BH-CASH-VARIANCE"
  | "BH-STOCK-PRESSURE";

export type BranchHealthDomain =
  | "kitchen"
  | "delivery"
  | "orders"
  | "cash"
  | "inventory";

export type BranchHealthTrustState =
  | "LIVE"
  | "PARTIAL_LIVE"
  | "DERIVED"
  | "UNAVAILABLE";

export type BranchHealthComponent = {
  componentId: BranchHealthComponentId;
  label: string;
  domain: BranchHealthDomain;
  /** Integer 0–100 when evaluated; null when excluded. */
  score: number | null;
  weight: number;
  weightedContribution: number | null;
  status: BranchHealthComponentStatus;
  source: string;
  trustState: BranchHealthTrustState;
  freshnessState: BranchHealthFreshness;
  metricValue: string;
  rule: string;
  explanation: string;
  drillDown: {
    href: string;
    label: string;
  };
  limitation?: string;
};

export type ExcludedComponent = {
  componentId: BranchHealthComponentId | string;
  label: string;
  reason: string;
};

export type BranchHealthScore = {
  branchId: string | null;
  branchName: string;
  /** Integer 0–100 when scoreState is not INSUFFICIENT_DATA; otherwise null. */
  score: number | null;
  scoreState: BranchHealthScoreState;
  /** Owner-facing status phrase (not enum-only). */
  statusLabel: string;
  confidence: BranchHealthConfidence;
  coveragePercent: number;
  evaluatedAt: string;
  businessWindow: string;
  components: BranchHealthComponent[];
  excludedComponents: ExcludedComponent[];
  freshnessState: BranchHealthFreshness;
  limitations: string[];
  topNegativeContributors: BranchHealthComponent[];
  topPositiveContributors: BranchHealthComponent[];
  comparableForRanking: boolean;
  comparisonNote: string;
  actionMaturity: "DRILL_DOWN";
};

export type BranchHealthSourceInput = {
  branchId: string | null;
  branchName: string;
  nowMs?: number;
  ops: {
    data: {
      generatedAt: string;
      timezone?: string;
      kpis: {
        lowStockCount: number;
        activeOrders?: number;
      };
      statusCounts: Record<string, number>;
      alerts: Array<{ code: string; severity?: string }>;
    } | null;
    state: string;
  };
  kitchen: {
    tickets: Array<{
      id: string;
      status: string;
      startedAt?: string | null;
      acceptedAt?: string | null;
      createdAt: string;
    }> | null;
    state: string;
  };
  delivery: {
    assignments: Array<{
      id: string;
      status: string;
      orderStatus?: string | null;
      assignedAt?: string | null;
      pickedUpAt?: string | null;
      createdAt?: string | null;
    }> | null;
    state: string;
  };
  finance: {
    enabled: boolean;
    unresolvedCashVariance: number | null;
    unavailable: boolean;
    state: string;
  };
};
