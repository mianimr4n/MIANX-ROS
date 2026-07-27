/**
 * Operational truth presentation contracts.
 * Order status, kitchen tickets, and delivery assignments stay distinct.
 */

export const ORDER_LIFECYCLE = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "completed",
] as const;

export type KitchenRelationship =
  | "NOT_SENT_TO_KITCHEN"
  | "TICKET_QUEUED"
  | "TICKET_ACCEPTED"
  | "TICKET_PREPARING"
  | "TICKET_READY"
  | "TICKET_COMPLETED"
  | "TICKET_CANCELLED"
  | "TICKET_UNAVAILABLE"
  | "TICKET_ERROR";

export type DeliveryRelationship =
  | "NOT_READY_FOR_DELIVERY"
  | "AWAITING_ORDER_CONFIRMATION"
  | "WAITING_FOR_RIDER"
  | "RIDER_ASSIGNED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "NOT_APPLICABLE"
  | "DELIVERY_UNAVAILABLE"
  | "DELIVERY_ERROR";

export type LateClassification = "LATE" | "ON_TIME" | "NOT_APPLICABLE" | "UNAVAILABLE";

/** Kitchen relationship from order status when ticket row is not on the list payload. */
export function kitchenRelationshipFromOrderStatus(orderStatus: string): KitchenRelationship {
  switch (orderStatus) {
    case "pending":
      return "NOT_SENT_TO_KITCHEN";
    case "confirmed":
      // Confirm contract creates exactly one kitchen ticket (queued).
      return "TICKET_QUEUED";
    case "preparing":
      return "TICKET_PREPARING";
    case "ready":
      return "TICKET_READY";
    case "dispatched":
    case "completed":
      return "TICKET_COMPLETED";
    case "cancelled":
      return "TICKET_CANCELLED";
    default:
      return "TICKET_UNAVAILABLE";
  }
}

export function kitchenRelationshipLabel(rel: KitchenRelationship): string {
  switch (rel) {
    case "NOT_SENT_TO_KITCHEN":
      return "Not sent to kitchen";
    case "TICKET_QUEUED":
      return "Queued";
    case "TICKET_ACCEPTED":
      return "Accepted";
    case "TICKET_PREPARING":
      return "Preparing";
    case "TICKET_READY":
      return "Ready";
    case "TICKET_COMPLETED":
      return "Done";
    case "TICKET_CANCELLED":
      return "Cancelled";
    case "TICKET_ERROR":
      return "Kitchen unavailable";
    case "TICKET_UNAVAILABLE":
    default:
      return "Unavailable";
  }
}

/** Orders-grid delivery relationship from order status (not delivery-row status alone). */
export function deliveryRelationshipFromOrder(
  orderStatus: string,
  orderType: string,
): DeliveryRelationship {
  if (orderType !== "delivery") return "NOT_APPLICABLE";
  switch (orderStatus) {
    case "pending":
      return "AWAITING_ORDER_CONFIRMATION";
    case "confirmed":
    case "preparing":
      return "NOT_READY_FOR_DELIVERY";
    case "ready":
      return "WAITING_FOR_RIDER";
    case "dispatched":
      return "OUT_FOR_DELIVERY";
    case "completed":
      return "DELIVERED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "DELIVERY_UNAVAILABLE";
  }
}

export function deliveryRelationshipLabel(rel: DeliveryRelationship): string {
  switch (rel) {
    case "AWAITING_ORDER_CONFIRMATION":
      return "Awaiting confirmation";
    case "NOT_READY_FOR_DELIVERY":
      return "Not ready for dispatch";
    case "WAITING_FOR_RIDER":
      return "Waiting for rider";
    case "RIDER_ASSIGNED":
      return "Assigned";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "NOT_APPLICABLE":
      return "N/A";
    case "DELIVERY_ERROR":
      return "Delivery unavailable";
    case "DELIVERY_UNAVAILABLE":
    default:
      return "Unavailable";
  }
}

/** True when delivery row exists only as provisional record before order confirmation. */
export function isProvisionalDelivery(input: {
  deliveryStatus: string;
  orderStatus: string;
}): boolean {
  return input.orderStatus === "pending" && input.deliveryStatus === "pending";
}

/**
 * Late only after a real dispatch lifecycle start (assigned/picked-up)
 * while still in an active dispatch state.
 */
export function classifyDeliveryLate(input: {
  deliveryStatus: string;
  orderStatus: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  nowMs?: number;
  lateMinutes?: number;
}): LateClassification {
  if (isProvisionalDelivery(input) || input.orderStatus === "pending") {
    return "NOT_APPLICABLE";
  }
  const active =
    input.deliveryStatus === "assigned" || input.deliveryStatus === "picked-up";
  if (!active) {
    if (input.deliveryStatus === "pending") {
      // Order confirmed+ but still waiting for rider — age from assign only after assign.
      return "NOT_APPLICABLE";
    }
    return "NOT_APPLICABLE";
  }
  const startIso = input.pickedUpAt ?? input.assignedAt;
  if (!startIso) return "UNAVAILABLE";
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return "UNAVAILABLE";
  const threshold = input.lateMinutes ?? 45;
  const elapsed = Math.max(0, Math.floor(((input.nowMs ?? Date.now()) - start) / 60_000));
  return elapsed >= threshold ? "LATE" : "ON_TIME";
}

/** Dispatch-queue eligible: kitchen-ready orders waiting for rider — never unconfirmed. */
export function isDispatchWaitingForRider(input: {
  deliveryStatus: string;
  orderStatus: string;
}): boolean {
  if (isProvisionalDelivery(input)) return false;
  if (input.deliveryStatus !== "pending") return false;
  // Rider assignment readiness begins when the order is ready for dispatch.
  return input.orderStatus === "ready";
}

export function canAssignRider(input: {
  deliveryStatus: string;
  orderStatus: string;
}): boolean {
  if (isProvisionalDelivery(input) || input.orderStatus === "pending") return false;
  if (input.deliveryStatus !== "pending") return false;
  return input.orderStatus === "ready";
}

export const CANONICAL_STAFF_ROLE_CODES = [
  "super-admin",
  "branch-manager",
  "kitchen",
  "cashier",
  "rider",
  "customer-support",
  "host",
  "waiter",
] as const;

export const FORBIDDEN_ROLE_CODES = ["owner", "founder", "general-staff", "delivery"] as const;
