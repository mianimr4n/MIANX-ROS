/**
 * RC6-DASH-03 — Owner daily command modes (read-only / drill-down only).
 */

export type CommandModeId = "PRE_OPEN" | "LIVE_OPERATIONS" | "CLOSING";

export type CommandModeConfidence = "HIGH" | "MEDIUM" | "LOW" | "MANUAL_ONLY";

export type CommandModeDefinition = {
  id: CommandModeId;
  /** Owner-facing label (never raw enum as primary label). */
  label: string;
  purpose: string;
  summaryHeading: string;
  /** URL token for ?commandMode= */
  urlToken: string;
};

export const COMMAND_MODE_DEFINITIONS: Record<CommandModeId, CommandModeDefinition> = {
  PRE_OPEN: {
    id: "PRE_OPEN",
    label: "Pre-open",
    purpose: "Review supported readiness signals before service.",
    summaryHeading: "Pre-open Readiness",
    urlToken: "pre-open",
  },
  LIVE_OPERATIONS: {
    id: "LIVE_OPERATIONS",
    label: "Live Operations",
    purpose: "Monitor active orders, kitchen, and delivery.",
    summaryHeading: "Live Operations",
    urlToken: "live",
  },
  CLOSING: {
    id: "CLOSING",
    label: "Closing",
    purpose: "Track unresolved work near end of service.",
    summaryHeading: "Closing Control",
    urlToken: "closing",
  },
};

export const COMMAND_MODE_ORDER: CommandModeId[] = ["PRE_OPEN", "LIVE_OPERATIONS", "CLOSING"];

export type ModeSuggestion = {
  mode: CommandModeId;
  reason: string;
  confidence: CommandModeConfidence;
  evaluatedAt: string;
  branchLocalTimeLabel: string;
  timeZone: string;
  opensAt: string | null;
  closesAt: string | null;
  hoursAvailable: boolean;
  limitations: string[];
};

/** Deferred / unsupported readiness domains — never shown as complete. */
export const UNSUPPORTED_READINESS_SIGNALS = [
  "Opening checklist completion",
  "Printer / device / KDS health",
  "Rider availability roster",
  "Staff clock-in / clock-out readiness",
  "Register / Z-report closure",
  "EOD pack generation",
  "Payment channel readiness",
] as const;
