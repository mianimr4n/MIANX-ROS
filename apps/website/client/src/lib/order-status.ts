/** Shared order status helpers for tracking + My Telepizza hub. */

export const ORDER_STATUS_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "completed",
] as const;

export type OrderStatusStep = (typeof ORDER_STATUS_STEPS)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  dispatched: "Dispatched",
  completed: "Delivered / collected",
  delivered: "Delivered / collected",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

export type OrderStatusBucket = "active" | "completed" | "cancelled";

export function normalizeOrderStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function bucketForOrderStatus(status: string): OrderStatusBucket {
  const normalized = normalizeOrderStatus(status);
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "completed" || normalized === "delivered") return "completed";
  return "active";
}

export function isTerminalOrderStatus(status: string): boolean {
  return bucketForOrderStatus(status) !== "active";
}

export function statusStepIndex(status: string): number {
  const normalized = normalizeOrderStatus(status);
  if (normalized === "delivered") return ORDER_STATUS_STEPS.indexOf("completed");
  return ORDER_STATUS_STEPS.indexOf(normalized as OrderStatusStep);
}
