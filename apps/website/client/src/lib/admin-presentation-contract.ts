/**
 * POLISH-05 — Admin presentation contract (semantics).
 * CSS tokens remain in existing admin CSS variables; this module documents
 * shared vocabulary for components and tests.
 */

export const ADMIN_PAGE_TYPOGRAPHY = {
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]",
  pageTitle: "text-2xl font-semibold tracking-tight text-[var(--admin-ink)]",
  pageSubtitle: "text-sm text-[var(--admin-muted)]",
  sectionTitle: "text-lg font-semibold tracking-tight text-[var(--admin-ink)]",
  cardTitle: "text-base font-semibold tracking-tight text-[var(--admin-ink)]",
  supportingLabel: "text-xs font-medium uppercase tracking-[0.08em] text-[var(--admin-muted)]",
  value: "text-2xl font-semibold tracking-tight text-[var(--admin-ink)]",
  helper: "text-xs text-[var(--admin-muted)]",
  error: "text-sm text-red-900",
} as const;

export const ADMIN_SPACING = {
  pageGap: "space-y-6",
  sectionGap: "gap-6",
  gridGap: "gap-3",
  cardPadding: "p-4",
  surfaceHeaderPadding: "px-5 py-4",
  surfaceBodyPadding: "px-5 py-4",
  formRowGap: "gap-3",
  compactTableCell: "px-3 py-2",
} as const;

export const ADMIN_ACTION_VARIANTS = [
  "primary",
  "secondary",
  "quiet",
  "destructive",
  "link",
] as const;

export type AdminActionVariant = (typeof ADMIN_ACTION_VARIANTS)[number];

/** Cross-module data-state vocabulary (POLISH-03/04 aligned). */
export const ADMIN_DATA_STATES = [
  "LOADING",
  "LIVE",
  "EMPTY",
  "FILTERED_EMPTY",
  "NO_ACTIVITY_YET",
  "CONFIGURATION_REQUIRED",
  "PARTIAL",
  "INSUFFICIENT_DATA",
  "STALE",
  "UNAVAILABLE",
  "PERMISSION_RESTRICTED",
  "ERROR",
] as const;

export type AdminDataStateKind = (typeof ADMIN_DATA_STATES)[number];

export const ADMIN_DATA_STATE_COPY: Record<
  AdminDataStateKind,
  { heading: string; explanation: string; blocking: boolean }
> = {
  LOADING: {
    heading: "Loading",
    explanation: "Fetching current data.",
    blocking: false,
  },
  LIVE: {
    heading: "Live",
    explanation: "Showing current data from verified sources.",
    blocking: false,
  },
  EMPTY: {
    heading: "Nothing here yet",
    explanation: "A successful load returned no records. This is not an error.",
    blocking: false,
  },
  FILTERED_EMPTY: {
    heading: "No matches for current filters",
    explanation: "Try clearing filters to see all records in scope.",
    blocking: false,
  },
  NO_ACTIVITY_YET: {
    heading: "No activity yet",
    explanation: "The workflow is available, but nothing has been recorded in this scope.",
    blocking: false,
  },
  CONFIGURATION_REQUIRED: {
    heading: "Configuration required",
    explanation: "Set up the required records before this view can show operational data.",
    blocking: true,
  },
  PARTIAL: {
    heading: "Partial data",
    explanation: "Some sources loaded; missing scope is shown honestly.",
    blocking: false,
  },
  INSUFFICIENT_DATA: {
    heading: "Not enough data",
    explanation: "A score or trend cannot be shown until more history exists.",
    blocking: false,
  },
  STALE: {
    heading: "Showing last successful data",
    explanation: "A newer refresh failed; earlier data remains visible.",
    blocking: false,
  },
  UNAVAILABLE: {
    heading: "Data unavailable",
    explanation: "The source could not be loaded. Values are not shown as zero.",
    blocking: true,
  },
  PERMISSION_RESTRICTED: {
    heading: "Not available for your role",
    explanation: "You do not have permission to view this information.",
    blocking: true,
  },
  ERROR: {
    heading: "Something went wrong",
    explanation: "The request failed. Retry when ready — details stay non-technical.",
    blocking: true,
  },
};

export const ADMIN_CARD_KINDS = [
  "metric",
  "attention",
  "summary",
  "operational_list",
  "capability",
  "configuration",
  "detail",
] as const;

export type AdminCardKind = (typeof ADMIN_CARD_KINDS)[number];

/** Quiet deferred disclosure — prefer current-boundary wording over roadmap IDs. */
export const DEFERRED_DISCLOSURE_RULES = {
  maxPageLevelDisclosures: 1,
  avoidRepeatedChildBadges: true,
  preferCurrentBoundaryFirst: true,
  noInternalRoadmapIds: true,
} as const;
