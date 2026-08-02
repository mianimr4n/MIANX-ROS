/**
 * RC6-DASH-08 — What Changed + operational timeline foundation (read-only).
 */

export type WhatChangedPersistence = "PERSISTED" | "DERIVED" | "BROWSER_LOCAL";

export type WhatChangedTrustState =
  | "LIVE"
  | "DERIVED"
  | "FOUNDATION"
  | "STALE"
  | "UNAVAILABLE";

export type WhatChangedDomain =
  | "orders"
  | "kitchen"
  | "delivery"
  | "inventory"
  | "purchasing"
  | "finance"
  | "people"
  | "exceptions"
  | "branch-health"
  | "system"
  | "configuration";

export type WhatChangedSeverity = "CRITICAL" | "WARNING" | "INFORMATION" | "NEUTRAL";

export type SinceAnchorKind =
  | "BROWSER_LOCAL_REVIEW"
  | "BUSINESS_WINDOW"
  | "PREVIOUS_LOGIN_UNAVAILABLE";

export type WhatChangedConfidence = "HIGH" | "MEDIUM" | "LOW";

export type WhatChangedCoverageState =
  | "COMPARABLE"
  | "PARTIAL"
  | "NO_BASELINE"
  | "SOURCE_FAILURE"
  | "INSUFFICIENT";

export type SafeMetricId =
  | "grossSales"
  | "orderCount"
  | "lowStockCount"
  | "delayedKitchenCount"
  | "pendingApprovals"
  | "criticalExceptions"
  | "warningExceptions"
  | "branchHealthScore"
  | "activeDeliveries"
  | "openOrders";

export type SafeMetricSnapshot = {
  version: 1;
  reviewedAt: string;
  branchId: string | null;
  businessWindow: string;
  metrics: Partial<Record<SafeMetricId, number | null>>;
  sourceOk: {
    ops: boolean;
    kitchen: boolean;
    delivery: boolean;
    approvals: boolean;
    exceptions: boolean;
    health: boolean;
  };
};

export type DerivedChange = {
  metricId: SafeMetricId;
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  direction: "up" | "down" | "flat" | "unavailable";
  tone: "positive" | "negative" | "neutral" | "attention";
  comparisonStart: string;
  comparisonEnd: string;
  branchId: string | null;
  businessWindow: string;
  source: string;
  trustState: WhatChangedTrustState;
  persistenceState: WhatChangedPersistence;
  drillDown: { href: string; label: string };
  limitation?: string;
};

export type TimelineEvent = {
  id: string;
  eventType: string;
  domain: WhatChangedDomain;
  title: string;
  summary: string;
  occurredAt: string;
  organizationId: null;
  branchId: string | null;
  branchName: string;
  actorType: "system" | "unavailable";
  actorDisplaySafe: string;
  entityType: string;
  severity: WhatChangedSeverity;
  source: string;
  trustState: WhatChangedTrustState;
  persistenceState: WhatChangedPersistence;
  correlationReferenceSafe: null;
  drillDown: { href: string; label: string };
  limitation?: string;
};

export type WhatChangedSummary = {
  sinceLabel: string;
  sinceAnchorKind: SinceAnchorKind;
  comparisonStart: string | null;
  comparisonEnd: string;
  branchId: string | null;
  branchName: string;
  businessWindow: string;
  coverageState: WhatChangedCoverageState;
  confidence: WhatChangedConfidence;
  sourceCoveragePercent: number;
  changes: DerivedChange[];
  unavailableDomains: string[];
  limitations: string[];
  totalFailure: boolean;
  partialFailure: boolean;
  hasBaseline: boolean;
  actionMaturity: "DRILL_DOWN";
};

export type OperationalTimeline = {
  events: TimelineEvent[];
  truncated: boolean;
  boundedCount: number;
  totalCandidateCount: number;
  emptyHonestMessage: string;
  limitations: string[];
  partialFailure: boolean;
  totalFailure: boolean;
  unavailableDomains: string[];
};
