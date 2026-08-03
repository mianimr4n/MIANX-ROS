/**
 * POLISH-03 — Canonical operations status presentation labels.
 * Maps repository enums only; does not invent or merge statuses.
 */

export type OperationsDomain = "order" | "delivery" | "kitchen";

export type OperationsStatusMapping = {
  domain: OperationsDomain;
  value: string;
  label: string;
  notes?: string;
};

/** Order statuses from `admin-order-format` / transitions contract. */
export const ORDER_STATUS_PRESENTATION: OperationsStatusMapping[] = [
  { domain: "order", value: "pending", label: "Pending confirmation" },
  { domain: "order", value: "confirmed", label: "Accepted" },
  { domain: "order", value: "preparing", label: "Preparing" },
  { domain: "order", value: "ready", label: "Ready" },
  {
    domain: "order",
    value: "dispatched",
    label: "Out for delivery",
    notes: "Fulfillment in transit; not a separate delivery assignment status.",
  },
  { domain: "order", value: "completed", label: "Completed" },
  { domain: "order", value: "cancelled", label: "Cancelled" },
];

/** Delivery assignment statuses from ops delivery operations. */
export const DELIVERY_STATUS_PRESENTATION: OperationsStatusMapping[] = [
  {
    domain: "delivery",
    value: "pending",
    label: "Waiting for rider",
    notes: "Unassigned / awaiting assignment.",
  },
  { domain: "delivery", value: "assigned", label: "Assigned" },
  { domain: "delivery", value: "picked-up", label: "Picked up / out for delivery" },
  { domain: "delivery", value: "delivered", label: "Delivered" },
  { domain: "delivery", value: "failed", label: "Failed" },
  { domain: "delivery", value: "cancelled", label: "Cancelled" },
];

/** Kitchen ticket statuses. */
export const KITCHEN_STATUS_PRESENTATION: OperationsStatusMapping[] = [
  { domain: "kitchen", value: "queued", label: "Queued" },
  { domain: "kitchen", value: "accepted", label: "Accepted" },
  { domain: "kitchen", value: "preparing", label: "Preparing" },
  { domain: "kitchen", value: "ready", label: "Ready" },
  { domain: "kitchen", value: "completed", label: "Completed" },
  { domain: "kitchen", value: "cancelled", label: "Cancelled" },
];

export const OPERATIONS_DATA_STATES = [
  "LOADING",
  "LIVE",
  "EMPTY",
  "FILTERED_EMPTY",
  "PARTIAL",
  "STALE",
  "UNAVAILABLE",
  "CONFIGURATION_REQUIRED",
  "PERMISSION_RESTRICTED",
  "ERROR",
] as const;

export type OperationsDataState = (typeof OPERATIONS_DATA_STATES)[number];

export function presentOrderStatus(status: string): string {
  return ORDER_STATUS_PRESENTATION.find((row) => row.value === status)?.label ?? status;
}

export function presentDeliveryStatus(status: string): string {
  return DELIVERY_STATUS_PRESENTATION.find((row) => row.value === status)?.label ?? status;
}

export function presentKitchenStatus(status: string): string {
  return KITCHEN_STATUS_PRESENTATION.find((row) => row.value === status)?.label ?? status;
}
