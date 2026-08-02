/**
 * Mode → widget composition (presentation only; not authorization).
 */

import { UNSUPPORTED_READINESS_SIGNALS, type CommandModeId } from "./types";

export type ModeSectionId =
  | "exception-center"
  | "approval-inbox"
  | "branch-health"
  | "profitability-truth"
  | "eod-pack"
  | "what-changed"
  | "mode-summary"
  | "today-kpis"
  | "live-ops-kpis"
  | "attention-kpis"
  | "unsupported-note"
  | "activity"
  | "quick-actions"
  | "sales-trend"
  | "top-products"
  | "owner-brief";

export type ModeComposition = {
  mode: CommandModeId;
  /** Ordered sections after the command-mode header. */
  sections: ModeSectionId[];
  emphasize: ModeSectionId[];
  unsupportedNote: string;
};

export const MODE_COMPOSITION: Record<CommandModeId, ModeComposition> = {
  PRE_OPEN: {
    mode: "PRE_OPEN",
    sections: [
      "what-changed",
      "exception-center",
      "approval-inbox",
      "branch-health",
      "profitability-truth",
      "eod-pack",
      "mode-summary",
      "unsupported-note",
      "attention-kpis",
      "today-kpis",
      "live-ops-kpis",
      "activity",
      "quick-actions",
      "sales-trend",
      "top-products",
      "owner-brief",
    ],
    emphasize: [
      "what-changed",
      "exception-center",
      "approval-inbox",
      "branch-health",
      "profitability-truth",
      "eod-pack",
      "attention-kpis",
      "unsupported-note",
    ],
    unsupportedNote:
      "No supported pre-open exceptions detected does not mean ready to open. " +
      `Not included yet: ${UNSUPPORTED_READINESS_SIGNALS.slice(0, 4).join(", ")}, and more.`,
  },
  LIVE_OPERATIONS: {
    mode: "LIVE_OPERATIONS",
    sections: [
      "what-changed",
      "exception-center",
      "approval-inbox",
      "branch-health",
      "profitability-truth",
      "eod-pack",
      "mode-summary",
      "today-kpis",
      "live-ops-kpis",
      "attention-kpis",
      "activity",
      "quick-actions",
      "sales-trend",
      "top-products",
      "owner-brief",
    ],
    emphasize: [
      "what-changed",
      "exception-center",
      "approval-inbox",
      "branch-health",
      "profitability-truth",
      "live-ops-kpis",
      "today-kpis",
    ],
    unsupportedNote: "",
  },
  CLOSING: {
    mode: "CLOSING",
    sections: [
      "exception-center",
      "approval-inbox",
      "eod-pack",
      "what-changed",
      "branch-health",
      "profitability-truth",
      "mode-summary",
      "unsupported-note",
      "live-ops-kpis",
      "attention-kpis",
      "today-kpis",
      "activity",
      "quick-actions",
      "sales-trend",
      "top-products",
      "owner-brief",
    ],
    emphasize: [
      "eod-pack",
      "what-changed",
      "exception-center",
      "approval-inbox",
      "branch-health",
      "profitability-truth",
      "unsupported-note",
    ],
    unsupportedNote:
      "Closing view is partial; register and staff clock-out readiness are not yet included. " +
      "EOD Pack is a read-only preview — Z-report closure, finalize/approve pack, and rider COD settlement remain deferred.",
  },
};

export function getModeComposition(mode: CommandModeId): ModeComposition {
  return MODE_COMPOSITION[mode];
}
