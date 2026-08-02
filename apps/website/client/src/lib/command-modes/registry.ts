/**
 * Mode → widget composition (presentation only; not authorization).
 */

import { UNSUPPORTED_READINESS_SIGNALS, type CommandModeId } from "./types";

export type ModeSectionId =
  | "exception-center"
  | "approval-inbox"
  | "branch-health"
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
      "exception-center",
      "approval-inbox",
      "branch-health",
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
    emphasize: ["exception-center", "approval-inbox", "branch-health", "attention-kpis", "unsupported-note"],
    unsupportedNote:
      "No supported pre-open exceptions detected does not mean ready to open. " +
      `Not included yet: ${UNSUPPORTED_READINESS_SIGNALS.slice(0, 4).join(", ")}, and more.`,
  },
  LIVE_OPERATIONS: {
    mode: "LIVE_OPERATIONS",
    sections: [
      "exception-center",
      "approval-inbox",
      "branch-health",
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
    emphasize: ["exception-center", "approval-inbox", "branch-health", "live-ops-kpis", "today-kpis"],
    unsupportedNote: "",
  },
  CLOSING: {
    mode: "CLOSING",
    sections: [
      "exception-center",
      "approval-inbox",
      "branch-health",
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
    emphasize: ["exception-center", "approval-inbox", "branch-health", "live-ops-kpis", "unsupported-note"],
    unsupportedNote:
      "Closing view is partial; register and staff clock-out readiness are not yet included. " +
      "Z-report closure, EOD pack, and rider COD settlement remain deferred.",
  },
};

export function getModeComposition(mode: CommandModeId): ModeComposition {
  return MODE_COMPOSITION[mode];
}
