/**
 * Command-mode emphasis for EOD Pack — presentation only.
 */

import type { CommandModeId } from "@/lib/command-modes";
import type { EodPack } from "./types";

export function emphasizeEodPackForMode(pack: EodPack, mode: CommandModeId): EodPack {
  const notes: Record<CommandModeId, string> = {
    PRE_OPEN:
      "Pre-open: this is a provisional current-day preview (prior-day persisted packs are not stored in this slice).",
    LIVE_OPERATIONS:
      "Live: EOD Pack preview is provisional — operational figures are still changing.",
    CLOSING:
      "Closing: review unresolved work and missing closing domains. This preview does not close the day.",
  };
  return {
    ...pack,
    limitations: [notes[mode], ...pack.limitations.filter((l) => !Object.values(notes).includes(l))],
  };
}
