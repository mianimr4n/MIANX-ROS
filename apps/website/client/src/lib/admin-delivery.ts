/** Delivery Management helpers — visual labels only; no invented GPS/ETA/failed transitions. */

export const DELIVERY_ACTIVE_STATUSES = ["pending", "assigned", "picked-up"] as const;
export const DELIVERY_ALL_FILTER_STATUSES = [
  "pending",
  "assigned",
  "picked-up",
  "delivered",
  "failed",
  "cancelled",
] as const;

/** Display threshold for “late” — not an API SLA. */
export const DELIVERY_LATE_MINUTES = 45;

export function deliveryStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Waiting for rider",
    assigned: "Assigned",
    "picked-up": "Out for delivery",
    delivered: "Delivered",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export function deliveryStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-950";
    case "assigned":
      return "bg-sky-50 text-sky-950";
    case "picked-up":
      return "bg-indigo-50 text-indigo-950";
    case "delivered":
      return "bg-emerald-50 text-emerald-900";
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-900";
    default:
      return "bg-[var(--admin-soft)] text-[var(--admin-muted)]";
  }
}

export function elapsedMinutes(fromIso: string, now = Date.now()): number {
  const start = new Date(fromIso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 60_000));
}

/** Prefer picked-up → assigned for in-flight elapsed. Never use createdAt for late clocks. */
export function deliveryTimerStartIso(row: {
  pickedUpAt: string | null;
  assignedAt: string | null;
  createdAt: string;
}): string | null {
  return row.pickedUpAt ?? row.assignedAt ?? null;
}

/** @deprecated Prefer deliveryTimerStartIso + classifyDeliveryLate from operational-truth. */
export function deliveryCreatedFallbackIso(row: { createdAt: string }): string {
  return row.createdAt;
}

export function timerTone(minutes: number): "green" | "yellow" | "red" {
  if (minutes >= DELIVERY_LATE_MINUTES) return "red";
  if (minutes >= Math.floor(DELIVERY_LATE_MINUTES * 0.7)) return "yellow";
  return "green";
}

export function timerToneClass(tone: "green" | "yellow" | "red"): string {
  switch (tone) {
    case "red":
      return "bg-red-50 text-red-900 border-red-200";
    case "yellow":
      return "bg-amber-50 text-amber-950 border-amber-200";
    default:
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
  }
}

export function areaFromAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "—";
  const part = trimmed.split(",")[0]?.trim() || trimmed;
  return part.length > 40 ? `${part.slice(0, 37)}…` : part;
}

export function averageDeliveryMinutes(
  rows: Array<{ assignedAt: string | null; pickedUpAt: string | null; deliveredAt: string | null }>,
): number | null {
  const samples: number[] = [];
  for (const row of rows) {
    if (!row.deliveredAt) continue;
    const startIso = row.pickedUpAt ?? row.assignedAt;
    if (!startIso) continue;
    const start = new Date(startIso).getTime();
    const end = new Date(row.deliveredAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    samples.push((end - start) / 60_000);
  }
  if (samples.length === 0) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export function isKarachiToday(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  try {
    return formatter.format(new Date(iso)) === formatter.format(now);
  } catch {
    return false;
  }
}

export function currentShiftLabel(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "12",
  );
  if (hour < 16) return "Day shift (display only)";
  return "Evening shift (display only)";
}

export function isOnlineRiderStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "available" || normalized === "online" || normalized === "active";
}
