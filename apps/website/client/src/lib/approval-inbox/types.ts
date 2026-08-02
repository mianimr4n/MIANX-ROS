/**
 * RC6-DASH-04 — Owner Approval Inbox (DRILL_DOWN maturity only).
 */

export type ApprovalOwnerStatus = "PENDING" | "NEEDS_REVIEW" | "OVERDUE" | "BLOCKED";

export type ApprovalPriority = "URGENT" | "HIGH" | "NORMAL";

export type ApprovalTrustState = "LIVE" | "PARTIAL_LIVE" | "DERIVED" | "UNAVAILABLE";

export type ApprovalTypeId =
  | "APR-PO-PENDING"
  | "APR-CASH-CLOSE"
  | "APR-EXPENSE"
  | "APR-LEAVE";

export type ApprovalDomain = "purchasing" | "finance" | "hr";

export type OwnerApprovalSummary = {
  id: ApprovalTypeId;
  approvalType: ApprovalTypeId;
  domain: ApprovalDomain;
  title: string;
  summary: string;
  status: ApprovalOwnerStatus;
  priority: ApprovalPriority;
  priorityReason: string;
  branchId: string | null;
  branchName: string;
  count: number;
  source: string;
  trustState: ApprovalTrustState;
  destinationHref: string;
  destinationLabel: string;
  actionMaturity: "DRILL_DOWN";
  limitation?: string;
  /** Mode emphasis tags for DASH-03 integration */
  modeEmphasis: Array<"PRE_OPEN" | "LIVE_OPERATIONS" | "CLOSING">;
};

export type ApprovalSourceState = {
  id: string;
  label: string;
  unavailable: boolean;
  permissionRestricted?: boolean;
};

export type ApprovalInboxResult = {
  items: OwnerApprovalSummary[];
  totalPendingCount: number;
  urgentCount: number;
  sources: ApprovalSourceState[];
  unavailableSources: string[];
  partialFailure: boolean;
  totalFailure: boolean;
  /** True only when every selected source loaded and zero pending. */
  allClearSupported: boolean;
  deferredDomainsNote: string;
};

export const DEFERRED_APPROVAL_DOMAINS = [
  "Refunds",
  "Payroll run approval (amount-sensitive)",
  "Attendance corrections",
  "Loyalty reward approval",
  "Marketing campaign approval",
  "Menu price approval",
  "Role/config changes",
  "AI recommendations",
  "Inventory waste approval queue",
  "Purchase requisition approve endpoint",
] as const;
