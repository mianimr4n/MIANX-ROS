/**
 * Deterministic priority for DASH-04 Approval Inbox.
 * No invented financial thresholds — status + domain criticality only.
 */

import type { ApprovalPriority, ApprovalTypeId } from "./types";

const PRIORITY_RANK: Record<ApprovalPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
};

/** Stable secondary order when priority ties. */
const TYPE_ORDER: ApprovalTypeId[] = [
  "APR-CASH-CLOSE",
  "APR-EXPENSE",
  "APR-PO-PENDING",
  "APR-LEAVE",
];

export function priorityRank(priority: ApprovalPriority): number {
  return PRIORITY_RANK[priority];
}

export function typeOrderRank(type: ApprovalTypeId): number {
  const idx = TYPE_ORDER.indexOf(type);
  return idx < 0 ? 99 : idx;
}

export function compareApprovalPriority(
  a: { priority: ApprovalPriority; approvalType: ApprovalTypeId; count: number },
  b: { priority: ApprovalPriority; approvalType: ApprovalTypeId; count: number },
): number {
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
  if (byPriority !== 0) return byPriority;
  const byType = typeOrderRank(a.approvalType) - typeOrderRank(b.approvalType);
  if (byType !== 0) return byType;
  return b.count - a.count;
}

/**
 * Domain criticality (documented):
 * - Cash close approvals block day-end finance review → URGENT
 * - Expense / PO wait for Owner decision → HIGH
 * - Leave is workforce queue → NORMAL
 */
export function priorityForApprovalType(type: ApprovalTypeId): {
  priority: ApprovalPriority;
  reason: string;
} {
  switch (type) {
    case "APR-CASH-CLOSE":
      return {
        priority: "URGENT",
        reason: "Cash reconciliation awaiting approval blocks end-of-day finance review.",
      };
    case "APR-EXPENSE":
      return {
        priority: "HIGH",
        reason: "Submitted expense claims require Owner/finance decision.",
      };
    case "APR-PO-PENDING":
      return {
        priority: "HIGH",
        reason: "Draft/submitted purchase orders require purchasing approval.",
      };
    case "APR-LEAVE":
      return {
        priority: "NORMAL",
        reason: "Pending leave requests await manager/Owner review.",
      };
  }
}
