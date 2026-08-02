/**
 * RC6-UI-01 — product capability maturity labels (not runtime fetch state).
 * Distinct from `op-status.ts` (LOADING/LIVE/EMPTY/ERROR).
 */

export type CapabilityTruthStatus =
  | "LIVE_VERIFIED"
  | "IMPLEMENTED_NOT_PRODUCTION_VERIFIED"
  | "PARTIAL_LIVE"
  | "FOUNDATION_READ_ONLY"
  | "UI_ONLY"
  | "MOCK_ONLY"
  | "PLANNED"
  | "DEFERRED";

/** Operator-facing badge text (never leak enum names unless intentional). */
export function toCapabilityBadgeLabel(status: CapabilityTruthStatus): string {
  switch (status) {
    case "LIVE_VERIFIED":
      return "LIVE";
    case "IMPLEMENTED_NOT_PRODUCTION_VERIFIED":
      return "Implemented";
    case "PARTIAL_LIVE":
      return "Partial LIVE";
    case "FOUNDATION_READ_ONLY":
      return "Foundation";
    case "UI_ONLY":
    case "MOCK_ONLY":
      return "Preview";
    case "PLANNED":
      return "Planned";
    case "DEFERRED":
      return "Deferred";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function capabilityBadgeClassName(status: CapabilityTruthStatus): string {
  switch (status) {
    case "LIVE_VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "IMPLEMENTED_NOT_PRODUCTION_VERIFIED":
      return "border-teal-200 bg-teal-50 text-teal-900";
    case "PARTIAL_LIVE":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "FOUNDATION_READ_ONLY":
      return "border-sky-200 bg-sky-50 text-sky-950";
    case "UI_ONLY":
    case "MOCK_ONLY":
      return "border-violet-200 bg-violet-50 text-violet-950";
    case "PLANNED":
      return "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-muted)]";
    case "DEFERRED":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Seed map for modules touched by RC6-UI-01 (repository truth, not Prod verification). */
export const RC6_CAPABILITY_LABELS = {
  financeModule: "PARTIAL_LIVE",
  financeStatementsWired: "LIVE_VERIFIED", // TB / P&L when fetched
  financeStatementsUnwired: "FOUNDATION_READ_ONLY", // BS / CF list badges
  financeArTaxUi: "FOUNDATION_READ_ONLY",
  hrPayrollShifts: "PARTIAL_LIVE",
  hrDeactivate: "IMPLEMENTED_NOT_PRODUCTION_VERIFIED",
  inventoryGrnStock: "IMPLEMENTED_NOT_PRODUCTION_VERIFIED",
  loyaltyLedger: "IMPLEMENTED_NOT_PRODUCTION_VERIFIED",
  support: "PLANNED",
  integrations: "PLANNED",
  aiCommandCenter: "PLANNED",
  printers: "PLANNED",
} as const satisfies Record<string, CapabilityTruthStatus>;
