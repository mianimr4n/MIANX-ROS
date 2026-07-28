/**
 * Canonical Telepizza opening countdown — single source of truth.
 * Target: 14 August 2026, 10:00 AM Asia/Karachi.
 */
export const OPENING_TIMEZONE = "Asia/Karachi" as const;

/** ISO offset form for Asia/Karachi on opening day (no DST). */
export const OPENING_TARGET_ISO = "2026-08-14T10:00:00+05:00" as const;

export const OPENING_TARGET_MS = Date.parse(OPENING_TARGET_ISO);

export type OpeningCountdownMode = "before" | "opening-day" | "launch-completed";

export type OpeningCountdown = {
  mode: OpeningCountdownMode;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
  targetIso: typeof OPENING_TARGET_ISO;
  timezone: typeof OPENING_TIMEZONE;
};

function karachiYmd(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPENING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

/**
 * @param nowMs current instant
 * @param launchCompleted when true, shows official launch completed (manual flag only)
 */
export function computeOpeningCountdown(
  nowMs: number,
  launchCompleted = false,
): OpeningCountdown {
  if (launchCompleted) {
    return {
      mode: "launch-completed",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: "Official launch completed",
      targetIso: OPENING_TARGET_ISO,
      timezone: OPENING_TIMEZONE,
    };
  }

  const targetYmd = "2026-08-14";
  const nowYmd = karachiYmd(nowMs);
  if (nowYmd === targetYmd) {
    return {
      mode: "opening-day",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: "Opening day",
      targetIso: OPENING_TARGET_ISO,
      timezone: OPENING_TIMEZONE,
    };
  }

  const diff = OPENING_TARGET_MS - nowMs;
  if (diff <= 0) {
    // After target calendar moment but launch not explicitly completed.
    return {
      mode: "opening-day",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: "Opening day",
      targetIso: OPENING_TARGET_ISO,
      timezone: OPENING_TIMEZONE,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = clampNonNegative(Math.floor(totalSeconds / 86400));
  const hours = clampNonNegative(Math.floor((totalSeconds % 86400) / 3600));
  const minutes = clampNonNegative(Math.floor((totalSeconds % 3600) / 60));
  const seconds = clampNonNegative(totalSeconds % 60);

  return {
    mode: "before",
    days,
    hours,
    minutes,
    seconds,
    label: `${days}d ${hours}h ${minutes}m ${seconds}s`,
    targetIso: OPENING_TARGET_ISO,
    timezone: OPENING_TIMEZONE,
  };
}
