/**
 * Command-mode emphasis for Profitability Truth — presentation only.
 * Never changes formulas, source values, accounting status, or windows.
 */

import type { CommandModeId } from "@/lib/command-modes";
import type { ProfitabilitySnapshot } from "./types";

export function emphasizeProfitabilityForMode(
  snapshot: ProfitabilitySnapshot,
  mode: CommandModeId,
): ProfitabilitySnapshot {
  const modeNotes: Record<CommandModeId, string> = {
    PRE_OPEN:
      "Pre-open emphasis: review latest supported posted period and prior operational context — today’s profit is not declared before operations begin.",
    LIVE_OPERATIONS:
      "Live emphasis: operational estimates are provisional and may change as orders complete, cancel, or refund.",
    CLOSING:
      "Closing emphasis: accounting may not yet be posted for today; do not declare final daily profit prematurely.",
  };

  return {
    ...snapshot,
    limitations: [modeNotes[mode], ...snapshot.limitations.filter((l) => !Object.values(modeNotes).includes(l))],
  };
}
