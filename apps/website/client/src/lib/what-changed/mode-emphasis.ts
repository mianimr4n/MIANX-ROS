/**
 * Command-mode emphasis for What Changed — presentation only.
 */

import type { CommandModeId } from "@/lib/command-modes";
import type { WhatChangedSummary } from "./types";

export function emphasizeWhatChangedForMode(
  summary: WhatChangedSummary,
  mode: CommandModeId,
): WhatChangedSummary {
  const notes: Record<CommandModeId, string> = {
    PRE_OPEN:
      "Pre-open: emphasize overnight and prior-window pressure where sources support it. Values are unchanged.",
    LIVE_OPERATIONS:
      "Live: emphasize recent order, kitchen, delivery, and stock deltas. Operational figures may still change.",
    CLOSING:
      "Closing: emphasize unresolved work, approvals, and EOD-related deltas. Timeline does not finalize the EOD Pack.",
  };
  return {
    ...summary,
    limitations: [notes[mode], ...summary.limitations.filter((l) => !Object.values(notes).includes(l))],
  };
}
