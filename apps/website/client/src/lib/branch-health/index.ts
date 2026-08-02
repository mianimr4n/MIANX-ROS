export type {
  BranchHealthScore,
  BranchHealthComponent,
  BranchHealthComponentId,
  BranchHealthScoreState,
  BranchHealthConfidence,
  BranchHealthFreshness,
  BranchHealthSourceInput,
} from "./types";

export {
  BRANCH_HEALTH_WEIGHTS,
  BRANCH_HEALTH_TOTAL_WEIGHT,
  MIN_COVERAGE_PERCENT,
  SCORE_STATE_BANDS,
  CONFIRMATION_PENDING_MINUTES,
  STOCK_WATCH_MAX,
  STOCK_CRITICAL_MIN,
} from "./weights";

export {
  clampScore,
  scoreFromDelayRate,
  scoreCashVarianceClear,
  scoreStockPressure,
  mapScoreState,
  statusLabelFor,
  computeCoveragePercent,
  computeWeightedScore,
  computeConfidence,
  areBranchesComparable,
} from "./formula";

export { buildBranchHealthScore } from "./build-score";
export { emphasizeBranchHealthForMode, modeEmphasisOrder } from "./mode-emphasis";

export function buildBranchHealthAriaLabel(input: {
  score: number | null;
  statusLabel: string;
  coveragePercent: number;
  confidence: string;
}): string {
  if (input.score == null) {
    return `Branch Health Score unavailable — ${input.statusLabel}. Coverage ${input.coveragePercent} percent. Confidence ${input.confidence}.`;
  }
  return `Branch Health Score ${input.score} out of 100 — ${input.statusLabel}. Coverage ${input.coveragePercent} percent. Confidence ${input.confidence}.`;
}

export function buildComponentDrillDownAriaLabel(input: {
  label: string;
  score: number | null;
  explanation: string;
}): string {
  const scoreText = input.score == null ? "unavailable" : `${input.score} out of 100`;
  return `Drill down ${input.label}: score ${scoreText}. ${input.explanation}`;
}
