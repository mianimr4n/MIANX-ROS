import { ApiError } from "../../common/http.js";

/**
 * Sprint 4.5 + 4.6 — Branch / delivery order lifecycle state machine.
 *
 * Authority: docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md §3 (FROZEN).
 * Uses the frozen `orders.status` enum only — never invents enum values.
 * "reject" is NOT a status; it is `cancelled` + reason `rejected_by_branch` (frozen §3.4).
 * Sprint 4.6 adds `dispatch` (ready→dispatched) and `complete` (ready|dispatched→completed).
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Terminal statuses no branch-order action may leave. */
export const FINAL_STATUSES: ReadonlySet<string> = new Set(["completed", "cancelled"]);

export const ORDER_TYPES = ["delivery", "pickup", "dine-in"] as const;

/** Frozen reason codes (architecture §3.4). */
export const STAFF_CANCEL_REASON_CODES: ReadonlySet<string> = new Set([
  "staff_cancelled",
  "rejected_by_branch",
  "duplicate",
  "test",
]);

export type BranchOrderAction =
  | "confirm"
  | "reject"
  | "preparing"
  | "ready"
  | "dispatch"
  | "complete"
  | "cancel";

interface TransitionRule {
  /** Statuses from which the action is valid. */
  from: OrderStatus[];
  /** Target status (all map into the frozen enum). */
  to: OrderStatus;
  /** Base permission required (checked in the route via requirePermission). */
  permission: "order.manage";
  /** Whether a reason code is mandatory. */
  reasonRequired: boolean;
  /** Default reason code when none supplied. */
  defaultReasonCode?: string;
  /** Statuses for which only branch-manager / super-admin may act (frozen §3.4). */
  managerOnlyFromStatuses?: OrderStatus[];
}

export const TRANSITION_RULES: Record<BranchOrderAction, TransitionRule> = {
  confirm: { from: ["pending"], to: "confirmed", permission: "order.manage", reasonRequired: false },
  reject: {
    from: ["pending", "confirmed"],
    to: "cancelled",
    permission: "order.manage",
    reasonRequired: false,
    defaultReasonCode: "rejected_by_branch",
  },
  preparing: { from: ["confirmed"], to: "preparing", permission: "order.manage", reasonRequired: false },
  ready: { from: ["preparing"], to: "ready", permission: "order.manage", reasonRequired: false },
  /** Delivery out-for-delivery mirror (Sprint 4.6). */
  dispatch: { from: ["ready"], to: "dispatched", permission: "order.manage", reasonRequired: false },
  /**
   * Pickup / dine-in: ready → completed.
   * Delivery: dispatched → completed (also mirrored from rider `delivered`).
   */
  complete: {
    from: ["ready", "dispatched"],
    to: "completed",
    permission: "order.manage",
    reasonRequired: false,
  },
  cancel: {
    from: ["pending", "confirmed", "preparing", "ready"],
    to: "cancelled",
    permission: "order.manage",
    reasonRequired: true,
    managerOnlyFromStatuses: ["preparing", "ready"],
  },
};

export interface TransitionActorScope {
  isSuperAdmin: boolean;
  roles: string[];
}

export interface TransitionPlan {
  action: BranchOrderAction;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  /** allowed source statuses for the conditional (optimistic-lock) update. */
  allowedFromStatuses: OrderStatus[];
  reasonCode: string | null;
  note: string | null;
  /** true when the order is already at the target status (idempotent no-op). */
  idempotentNoop: boolean;
}

function isManager(scope: TransitionActorScope): boolean {
  return scope.isSuperAdmin || scope.roles.includes("branch-manager");
}

/**
 * Validate an action against the current order status + actor scope.
 * Throws stable ApiErrors; returns a plan the service applies with an optimistic lock.
 * Pure: performs NO IO.
 */
export function planTransition(params: {
  action: BranchOrderAction;
  currentStatus: string;
  actor: TransitionActorScope;
  reasonCode?: string | null;
  note?: string | null;
}): TransitionPlan {
  const rule = TRANSITION_RULES[params.action];
  const current = params.currentStatus as OrderStatus;

  // Idempotent repeat: order already at the target status → no-op, no new log.
  if (current === rule.to) {
    return {
      action: params.action,
      fromStatus: current,
      toStatus: rule.to,
      allowedFromStatuses: rule.from,
      reasonCode: null,
      note: null,
      idempotentNoop: true,
    };
  }

  if (FINAL_STATUSES.has(current)) {
    throw new ApiError(409, "ORDER_ALREADY_FINAL", "Order is in a final state and cannot change.");
  }

  if (!rule.from.includes(current)) {
    throw new ApiError(
      409,
      "INVALID_ORDER_TRANSITION",
      `Cannot ${params.action} an order in '${current}' state.`,
    );
  }

  // Late-stage cancel is branch-manager / super-admin only (frozen §3.4).
  if (rule.managerOnlyFromStatuses?.includes(current) && !isManager(params.actor)) {
    throw new ApiError(
      403,
      "ORDER_ACCESS_DENIED",
      "Only a branch manager or super-admin may cancel an order at this stage.",
    );
  }

  const suppliedReason = params.reasonCode?.trim() || "";
  let reasonCode: string | null = null;

  if (params.action === "cancel") {
    if (!suppliedReason) {
      throw new ApiError(400, "VALIDATION_ERROR", "A reasonCode is required to cancel an order.");
    }
    if (!STAFF_CANCEL_REASON_CODES.has(suppliedReason)) {
      throw new ApiError(400, "VALIDATION_ERROR", "reasonCode is not an allowed cancellation reason.");
    }
    reasonCode = suppliedReason;
  } else if (params.action === "reject") {
    reasonCode = suppliedReason || rule.defaultReasonCode || "rejected_by_branch";
    if (reasonCode !== "rejected_by_branch") {
      throw new ApiError(400, "VALIDATION_ERROR", "reject only supports reason 'rejected_by_branch'.");
    }
  } else {
    reasonCode = rule.defaultReasonCode ?? null;
  }

  return {
    action: params.action,
    fromStatus: current,
    toStatus: rule.to,
    allowedFromStatuses: rule.from,
    reasonCode,
    note: params.note?.trim() || null,
    idempotentNoop: false,
  };
}
