/**
 * Pure profitability helpers — no I/O, no invented posted values.
 */

import { formatPkr } from "@/lib/admin-finance";

/** Operational revenue metrics configured for coverage (DASH-06 selected set). */
export const OPERATIONAL_CONFIGURED_COUNT = 3;

/** Accounting posted metrics configured when finance is authorized (revenue, expenses, net). */
export const ACCOUNTING_CONFIGURED_COUNT = 3;

/**
 * Minimum operational coverage to treat the Operational Estimate lane as AVAILABLE.
 * Below this → INSUFFICIENT_DATA (not silent zeros).
 */
export const MIN_OPERATIONAL_COVERAGE_PERCENT = 50;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function coveragePercent(evaluated: number, configured: number): number {
  if (configured <= 0) return 0;
  return clampPercent((evaluated / configured) * 100);
}

export function confidenceFromCoverage(
  coverage: number,
  stale: boolean,
): "HIGH" | "MEDIUM" | "LOW" {
  if (coverage < MIN_OPERATIONAL_COVERAGE_PERCENT) return "LOW";
  if (coverage >= 80 && !stale) return "HIGH";
  if (coverage >= 50) return "MEDIUM";
  return "LOW";
}

export function formatMoneyPkr(amount: number | null | undefined): string | null {
  if (amount == null || Number.isNaN(amount)) return null;
  return formatPkr(amount);
}

export function formatCount(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return String(n);
}

/**
 * Posted P&L has activity only when non-zero revenue or expenses exist.
 * Zero/zero must not be presented as “Net profit Rs 0 for the day”.
 */
export function hasPostedPlActivity(pl: {
  revenue: number;
  expenses: number;
} | null): boolean {
  if (!pl) return false;
  return pl.revenue !== 0 || pl.expenses !== 0;
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
