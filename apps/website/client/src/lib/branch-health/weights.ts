/**
 * Documented component weights for RC6-DASH-05 (sum = 100).
 * Changing weights requires a later Settings / governance slice — not Owner UI.
 */

import type { BranchHealthComponentId } from "./types";

export const BRANCH_HEALTH_WEIGHTS: Record<BranchHealthComponentId, number> = {
  "BH-KITCHEN-DELAY": 25,
  "BH-DELIVERY-LATE": 20,
  "BH-CONFIRM-DELAY": 15,
  "BH-DISPATCH-WAIT": 15,
  "BH-CASH-VARIANCE": 15,
  "BH-STOCK-PRESSURE": 10,
};

export const BRANCH_HEALTH_TOTAL_WEIGHT = Object.values(BRANCH_HEALTH_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0,
);

/** Below this coverage percent, do not show a numeric score. */
export const MIN_COVERAGE_PERCENT = 50;

/** Overall score → status bands (inclusive lower bounds except CRITICAL). */
export const SCORE_STATE_BANDS = {
  HEALTHY: 85,
  WATCH: 70,
  AT_RISK: 50,
} as const;

/** Stock pressure bands mirror Exception Center severity (≥10 critical). */
export const STOCK_WATCH_MAX = 9;
export const STOCK_CRITICAL_MIN = 10;

/** Prep / late thresholds — repository operational guides, not invented SLAs. */
export { PREP_TARGET_MINUTES } from "@/lib/admin-kitchen";
export { DELIVERY_LATE_MINUTES } from "@/lib/admin-delivery";
export const CONFIRMATION_PENDING_MINUTES = 15;
