/** Kitchen Display helpers — visual labels only; no invented backend stations/priorities. */

export const KITCHEN_ACTIVE_STATUSES = ["queued", "accepted", "preparing", "ready"] as const;
export const KITCHEN_ORDER_TYPES = ["delivery", "pickup", "dine-in"] as const;

/** Product stations — display catalog only until kitchen_stations API exists. */
export const KITCHEN_STATION_CATALOG = [
  { id: "pizza", label: "Pizza" },
  { id: "oven", label: "Oven" },
  { id: "packing", label: "Packing" },
  { id: "drinks", label: "Drinks" },
  { id: "desserts", label: "Desserts" },
] as const;

export type KitchenTicketStatus = (typeof KITCHEN_ACTIVE_STATUSES)[number] | "completed" | "cancelled";

/** Target prep minutes for timer colors — operational guidance only, not SLA from API. */
export const PREP_TARGET_MINUTES = 20;
export const PREP_WARN_MINUTES = 15;

export type KitchenPriorityBadge = "normal" | "high" | "delayed";

export function formatModifierLines(snapshot: unknown): string[] {
  if (snapshot == null) return [];
  if (typeof snapshot === "string") {
    const trimmed = snapshot.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(snapshot)) {
    return snapshot
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const row = entry as Record<string, unknown>;
          const label =
            (typeof row.label === "string" && row.label) ||
            (typeof row.option_name === "string" && row.option_name) ||
            (typeof row.name === "string" && row.name) ||
            null;
          const group = typeof row.group_name === "string" ? row.group_name : null;
          if (label && group) return `${group}: ${label}`;
          if (label) return label;
        }
        return null;
      })
      .filter((line): line is string => Boolean(line));
  }
  if (typeof snapshot === "object") {
    try {
      return [JSON.stringify(snapshot)];
    } catch {
      return [];
    }
  }
  return [];
}

export function elapsedMinutes(fromIso: string, now = Date.now()): number {
  const start = new Date(fromIso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 60_000));
}

/** Prefer started → accepted → created for elapsed display. */
export function ticketTimerStartIso(ticket: {
  startedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}): string {
  return ticket.startedAt ?? ticket.acceptedAt ?? ticket.createdAt;
}

export function timerTone(minutes: number): "green" | "yellow" | "red" {
  if (minutes >= PREP_TARGET_MINUTES) return "red";
  if (minutes >= PREP_WARN_MINUTES) return "yellow";
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

/** Visual badges from ticket.priority number + elapsed — no VIP/Urgent backend. */
export function priorityBadges(priority: number, minutesElapsed: number): KitchenPriorityBadge[] {
  const badges: KitchenPriorityBadge[] = [priority > 0 ? "high" : "normal"];
  if (minutesElapsed >= PREP_TARGET_MINUTES) badges.push("delayed");
  return badges;
}

export function priorityBadgeLabel(badge: KitchenPriorityBadge): string {
  switch (badge) {
    case "high":
      return "High";
    case "delayed":
      return "Delayed";
    default:
      return "Normal";
  }
}

export function priorityBadgeClass(badge: KitchenPriorityBadge): string {
  switch (badge) {
    case "high":
      return "bg-orange-50 text-orange-950";
    case "delayed":
      return "bg-red-50 text-red-900";
    default:
      return "bg-[var(--admin-soft)] text-[var(--admin-muted)]";
  }
}

/**
 * Product lifecycle labels.
 * Ticket statuses: Pending (queued) → Accepted → Preparing → Ready → Completed.
 */
export function kitchenTicketStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export function nextKitchenActions(status: string): Array<{ toStatus: string; label: string }> {
  switch (status) {
    case "queued":
      return [
        { toStatus: "accepted", label: "Accept" },
        { toStatus: "preparing", label: "Start preparing" },
      ];
    case "accepted":
      return [{ toStatus: "preparing", label: "Start preparing" }];
    case "preparing":
      return [{ toStatus: "ready", label: "Mark ready" }];
    case "ready":
      return [{ toStatus: "completed", label: "Complete" }];
    default:
      return [];
  }
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

export function averagePrepMinutes(
  tickets: Array<{ startedAt: string | null; readyAt: string | null }>,
): number | null {
  const samples: number[] = [];
  for (const ticket of tickets) {
    if (!ticket.startedAt || !ticket.readyAt) continue;
    const start = new Date(ticket.startedAt).getTime();
    const ready = new Date(ticket.readyAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(ready) || ready < start) continue;
    samples.push((ready - start) / 60_000);
  }
  if (samples.length === 0) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
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

export function formatKitchenClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Karachi",
    });
  } catch {
    return null;
  }
}
