/**
 * Pure EOD Pack helpers.
 */

export const MIN_EOD_COVERAGE_PERCENT = 50;

/** Configured content sections that participate in coverage (excludes meta-only identity). */
export const EOD_COVERAGE_SECTION_IDS = [
  "sales-orders",
  "kitchen",
  "delivery",
  "cash-finance",
  "stock",
  "exceptions-approvals",
  "branch-health",
] as const;

export const DEFERRED_EOD_DOMAINS = [
  "Z-report / register closure",
  "Rider COD settlement",
  "Staff clock-out completeness",
  "Opening/closing checklist completion",
  "Waste totals",
  "Customer complaints",
  "POD completion",
  "Delivery SLA analytics",
  "Full posted P&L close",
  "Email / WhatsApp pack delivery",
  "Scheduled background generation",
  "Certified PDF / XLSX",
  "EOD approval / finalize workflow",
] as const;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function coveragePercent(evaluated: number, configured: number): number {
  if (configured <= 0) return 0;
  return clampPercent((evaluated / configured) * 100);
}

export function confidenceFrom(coverage: number, stale: boolean): "HIGH" | "MEDIUM" | "LOW" {
  if (coverage < MIN_EOD_COVERAGE_PERCENT) return "LOW";
  if (coverage >= 80 && !stale) return "HIGH";
  if (coverage >= 50) return "MEDIUM";
  return "LOW";
}

export function mapPackState(coverage: number, anyEvaluated: boolean): "DRAFT" | "PARTIAL" | "REVIEWABLE" | "INSUFFICIENT_DATA" {
  if (!anyEvaluated || coverage < MIN_EOD_COVERAGE_PERCENT) return "INSUFFICIENT_DATA";
  if (coverage >= 80) return "REVIEWABLE";
  if (coverage >= MIN_EOD_COVERAGE_PERCENT) return "PARTIAL";
  return "INSUFFICIENT_DATA";
}

export function sourceFailed(state: string, hasData: boolean): boolean {
  if (state === "ERROR" || state === "OFFLINE" || state === "UNAVAILABLE") return true;
  if (
    !hasData &&
    state !== "LOADING" &&
    state !== "EMPTY" &&
    state !== "LIVE" &&
    state !== "DERIVED" &&
    state !== "FOUNDATION"
  ) {
    return true;
  }
  return false;
}

export function mapFreshness(
  state: string,
  hasData: boolean,
): "LIVE" | "FRESH" | "STALE" | "UNAVAILABLE" {
  if (state === "ERROR" || state === "OFFLINE" || state === "UNAVAILABLE") return "UNAVAILABLE";
  if (state === "STALE") return "STALE";
  if (state === "LIVE") return "LIVE";
  if (hasData) return "FRESH";
  return "UNAVAILABLE";
}

/**
 * Business date YYYY-MM-DD from ops dayStart when present; else Karachi calendar date of `nowMs`.
 */
export function resolveBusinessDate(input: {
  dayStart?: string | null;
  nowMs: number;
  timezone: string;
}): string {
  if (input.dayStart) {
    const d = input.dayStart.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timezone || "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(new Date(input.nowMs));
  } catch {
    return new Date(input.nowMs).toISOString().slice(0, 10);
  }
}

export function severityRank(severity: "CRITICAL" | "WARNING" | "INFORMATION"): number {
  if (severity === "CRITICAL") return 0;
  if (severity === "WARNING") return 1;
  return 2;
}
