/**
 * Explainable, non-authoritative daily command mode suggestion.
 * Uses a caller-supplied `now` (deterministic clocks in tests).
 */

import {
  COMMAND_MODE_DEFINITIONS,
  type CommandModeConfidence,
  type CommandModeId,
  type ModeSuggestion,
} from "./types";

export const DEFAULT_COMMAND_TIMEZONE = "Asia/Karachi";

/** Minutes before close when CLOSING is suggested during the operating window. */
export const CLOSING_LEAD_MINUTES = 60;

export type SuggestCommandModeInput = {
  now: Date;
  /** IANA timezone; defaults to Asia/Karachi when missing/invalid. */
  timeZone?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  /** True when open kitchen/delivery/order work remains. */
  hasUnresolvedOperations?: boolean;
};

function parseHmToMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/** Local wall-clock minutes since midnight in `timeZone`. */
export function getBranchLocalMinutes(now: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    // en-GB midnight can be "24" in some engines
    const normalizedHour = hour === 24 ? 0 : hour;
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    if (!Number.isFinite(normalizedHour) || !Number.isFinite(minute)) return 0;
    return normalizedHour * 60 + minute;
  } catch {
    return 0;
  }
}

export function formatBranchLocalTimeLabel(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-PK", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now);
  } catch {
    return now.toISOString();
  }
}

export function isWithinOperatingWindow(
  nowMinutes: number,
  opens: number,
  closes: number,
): boolean {
  if (opens === closes) return false;
  if (opens < closes) return nowMinutes >= opens && nowMinutes < closes;
  // Overnight: e.g. 18:00–02:00
  return nowMinutes >= opens || nowMinutes < closes;
}

function minutesUntilClose(nowMinutes: number, opens: number, closes: number): number | null {
  if (!isWithinOperatingWindow(nowMinutes, opens, closes)) return null;
  if (opens < closes) return closes - nowMinutes;
  if (nowMinutes >= opens) return 24 * 60 - nowMinutes + closes;
  return closes - nowMinutes;
}

function resolveTimeZone(raw: string | null | undefined): string {
  const candidate = (raw ?? "").trim() || DEFAULT_COMMAND_TIMEZONE;
  try {
    // Validate IANA id
    new Intl.DateTimeFormat("en-GB", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_COMMAND_TIMEZONE;
  }
}

function buildSuggestion(
  mode: CommandModeId,
  confidence: CommandModeConfidence,
  reason: string,
  extras: {
    now: Date;
    timeZone: string;
    opensAt: string | null;
    closesAt: string | null;
    hoursAvailable: boolean;
    limitations: string[];
  },
): ModeSuggestion {
  return {
    mode,
    reason,
    confidence,
    evaluatedAt: extras.now.toISOString(),
    branchLocalTimeLabel: formatBranchLocalTimeLabel(extras.now, extras.timeZone),
    timeZone: extras.timeZone,
    opensAt: extras.opensAt,
    closesAt: extras.closesAt,
    hoursAvailable: extras.hoursAvailable,
    limitations: extras.limitations,
  };
}

/**
 * Suggest a dashboard decision mode. Never mutates branch open/close state.
 * Clock time alone must not be presented as proof the branch is open or closed.
 */
export function suggestCommandMode(input: SuggestCommandModeInput): ModeSuggestion {
  const timeZone = resolveTimeZone(input.timeZone);
  const opensAt = input.opensAt?.trim() || null;
  const closesAt = input.closesAt?.trim() || null;
  const opens = parseHmToMinutes(opensAt);
  const closes = parseHmToMinutes(closesAt);
  const unresolved = Boolean(input.hasUnresolvedOperations);
  const baseLimitations = [
    "Suggestion is advisory — it does not open or close the branch.",
    "Time alone is not readiness proof.",
  ];

  const common = {
    now: input.now,
    timeZone,
    opensAt,
    closesAt,
    hoursAvailable: opens != null && closes != null,
    limitations: baseLimitations,
  };

  if (opens == null || closes == null) {
    return buildSuggestion(
      "LIVE_OPERATIONS",
      "LOW",
      "Configured business hours are missing or invalid for this branch scope. Defaulting to Live Operations — choose a mode manually.",
      {
        ...common,
        hoursAvailable: false,
        limitations: [
          ...baseLimitations,
          "Select a single branch with valid opens/closes times for a stronger suggestion.",
          "All-branches scope cannot resolve one operating window.",
        ],
      },
    );
  }

  if (opens === closes) {
    return buildSuggestion(
      "LIVE_OPERATIONS",
      "LOW",
      "Opens and closes times are identical, so the operating window cannot be evaluated. Defaulting to Live Operations.",
      {
        ...common,
        hoursAvailable: false,
        limitations: [...baseLimitations, "Fix branch hours in Settings when convenient."],
      },
    );
  }

  const nowMinutes = getBranchLocalMinutes(input.now, timeZone);
  const inWindow = isWithinOperatingWindow(nowMinutes, opens, closes);
  const untilClose = minutesUntilClose(nowMinutes, opens, closes);
  const label = COMMAND_MODE_DEFINITIONS;

  // After closing with unresolved work → Closing
  if (!inWindow && unresolved) {
    return buildSuggestion(
      "CLOSING",
      "MEDIUM",
      `Outside the configured ${opensAt}–${closesAt} window (${timeZone}) with unresolved operations still present.`,
      common,
    );
  }

  // Outside window, quiet → Pre-open (next service readiness view)
  if (!inWindow) {
    return buildSuggestion(
      "PRE_OPEN",
      "MEDIUM",
      `Branch-local time is outside the configured ${opensAt}–${closesAt} window. Showing Pre-open readiness (not a claim that the branch is closed).`,
      common,
    );
  }

  // Inside window, near close → Closing
  if (untilClose != null && untilClose <= CLOSING_LEAD_MINUTES) {
    return buildSuggestion(
      "CLOSING",
      "HIGH",
      `Within ${CLOSING_LEAD_MINUTES} minutes of configured close (${closesAt} ${timeZone}). Showing Closing Control.`,
      common,
    );
  }

  // Active service window
  return buildSuggestion(
    "LIVE_OPERATIONS",
    "HIGH",
    `Inside the configured ${opensAt}–${closesAt} operating window (${timeZone}). Showing ${label.LIVE_OPERATIONS.label}.`,
    common,
  );
}

/** Derive unresolved-ops flag from existing dashboard signals (no new fetches). */
export function hasUnresolvedOperationsFromSignals(input: {
  activeOrders?: number | null;
  kitchenWaiting?: number | null;
  activeDeliveries?: number | null;
  openKitchenTickets?: number | null;
  activeAssignments?: number | null;
}): boolean {
  const values = [
    input.activeOrders,
    input.kitchenWaiting,
    input.activeDeliveries,
    input.openKitchenTickets,
    input.activeAssignments,
  ];
  return values.some((v) => typeof v === "number" && v > 0);
}
