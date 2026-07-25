/**
 * Server-authoritative branch timezone helpers.
 * No React component may perform authoritative timezone calculations —
 * all wall-clock ↔ UTC conversion happens here or in SQL
 * (`branch_wall_to_utc` / `branch_local_date`).
 */

import { ApiError } from "../../common/http.js";

const IANA_SHAPE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$|^UTC$|^Etc\/UTC$/;

/** Well-known fixtures used in tests (Karachi + a DST-observing zone). */
export const TIMEZONE_FIXTURES = {
  karachi: "Asia/Karachi",
  london: "Europe/London",
} as const;

export function assertValidIanaTimezone(timezone: string): string {
  const tz = timezone.trim();
  if (!tz || !IANA_SHAPE.test(tz)) {
    throw new ApiError(400, "INVALID_TIMEZONE", "Timezone must be a valid IANA identifier.");
  }
  try {
    // Throws RangeError for unknown IANA zones in modern Node.
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
  } catch {
    throw new ApiError(400, "INVALID_TIMEZONE", `Unknown IANA timezone: ${tz}`);
  }
  return tz;
}

/** Format a UTC instant as an ISO-8601 string with an explicit numeric offset for `timeZone`. */
export function formatInTimezone(utcIso: string | Date, timeZone: string): string {
  const date = typeof utcIso === "string" ? new Date(utcIso) : utcIso;
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_TIMESTAMP", "Timestamp is not valid.");
  }
  const tz = assertValidIanaTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour");
  const min = get("minute");
  const s = get("second");
  const rawOffset = get("timeZoneName"); // e.g. "GMT+5" / "GMT+05:00" / "GMT"
  const offset = normalizeShortOffset(rawOffset);
  return `${y}-${m}-${d}T${h}:${min}:${s}${offset}`;
}

function normalizeShortOffset(raw: string): string {
  if (!raw || raw === "GMT" || raw === "UTC") return "+00:00";
  const m = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return "+00:00";
  const sign = m[1];
  const hh = m[2].padStart(2, "0");
  const mm = (m[3] ?? "00").padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** Business date (YYYY-MM-DD) for a UTC instant in the branch timezone. */
export function businessDateInTimezone(utcIso: string | Date, timeZone: string): string {
  return formatInTimezone(utcIso, timeZone).slice(0, 10);
}

/**
 * Interpret a branch-local calendar date + HH:MM[:SS] wall-clock as UTC.
 * DST-safe via iterative offset resolution.
 */
export function wallTimeToUtcIso(
  localDate: string,
  localTime: string,
  timeZone: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new ApiError(400, "INVALID_DATE", "localDate must be YYYY-MM-DD.");
  }
  const time = localTime.length === 5 ? `${localTime}:00` : localTime;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    throw new ApiError(400, "INVALID_TIME", "localTime must be HH:MM or HH:MM:SS.");
  }
  const tz = assertValidIanaTimezone(timeZone);

  // First guess: treat the wall clock as UTC, then correct by the zone offset
  // at that instant. One refinement handles DST transitions for civil times
  // that exist; non-existent (spring-forward gap) times land on the post-gap side.
  const asUtc = new Date(`${localDate}T${time}Z`);
  if (Number.isNaN(asUtc.getTime())) {
    throw new ApiError(400, "INVALID_TIMESTAMP", "Could not parse local date/time.");
  }
  const offsetMs = getTimeZoneOffsetMs(asUtc, tz);
  const corrected = new Date(asUtc.getTime() - offsetMs);
  // Refine once more in case the correction crossed a DST boundary.
  const offset2 = getTimeZoneOffsetMs(corrected, tz);
  if (offset2 !== offsetMs) {
    return new Date(asUtc.getTime() - offset2).toISOString();
  }
  return corrected.toISOString();
}

export function getTimeZoneOffsetMs(utcDate: Date, timeZone: string): number {
  // Difference between the same instant formatted in TZ vs UTC.
  const tzStr = formatInTimezone(utcDate, timeZone);
  const utcStr = utcDate.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  // Rebuild both as epoch via Date parsing of offset-aware strings.
  const tzMs = Date.parse(tzStr);
  const utcMs = Date.parse(utcStr.replace("Z", "+00:00"));
  // offset = (wall-as-if-UTC) - actual UTC ≈ tzMs interpretation issue.
  // Simpler approach: compare hour components.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(utcDate);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asLocal - utcDate.getTime();
}

/** Start/end of a business day in branch TZ, returned as UTC ISO bounds. */
export function businessDayUtcBounds(localDate: string, timeZone: string): { startUtc: string; endUtc: string } {
  const startUtc = wallTimeToUtcIso(localDate, "00:00:00", timeZone);
  // End exclusive = next local midnight.
  const [y, m, d] = localDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  const endUtc = wallTimeToUtcIso(nextDate, "00:00:00", timeZone);
  return { startUtc, endUtc };
}
