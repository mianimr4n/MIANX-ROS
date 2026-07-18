import { ApiError } from "../../common/http.js";

/**
 * DB-R5 kitchen ticket status machine (ticket-level).
 * Order.status remains the OMS authority; ticket transitions may mirror preparing/ready.
 */

export const KITCHEN_TICKET_STATUSES = [
  "queued",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type KitchenTicketStatus = (typeof KITCHEN_TICKET_STATUSES)[number];

export const KITCHEN_TICKET_FINAL_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "cancelled",
]);

/** Allowed next statuses from each non-terminal ticket status. */
const ALLOWED_TRANSITIONS: Record<KitchenTicketStatus, readonly KitchenTicketStatus[]> = {
  queued: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/**
 * When a ticket moves to this status, optionally mirror onto orders.status.
 * `accepted` / `completed` stay ticket-local so delivery dispatch / pickup complete paths stay intact.
 */
export const ORDER_STATUS_MIRROR: Partial<Record<KitchenTicketStatus, string>> = {
  preparing: "preparing",
  ready: "ready",
  cancelled: "cancelled",
};

export function planKitchenTicketTransition(params: {
  currentStatus: string;
  toStatus: string;
}): {
  fromStatus: KitchenTicketStatus;
  toStatus: KitchenTicketStatus;
  idempotentNoop: boolean;
  orderMirrorStatus: string | null;
} {
  if (!KITCHEN_TICKET_STATUSES.includes(params.toStatus as KitchenTicketStatus)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid kitchen ticket status.");
  }

  const toStatus = params.toStatus as KitchenTicketStatus;
  const current = params.currentStatus as KitchenTicketStatus;

  if (current === toStatus) {
    return {
      fromStatus: current,
      toStatus,
      idempotentNoop: true,
      orderMirrorStatus: null,
    };
  }

  if (!KITCHEN_TICKET_STATUSES.includes(current)) {
    throw new ApiError(409, "INVALID_TICKET_TRANSITION", "Ticket is in an unknown state.");
  }

  if (KITCHEN_TICKET_FINAL_STATUSES.has(current)) {
    throw new ApiError(
      409,
      "TICKET_ALREADY_FINAL",
      "Kitchen ticket is in a final state and cannot change.",
    );
  }

  if (!ALLOWED_TRANSITIONS[current].includes(toStatus)) {
    throw new ApiError(
      409,
      "INVALID_TICKET_TRANSITION",
      `Cannot move kitchen ticket from '${current}' to '${toStatus}'.`,
    );
  }

  return {
    fromStatus: current,
    toStatus,
    idempotentNoop: false,
    orderMirrorStatus: ORDER_STATUS_MIRROR[toStatus] ?? null,
  };
}
