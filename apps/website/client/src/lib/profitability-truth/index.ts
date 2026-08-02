export type {
  ProfitabilitySnapshot,
  ProfitMetric,
  OperationalProfitability,
  AccountingProfitability,
  ProfitabilityReconciliation,
  ProfitabilitySourceInput,
  FinancialMaturity,
  ProfitabilityLaneState,
} from "./types";

export {
  OPERATIONAL_CONFIGURED_COUNT,
  ACCOUNTING_CONFIGURED_COUNT,
  MIN_OPERATIONAL_COVERAGE_PERCENT,
  coveragePercent,
  confidenceFromCoverage,
  hasPostedPlActivity,
  formatMoneyPkr,
} from "./formula";

export { buildProfitabilitySnapshot } from "./build-snapshot";
export { emphasizeProfitabilityForMode } from "./mode-emphasis";

export function buildProfitMetricAriaLabel(input: {
  label: string;
  maturity: string;
  value: string | null;
}): string {
  const valueText = input.value ?? "not available";
  return `${input.label}. Maturity: ${input.maturity}. Value: ${valueText}.`;
}
