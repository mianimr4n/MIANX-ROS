/** Shared order display helpers for Admin Orders Management. */

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

/** Map stored status → kitchen lane label (derived, not KDS). */
export function kitchenStatusLabel(status: string): string {
  switch (status) {
    case "pending":
    case "confirmed":
      return "Queued";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "dispatched":
    case "completed":
      return "Done";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/** Map stored status → delivery lane label (derived, not GPS). */
export function deliveryStatusLabel(status: string, orderType: string): string {
  if (orderType !== "delivery") return "N/A";
  switch (status) {
    case "ready":
      return "Awaiting dispatch";
    case "dispatched":
      return "Out for delivery";
    case "completed":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not dispatched";
  }
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
    pending: "Received",
    confirmed: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    dispatched: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}
