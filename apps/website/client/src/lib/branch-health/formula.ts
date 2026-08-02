/**
 * Pure Branch Health calculation helpers (deterministic, no I/O).
 */

import {
  MIN_COVERAGE_PERCENT,
  SCORE_STATE_BANDS,
  STOCK_CRITICAL_MIN,
  STOCK_WATCH_MAX,
} from "./weights";
import type {
  BranchHealthConfidence,
  BranchHealthFreshness,
  BranchHealthScoreState,
} from "./types";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Rate in [0,1] → health score (higher rate = worse). */
export function scoreFromDelayRate(rate: number): number {
  const safe = Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1;
  return clampScore(100 * (1 - safe));
}

/**
 * Cash variance clear: count-based only (no invented currency thresholds).
 * 0 unresolved → 100; any unresolved → 0.
 */
export function scoreCashVarianceClear(unresolvedCount: number): number {
  return unresolvedCount > 0 ? 0 : 100;
}

/**
 * Stock pressure without SKU denominator — uses Exception Center count bands.
 * 0 → 100; 1–9 → 50; ≥10 → 0.
 */
export function scoreStockPressure(lowStockCount: number): number {
  if (lowStockCount <= 0) return 100;
  if (lowStockCount <= STOCK_WATCH_MAX) return 50;
  if (lowStockCount >= STOCK_CRITICAL_MIN) return 0;
  return 50;
}

export function mapScoreState(score: number | null, coveragePercent: number): BranchHealthScoreState {
  if (score == null || coveragePercent < MIN_COVERAGE_PERCENT) return "INSUFFICIENT_DATA";
  if (score >= SCORE_STATE_BANDS.HEALTHY) return "HEALTHY";
  if (score >= SCORE_STATE_BANDS.WATCH) return "WATCH";
  if (score >= SCORE_STATE_BANDS.AT_RISK) return "AT_RISK";
  return "CRITICAL";
}

export function statusLabelFor(state: BranchHealthScoreState): string {
  switch (state) {
    case "HEALTHY":
      return "Healthy with verified coverage";
    case "WATCH":
      return "Watch — some pressure";
    case "AT_RISK":
      return "At risk";
    case "CRITICAL":
      return "Critical pressure";
    case "INSUFFICIENT_DATA":
      return "Insufficient data";
    default:
      return "Unknown";
  }
}

export function computeCoveragePercent(evaluatedWeight: number, configuredWeight: number): number {
  if (configuredWeight <= 0) return 0;
  return clampScore((evaluatedWeight / configuredWeight) * 100);
}

/**
 * Weighted mean of evaluated component scores.
 * Unavailable / restricted components are excluded (not scored as 0 or 100).
 */
export function computeWeightedScore(
  parts: Array<{ score: number; weight: number }>,
): number | null {
  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0 || parts.length === 0) return null;
  const raw = parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight;
  return clampScore(raw);
}

export function computeConfidence(input: {
  coveragePercent: number;
  staleCount: number;
  evaluatedCount: number;
}): BranchHealthConfidence {
  if (input.coveragePercent < MIN_COVERAGE_PERCENT || input.evaluatedCount === 0) return "LOW";
  if (input.coveragePercent >= 80 && input.staleCount === 0) return "HIGH";
  if (input.coveragePercent >= 50) return "MEDIUM";
  return "LOW";
}

export function mergeFreshness(states: BranchHealthFreshness[]): BranchHealthFreshness {
  if (states.length === 0) return "UNAVAILABLE";
  if (states.every((s) => s === "UNAVAILABLE")) return "UNAVAILABLE";
  if (states.some((s) => s === "UNAVAILABLE")) return "PARTIAL";
  if (states.some((s) => s === "STALE")) return "STALE";
  if (states.some((s) => s === "PARTIAL")) return "PARTIAL";
  if (states.every((s) => s === "LIVE")) return "LIVE";
  return "FRESH";
}

export function mapOpFreshness(state: string, hasData: boolean): BranchHealthFreshness {
  if (state === "ERROR" || state === "OFFLINE" || state === "UNAVAILABLE") return "UNAVAILABLE";
  if (state === "STALE") return "STALE";
  if (state === "LIVE") return "LIVE";
  if (hasData) return "FRESH";
  if (state === "LOADING") return "FRESH";
  return "UNAVAILABLE";
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

/** Branches are comparable for ranking only when coverage and component sets match closely. */
export function areBranchesComparable(a: {
  coveragePercent: number;
  evaluatedComponentIds: string[];
  freshnessState: BranchHealthFreshness;
}, b: {
  coveragePercent: number;
  evaluatedComponentIds: string[];
  freshnessState: BranchHealthFreshness;
}): boolean {
  if (a.coveragePercent < MIN_COVERAGE_PERCENT || b.coveragePercent < MIN_COVERAGE_PERCENT) {
    return false;
  }
  if (Math.abs(a.coveragePercent - b.coveragePercent) > 15) return false;
  if (a.evaluatedComponentIds.length !== b.evaluatedComponentIds.length) return false;
  const setA = [...a.evaluatedComponentIds].sort().join(",");
  const setB = [...b.evaluatedComponentIds].sort().join(",");
  if (setA !== setB) return false;
  if (a.freshnessState === "UNAVAILABLE" || b.freshnessState === "UNAVAILABLE") return false;
  return true;
}
