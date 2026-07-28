/**
 * Opening release-evidence registry.
 *
 * File presence proves documentation only — never staff training,
 * rehearsal, or operational verification.
 */

export const OPENING_DOCUMENTED_RUNBOOK_PATHS = {
  rollback: "docs/10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md",
  incidentEscalation: "docs/15-runbooks/OPENING_DAY_RUNBOOK.md",
  openingDay: "docs/15-runbooks/OPENING_DAY_RUNBOOK.md",
} as const;

export type OpeningReleaseEvidence = {
  /** Docs present in the canonical registry (verified by unit tests). */
  rollbackRunbookDocumented: boolean;
  incidentRunbookDocumented: boolean;
  openingDayRunbookDocumented: boolean;
};

/**
 * Application-facing evidence flags.
 * Paths are verified in tests/website/opening-bugbot-correctness.test.mjs.
 * Callers must not hardcode COMPLETE from these flags alone.
 */
export function getOpeningReleaseEvidence(): OpeningReleaseEvidence {
  return {
    rollbackRunbookDocumented: true,
    incidentRunbookDocumented: true,
    openingDayRunbookDocumented: true,
  };
}
