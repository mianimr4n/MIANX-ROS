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

/**
 * POLISH-02 hierarchy (presentation only):
 * Needs Attention → Business Pulse / Health → What Changed → Closing → secondary.
 * Critical exceptions remain first in every mode.
 */
export const MODE_COMPOSITION: Record<CommandModeId, ModeComposition> = {
  PRE_OPEN: {
    mode: "PRE_OPEN",
    sections: [
      "exception-center",
      "approval-inbox",
      "branch-health",
      "unsupported-note",
      "mode-summary",
      "attention-kpis",
      "today-kpis",
      "live-ops-kpis",
      "profitability-truth",
      "what-changed",
      "eod-pack",
      "activity",
      "quick-actions",
      "sales-trend",
      "top-products",
      "owner-brief",
    ],
    emphasize: [
      "exception-center",
      "approval-inbox",
      "branch-health",
      "unsupported-note",
      "attention-kpis",
    ],
    unsupportedNote:
      "No supported pre-open exceptions detected does not mean ready to open. " +
      `Not included yet: ${UNSUPPORTED_READINESS_SIGNALS.slice(0, 4).join(", ")}, and more.`,
  },
  LIVE_OPERATIONS: {
    mode: "LIVE_OPERATIONS",
    sections: [
      "exception-center",
      "approval-inbox",
      "mode-summary",
      "today-kpis",
      "live-ops-kpis",
      "attention-kpis",
      "profitability-truth",
      "branch-health",
      "what-changed",
      "eod-pack",
      "activity",
      "quick-actions",
      "sales-trend",
      "top-products",
      "owner-brief",
    ],
    emphasize: [
      "exception-center",
      "approval-inbox",
      "today-kpis",
      "live-ops-kpis",
      "profitability-truth",
      "branch-health",
    ],
    unsupportedNote: "",
  },
  CLOSING: {
    mode: "CLOSING",
    sections: [
      "exception-center",
      "approval-inbox",
      "eod-pack",
      "unsupported-note",
      "branch-health",
      "mode-summary",
      "profitability-truth",
      "what-changed",
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
      "exception-center",
      "approval-inbox",
      "eod-pack",
      "unsupported-note",
      "branch-health",
    ],
    unsupportedNote:
      "Closing view is partial; register and staff clock-out readiness are not yet included. " +
      "EOD Pack is a read-only preview — Z-report closure, finalize/approve pack, and rider COD settlement remain deferred.",
  },
};

export function getModeComposition(mode: CommandModeId): ModeComposition {
  return MODE_COMPOSITION[mode];
}
