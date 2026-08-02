/**
 * RC6-DASH-07 — Read-only EOD Pack foundation (preview only; never FINAL/CLOSED).
 */

export type EodPackState = "DRAFT" | "PARTIAL" | "REVIEWABLE" | "INSUFFICIENT_DATA";

export type EodConfidence = "HIGH" | "MEDIUM" | "LOW";

export type EodFreshness = "LIVE" | "FRESH" | "STALE" | "PARTIAL" | "UNAVAILABLE";

export type EodTrustState =
  | "LIVE"
  | "DERIVED"
  | "ACCOUNTING"
  | "ESTIMATED"
  | "FOUNDATION"
  | "STALE"
  | "UNAVAILABLE";

export type EodSectionId =
  | "pack-identity"
  | "sales-orders"
  | "kitchen"
  | "delivery"
  | "cash-finance"
  | "stock"
  | "exceptions-approvals"
  | "branch-health"
  | "closing-gaps"
  | "source-coverage";

export type EodMetric = {
  metricId: string;
  label: string;
  value: string | null;
  rawValue: number | string | null;
  unit: "PKR" | "count" | "ratio" | "text" | "percent";
  maturity: string;
  source: string;
  businessWindow: string;
  limitation?: string;
  drillDown?: { href: string; label: string };
};

export type EodUnresolvedItem = {
  type: string;
  domain: string;
  severity: "CRITICAL" | "WARNING" | "INFORMATION";
  count: number;
  branchId: string | null;
  branchName: string;
  oldestAt: string | null;
  source: string;
  trustState: EodTrustState;
  drillDown: { href: string; label: string };
  limitation?: string;
};

export type EodSection = {
  sectionId: EodSectionId;
  title: string;
  trustState: EodTrustState;
  freshnessState: EodFreshness;
  coverage: "full" | "partial" | "unavailable" | "restricted" | "empty";
  metrics: EodMetric[];
  unresolvedItems: EodUnresolvedItem[];
  sourceDetails: string[];
  drillDowns: Array<{ href: string; label: string }>;
  limitations: string[];
  /** When true, section is omitted from coverage denominator (permission). */
  permissionRestricted?: boolean;
  /** When true, section counts toward configured coverage when evaluated. */
  countsTowardCoverage: boolean;
  evaluated: boolean;
};

export type EodExportCapabilities = {
  printFriendly: true;
  csv: true;
  json: true;
  pdf: false;
  xlsx: false;
  email: false;
  whatsapp: false;
};

export type EodPack = {
  packId: string;
  organizationId: null;
  branchId: string | null;
  branchName: string;
  businessDate: string;
  timezone: string;
  generatedAt: string;
  generatedByContext: "Owner Command Center preview";
  state: EodPackState;
  confidence: EodConfidence;
  sourceCoveragePercent: number;
  freshnessState: EodFreshness;
  sections: EodSection[];
  unresolvedItems: EodUnresolvedItem[];
  excludedDomains: string[];
  limitations: string[];
  exportCapabilities: EodExportCapabilities;
  actionMaturity: "DRILL_DOWN";
  /** Explicit non-final wording for UI. */
  previewLabel: "EOD Pack preview";
};

export type EodPackBuildInput = {
  branchId: string | null;
  branchName: string;
  nowMs?: number;
  timezone?: string | null;
  financeEnabled: boolean;
  purchasingEnabled?: boolean;
  hrEnabled?: boolean;
  ops: {
    data: {
      generatedAt: string;
      timezone?: string;
      dayStart?: string;
      kpis: {
        todayGrossSales: number;
        todayOrders: number;
        averageOrderValue: number | null;
        activeOrders: number;
        kitchenWaiting?: number;
        activeDeliveries?: number;
        lowStockCount: number;
      };
      statusCounts: Record<string, number>;
    } | null;
    state: string;
  };
  kitchen: {
    tickets: Array<{ id: string; status: string }> | null;
    state: string;
  };
  delivery: {
    assignments: Array<{ id: string; status: string; orderStatus?: string | null }> | null;
    state: string;
  };
  exceptionCenter: {
    exceptions: Array<{
      type: string;
      domain: string;
      severity: "CRITICAL" | "WARNING" | "INFORMATION";
      count: number;
      title: string;
      oldestAt: string | null;
      source: string;
      trustState: string;
      drillDown: { href: string; label: string };
      limitation?: string;
    }>;
    totalFailure: boolean;
    partialFailure: boolean;
    unavailableSources: string[];
  };
  approvalInbox: {
    items: Array<{
      approvalType: string;
      domain: string;
      priority: string;
      count: number;
      title: string;
      source: string;
      destinationHref: string;
      destinationLabel: string;
    }>;
    totalPendingCount: number;
    urgentCount: number;
    totalFailure: boolean;
    deferredDomainsNote: string;
  };
  branchHealth: {
    score: number | null;
    scoreState: string;
    statusLabel: string;
    confidence: string;
    coveragePercent: number;
    freshnessState: string;
  };
  profitability: {
    operationalState: string;
    accountingState: string;
    accountingPeriod: string | null;
    operationalCoverage: number;
    accountingCoverage: number;
  };
  financeAttention?: {
    unavailable: boolean;
    unresolvedCashVariance: number | null;
    cashClosesAwaitingApproval: number | null;
    pendingExpenseApprovals: number | null;
  } | null;
};
