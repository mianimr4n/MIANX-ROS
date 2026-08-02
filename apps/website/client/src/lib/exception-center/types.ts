/**
 * RC6-DASH-01 Exception Center — typed read-only model.
 * Presentational components must not read raw DB/API rows.
 */

export type ExceptionSeverity = "CRITICAL" | "WARNING" | "INFORMATION";

export type ExceptionFreshness = "LIVE" | "FRESH" | "STALE" | "UNAVAILABLE";

/** Aligns with KPI Trust Registry terminology used in Command Center contracts. */
export type ExceptionTrustState =
  | "LIVE"
  | "DERIVED"
  | "PARTIAL_LIVE"
  | "FOUNDATION"
  | "STALE"
  | "UNAVAILABLE";

export type ExceptionDomain =
  | "kitchen"
  | "delivery"
  | "inventory"
  | "cash"
  | "orders"
  | "purchasing"
  | "system";

export type ExceptionTypeId =
  | "EXC-KDS-DELAY"
  | "EXC-DEL-UNASSIGNED"
  | "EXC-STOCK-LOW"
  | "EXC-CASH-VAR"
  | "EXC-ORD-PENDING";

export type ExceptionDrillDown = {
  href: string;
  label: string;
  /** Honest note when destination cannot apply a precise filter. */
  limitation?: string;
};

export type OwnerException = {
  id: string;
  type: ExceptionTypeId;
  domain: ExceptionDomain;
  severity: ExceptionSeverity;
  title: string;
  summary: string;
  count: number;
  branchId: string | null;
  branchName: string;
  source: string;
  trustState: ExceptionTrustState;
  observedAt: string | null;
  freshnessState: ExceptionFreshness;
  oldestAt: string | null;
  drillDown: ExceptionDrillDown;
  limitation?: string;
};

export type ExceptionSourceStatus = {
  id: string;
  label: string;
  domain: ExceptionDomain;
  /** True when this source failed or is offline (not merely empty). */
  failed: boolean;
  /** True when source is still first-loading with no payload. */
  loading: boolean;
  /** True when payload is present but marked stale by the fetch layer. */
  stale: boolean;
};

export type ExceptionCenterResult = {
  exceptions: OwnerException[];
  sources: ExceptionSourceStatus[];
  /** True when at least one required source failed. */
  partialFailure: boolean;
  /** True when every required source failed — must not show all-clear. */
  totalFailure: boolean;
  /** True when all required sources succeeded and no exceptions matched. */
  allClear: boolean;
  /** Human-readable unavailable source labels. */
  unavailableSources: string[];
  generatedAt: string;
};
