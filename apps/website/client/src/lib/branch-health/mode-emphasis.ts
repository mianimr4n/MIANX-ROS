/**
 * Command-mode emphasis for Branch Health — reorder explanations only.
 * Never changes weights, metrics, or the overall score for the same data window.
 */

import type { CommandModeId } from "@/lib/command-modes";
import type { BranchHealthComponent, BranchHealthComponentId, BranchHealthScore } from "./types";

const MODE_EMPHASIS: Record<CommandModeId, BranchHealthComponentId[]> = {
  PRE_OPEN: [
    "BH-STOCK-PRESSURE",
    "BH-CONFIRM-DELAY",
    "BH-KITCHEN-DELAY",
    "BH-DISPATCH-WAIT",
    "BH-DELIVERY-LATE",
    "BH-CASH-VARIANCE",
  ],
  LIVE_OPERATIONS: [
    "BH-KITCHEN-DELAY",
    "BH-DELIVERY-LATE",
    "BH-DISPATCH-WAIT",
    "BH-CONFIRM-DELAY",
    "BH-STOCK-PRESSURE",
    "BH-CASH-VARIANCE",
  ],
  CLOSING: [
    "BH-CONFIRM-DELAY",
    "BH-DISPATCH-WAIT",
    "BH-DELIVERY-LATE",
    "BH-CASH-VARIANCE",
    "BH-KITCHEN-DELAY",
    "BH-STOCK-PRESSURE",
  ],
};

function sortByEmphasis(
  components: BranchHealthComponent[],
  mode: CommandModeId,
): BranchHealthComponent[] {
  const order = MODE_EMPHASIS[mode];
  return [...components].sort((a, b) => {
    const ai = order.indexOf(a.componentId);
    const bi = order.indexOf(b.componentId);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.componentId.localeCompare(b.componentId);
  });
}

/**
 * Returns a presentation view of the same score with mode-ordered contributors.
 * Score / coverage / weights are unchanged.
 */
export function emphasizeBranchHealthForMode(
  score: BranchHealthScore,
  mode: CommandModeId,
): BranchHealthScore {
  const ordered = sortByEmphasis(score.components, mode);
  const negatives = ordered.filter((c) => c.score != null && c.score < 100).slice(0, 3);
  const positives = ordered.filter((c) => c.score != null && c.score >= 85).slice(0, 3);
  return {
    ...score,
    components: ordered,
    topNegativeContributors: negatives.length > 0 ? negatives : score.topNegativeContributors,
    topPositiveContributors: positives.length > 0 ? positives : score.topPositiveContributors,
  };
}

export function modeEmphasisOrder(mode: CommandModeId): BranchHealthComponentId[] {
  return MODE_EMPHASIS[mode];
}
