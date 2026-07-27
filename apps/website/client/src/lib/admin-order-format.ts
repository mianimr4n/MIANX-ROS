/** Shared order display helpers for Admin Orders Management. */

import {
  deliveryRelationshipFromOrder,
  deliveryRelationshipLabel,
  kitchenRelationshipFromOrderStatus,
  kitchenRelationshipLabel,
} from "@/lib/operational-truth";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "completed",
  "cancelled",
] as const;

export const ORDER_TYPES = ["delivery", "pickup", "dine-in"] as const;
export const ORDER_SOURCES = ["website", "whatsapp", "mobile", "pos", "admin"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function formatPkr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

export function formatOrderTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function formatOrderDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Kitchen relationship label for Orders Management.
 * Pending orders are NOT_SENT_TO_KITCHEN — never "Queued" without a ticket contract.
 */
export function kitchenStatusLabel(status: string): string {
  return kitchenRelationshipLabel(kitchenRelationshipFromOrderStatus(status));
}

/**
 * Delivery relationship for Orders Management (order-status derived).
 * Pending delivery orders await confirmation — not "Waiting for rider".
 */
export function deliveryStatusLabel(status: string, orderType: string): string {
  return deliveryRelationshipLabel(deliveryRelationshipFromOrder(status, orderType));
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-950";
    case "confirmed":
      return "bg-sky-50 text-sky-950";
    case "preparing":
      return "bg-orange-50 text-orange-950";
    case "ready":
      return "bg-emerald-50 text-emerald-900";
    case "dispatched":
      return "bg-indigo-50 text-indigo-950";
    case "completed":
      return "bg-[var(--admin-soft)] text-[var(--admin-ink)]";
    case "cancelled":
      return "bg-red-50 text-red-900";
    default:
      return "bg-[var(--admin-soft)] text-[var(--admin-muted)]";
  }
}

/** Human labels for stored statuses — do not invent new states. */
export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending confirmation",
    confirmed: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    dispatched: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}
