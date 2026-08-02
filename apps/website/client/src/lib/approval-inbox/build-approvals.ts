/**
 * Build Owner Approval Inbox summaries from existing dashboard attention sources.
 * Read-only / DRILL_DOWN only — no mutation.
 */

import { compareApprovalPriority, priorityForApprovalType } from "./priority";
import {
  DEFERRED_APPROVAL_DOMAINS,
  type ApprovalInboxResult,
  type ApprovalSourceState,
  type OwnerApprovalSummary,
} from "./types";

export type BuildApprovalInboxInput = {
  branchId: string | null;
  branchName: string;
  financeEnabled: boolean;
  purchasingEnabled: boolean;
  hrEnabled: boolean;
  procurement: {
    unavailable: boolean;
    pendingPoApprovals: number | null;
  } | null;
  financeAttention: {
    unavailable: boolean;
    cashClosesAwaitingApproval: number | null;
    pendingExpenseApprovals: number | null;
  } | null;
  workforceAttention: {
    unavailable: boolean;
    leaveRequestsAwaitingApproval: number | null;
  } | null;
};

function pushIfPositive(
  items: OwnerApprovalSummary[],
  draft: Omit<OwnerApprovalSummary, "priority" | "priorityReason" | "actionMaturity"> & {
    count: number;
  },
) {
  if (draft.count <= 0) return;
  const { priority, reason } = priorityForApprovalType(draft.approvalType);
  items.push({
    ...draft,
    priority,
    priorityReason: reason,
    actionMaturity: "DRILL_DOWN",
  });
}

export function buildApprovalInbox(input: BuildApprovalInboxInput): ApprovalInboxResult {
  const sources: ApprovalSourceState[] = [];
  const unavailableSources: string[] = [];
  const items: OwnerApprovalSummary[] = [];
  const branchLabel = input.branchName || "Selected scope";

  // Purchasing / PO
  if (!input.purchasingEnabled) {
    sources.push({
      id: "procurement",
      label: "Purchase orders",
      unavailable: true,
      permissionRestricted: true,
    });
  } else if (!input.procurement || input.procurement.unavailable) {
    sources.push({ id: "procurement", label: "Purchase orders", unavailable: true });
    unavailableSources.push("Purchase orders");
  } else {
    sources.push({ id: "procurement", label: "Purchase orders", unavailable: false });
    pushIfPositive(items, {
      id: "APR-PO-PENDING",
      approvalType: "APR-PO-PENDING",
      domain: "purchasing",
      title: "Purchase orders awaiting approval",
      summary: `${input.procurement.pendingPoApprovals ?? 0} draft/submitted purchase order(s) in ${branchLabel}.`,
      status: "PENDING",
      branchId: input.branchId,
      branchName: branchLabel,
      count: input.procurement.pendingPoApprovals ?? 0,
      source: "Purchasing PO list (draft/submitted)",
      trustState: "PARTIAL_LIVE",
      destinationHref: "/admin/purchasing",
      destinationLabel: "Open Purchasing approvals",
      limitation: "Destination shows the purchasing queue; exact PO filter depends on Purchasing UI.",
      modeEmphasis: ["PRE_OPEN", "LIVE_OPERATIONS", "CLOSING"],
    });
  }

  // Finance
  if (!input.financeEnabled) {
    sources.push({
      id: "finance",
      label: "Finance approvals",
      unavailable: true,
      permissionRestricted: true,
    });
  } else if (!input.financeAttention || input.financeAttention.unavailable) {
    sources.push({ id: "finance", label: "Finance approvals", unavailable: true });
    unavailableSources.push("Finance approvals");
  } else {
    sources.push({ id: "finance", label: "Finance approvals", unavailable: false });
    pushIfPositive(items, {
      id: "APR-CASH-CLOSE",
      approvalType: "APR-CASH-CLOSE",
      domain: "finance",
      title: "Cash closes awaiting approval",
      summary: `${input.financeAttention.cashClosesAwaitingApproval ?? 0} submitted cash reconciliation(s) need approval.`,
      status: "PENDING",
      branchId: input.branchId,
      branchName: branchLabel,
      count: input.financeAttention.cashClosesAwaitingApproval ?? 0,
      source: "Finance attention (cash_reconciliations submitted)",
      trustState: "PARTIAL_LIVE",
      destinationHref: "/admin/finance",
      destinationLabel: "Open Finance cash closes",
      limitation: "Amounts and requester identity are not shown in this summary.",
      modeEmphasis: ["CLOSING", "LIVE_OPERATIONS"],
    });
    pushIfPositive(items, {
      id: "APR-EXPENSE",
      approvalType: "APR-EXPENSE",
      domain: "finance",
      title: "Expense claims awaiting approval",
      summary: `${input.financeAttention.pendingExpenseApprovals ?? 0} submitted expense claim(s) need review.`,
      status: "PENDING",
      branchId: input.branchId,
      branchName: branchLabel,
      count: input.financeAttention.pendingExpenseApprovals ?? 0,
      source: "Finance attention (expense_claims submitted)",
      trustState: "PARTIAL_LIVE",
      destinationHref: "/admin/finance",
      destinationLabel: "Open Finance expenses",
      limitation: "Claim amounts and employee PII are omitted from the inbox card.",
      modeEmphasis: ["LIVE_OPERATIONS", "CLOSING"],
    });
  }

  // HR leave
  if (!input.hrEnabled) {
    sources.push({
      id: "hr",
      label: "Leave approvals",
      unavailable: true,
      permissionRestricted: true,
    });
  } else if (!input.workforceAttention || input.workforceAttention.unavailable) {
    sources.push({ id: "hr", label: "Leave approvals", unavailable: true });
    unavailableSources.push("Leave approvals");
  } else {
    sources.push({ id: "hr", label: "Leave approvals", unavailable: false });
    pushIfPositive(items, {
      id: "APR-LEAVE",
      approvalType: "APR-LEAVE",
      domain: "hr",
      title: "Leave requests awaiting approval",
      summary: `${input.workforceAttention.leaveRequestsAwaitingApproval ?? 0} pending leave request(s).`,
      status: "PENDING",
      branchId: input.branchId,
      branchName: branchLabel,
      count: input.workforceAttention.leaveRequestsAwaitingApproval ?? 0,
      source: "HR attention (leave requests PENDING)",
      trustState: "PARTIAL_LIVE",
      destinationHref: "/admin/hr",
      destinationLabel: "Open HR leave queue",
      limitation: "Employee names and leave reasons are not shown in this summary.",
      modeEmphasis: ["PRE_OPEN", "LIVE_OPERATIONS"],
    });
  }

  items.sort(compareApprovalPriority);

  const enabledSources = sources.filter((s) => !s.permissionRestricted);
  const failedEnabled = enabledSources.filter((s) => s.unavailable);
  const totalFailure =
    enabledSources.length > 0 && failedEnabled.length === enabledSources.length && items.length === 0;
  const partialFailure = failedEnabled.length > 0 && !totalFailure;
  const totalPendingCount = items.reduce((sum, item) => sum + item.count, 0);
  const urgentCount = items.filter((i) => i.priority === "URGENT").reduce((s, i) => s + i.count, 0);
  const allClearSupported =
    enabledSources.length > 0 &&
    failedEnabled.length === 0 &&
    items.length === 0 &&
    !totalFailure;

  return {
    items,
    totalPendingCount,
    urgentCount,
    sources,
    unavailableSources,
    partialFailure,
    totalFailure,
    allClearSupported,
    deferredDomainsNote: `Deferred approval domains: ${DEFERRED_APPROVAL_DOMAINS.slice(0, 5).join(", ")}, and more.`,
  };
}

export function filterApprovalItems(
  items: OwnerApprovalSummary[],
  filters: {
    domain?: string;
    priority?: string;
  },
): OwnerApprovalSummary[] {
  const domain = (filters.domain ?? "").trim().toLowerCase();
  const priority = (filters.priority ?? "").trim().toUpperCase();
  const allowedDomains = new Set(["purchasing", "finance", "hr"]);
  const allowedPriorities = new Set(["URGENT", "HIGH", "NORMAL"]);
  const domainOk = domain && allowedDomains.has(domain) ? domain : "";
  const priorityOk = priority && allowedPriorities.has(priority) ? priority : "";

  return items.filter((item) => {
    if (domainOk && item.domain !== domainOk) return false;
    if (priorityOk && item.priority !== priorityOk) return false;
    return true;
  });
}

/** Reorder for command-mode emphasis without dropping urgent items. */
export function emphasizeApprovalsForMode(
  items: OwnerApprovalSummary[],
  mode: "PRE_OPEN" | "LIVE_OPERATIONS" | "CLOSING",
): OwnerApprovalSummary[] {
  const urgent = items.filter((i) => i.priority === "URGENT");
  const rest = items.filter((i) => i.priority !== "URGENT");
  const emphasized = rest.filter((i) => i.modeEmphasis.includes(mode));
  const other = rest.filter((i) => !i.modeEmphasis.includes(mode));
  return [...urgent, ...emphasized, ...other];
}

export function buildApprovalDrillDownAriaLabel(item: OwnerApprovalSummary): string {
  return `Review ${item.priority.toLowerCase()}-priority ${item.title} for ${item.branchName}. Count ${item.count}. Status ${item.status}.`;
}
