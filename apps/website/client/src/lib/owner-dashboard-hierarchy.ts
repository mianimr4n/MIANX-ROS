/**
 * POLISH-02 — Owner Command Center information hierarchy (presentation only).
 * Does not change DASH business semantics, authorization, or data sources.
 */

import type { ModeSectionId } from "@/lib/command-modes/registry";
import type { CommandModeId } from "@/lib/command-modes/types";

/** Decision zones an Owner should scan within ~30 seconds. */
export type OwnerDashboardZoneId =
  | "context"
  | "needs-attention"
  | "business-pulse"
  | "branch-health"
  | "what-changed"
  | "closing-readiness"
  | "secondary";

export type OwnerDashboardZoneDefinition = {
  id: OwnerDashboardZoneId;
  /** Owner-facing heading (h2). */
  title: string;
  /** Concise purpose line. */
  purpose: string;
  /** Sections rendered inside this zone (order preserved). */
  sections: ModeSectionId[];
};

/**
 * Maps mode composition sections into professional decision zones.
 * Unknown / leftover sections append under "secondary".
 */
export function buildOwnerDashboardZones(
  mode: CommandModeId,
  sections: ModeSectionId[],
): OwnerDashboardZoneDefinition[] {
  const assigned = new Set<ModeSectionId>();

  const take = (ids: ModeSectionId[]): ModeSectionId[] => {
    const out: ModeSectionId[] = [];
    for (const id of ids) {
      if (sections.includes(id) && !assigned.has(id)) {
        assigned.add(id);
        out.push(id);
      }
    }
    return out;
  };

  const zones: OwnerDashboardZoneDefinition[] = [
    {
      id: "needs-attention",
      title: "What needs attention",
      purpose: "Highest-severity exceptions and pending approvals — drill-down only.",
      sections: take(["exception-center", "approval-inbox"]),
    },
  ];

  if (mode === "CLOSING") {
    zones.push({
      id: "closing-readiness",
      title: "Closing readiness",
      purpose: "EOD Pack preview and unresolved review items — not a closed period.",
      sections: take(["eod-pack", "unsupported-note"]),
    });
    zones.push({
      id: "business-pulse",
      title: "Business pulse",
      purpose: "Operational sales KPIs versus Accounting Posted — never merged.",
      sections: take([
        "today-kpis",
        "live-ops-kpis",
        "attention-kpis",
        "profitability-truth",
        "mode-summary",
      ]),
    });
    zones.push({
      id: "branch-health",
      title: "Branch and operations health",
      purpose: "Weighted coverage score with honest insufficient / partial states.",
      sections: take(["branch-health"]),
    });
    zones.push({
      id: "what-changed",
      title: "What changed",
      purpose: "Device-local review baseline — not since last login.",
      sections: take(["what-changed"]),
    });
  } else if (mode === "PRE_OPEN") {
    zones.push({
      id: "branch-health",
      title: "Branch and operations health",
      purpose: "Weighted coverage score with honest insufficient / partial states.",
      sections: take(["branch-health", "unsupported-note"]),
    });
    zones.push({
      id: "business-pulse",
      title: "Business pulse",
      purpose: "Operational sales KPIs versus Accounting Posted — never merged.",
      sections: take([
        "today-kpis",
        "live-ops-kpis",
        "attention-kpis",
        "profitability-truth",
        "mode-summary",
      ]),
    });
    zones.push({
      id: "what-changed",
      title: "What changed",
      purpose: "Device-local review baseline — not since last login.",
      sections: take(["what-changed"]),
    });
    zones.push({
      id: "closing-readiness",
      title: "Closing readiness",
      purpose: "EOD Pack preview — DRAFT / PARTIAL / REVIEWABLE / INSUFFICIENT_DATA only.",
      sections: take(["eod-pack"]),
    });
  } else {
    // LIVE_OPERATIONS — attention → pulse → health → changed → closing
    zones.push({
      id: "business-pulse",
      title: "Business pulse",
      purpose: "Operational sales KPIs versus Accounting Posted — never merged.",
      sections: take([
        "today-kpis",
        "live-ops-kpis",
        "attention-kpis",
        "profitability-truth",
        "mode-summary",
      ]),
    });
    zones.push({
      id: "branch-health",
      title: "Branch and operations health",
      purpose: "Weighted coverage score with honest insufficient / partial states.",
      sections: take(["branch-health"]),
    });
    zones.push({
      id: "what-changed",
      title: "What changed",
      purpose: "Device-local review baseline — not since last login.",
      sections: take(["what-changed"]),
    });
    zones.push({
      id: "closing-readiness",
      title: "Closing readiness",
      purpose: "EOD Pack preview — DRAFT / PARTIAL / REVIEWABLE / INSUFFICIENT_DATA only.",
      sections: take(["eod-pack", "unsupported-note"]),
    });
  }

  const leftovers = sections.filter((id) => !assigned.has(id));
  if (leftovers.length > 0) {
    zones.push({
      id: "secondary",
      title: "More detail",
      purpose: "Secondary charts, activity, and quick actions — accessible, visually secondary.",
      sections: leftovers,
    });
  }

  return zones.filter((z) => z.sections.length > 0);
}

/** Primary (above-fold priority) vs secondary visual weight. */
export function isPrimaryOwnerZone(zoneId: OwnerDashboardZoneId, mode: CommandModeId): boolean {
  if (zoneId === "secondary") return false;
  if (mode === "CLOSING") {
    return zoneId === "needs-attention" || zoneId === "closing-readiness" || zoneId === "branch-health";
  }
  if (mode === "PRE_OPEN") {
    return zoneId === "needs-attention" || zoneId === "branch-health";
  }
  return (
    zoneId === "needs-attention" ||
    zoneId === "business-pulse" ||
    zoneId === "branch-health"
  );
}
