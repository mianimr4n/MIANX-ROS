/**
 * POLISH-07 — Performance / privacy contracts (semantics + budgets).
 * Budgets are repository-supported ceilings relative to the Phase 1.1 public baseline.
 */

/** Public entry gzip baseline from PERFORMANCE_NETWORK_AUDIT (~251.58 kB). */
export const PUBLIC_ENTRY_GZIP_BASELINE_KB = 251.58;

/** Allow +2% regression vs measured Production baseline. */
export const PUBLIC_ENTRY_GZIP_BUDGET_KB = Math.ceil(PUBLIC_ENTRY_GZIP_BASELINE_KB * 1.02);

export const PERFORMANCE_BUDGETS = {
  publicEntryGzipKbMax: PUBLIC_ENTRY_GZIP_BUDGET_KB,
  /** Soft ceiling for largest lazy Admin route chunk (gzip KB) — watch regressions. */
  largestLazyRouteGzipKbMax: 180,
  duplicateIdenticalConcurrentReadsMax: 0,
  visibleStaleBranchCommitsMax: 0,
  kdsActivePollersPerWorkspaceMax: 1,
  noPublicAdminRuntimeImport: true,
  noAxeInProductionBundle: true,
  noPiiInBrowserStorageAllowlist: true,
} as const;

/** Browser persistence keys allowed after logout (non-PII UI prefs). */
export const BROWSER_STORAGE_ALLOWLIST_AFTER_LOGOUT = [
  "theme",
  "telepizza.selectedBranchId",
  "telepizza.admin.branchScope",
  "telepizza.admin.nav.groups.v1",
  "telepizza.admin.whatChanged.v1",
] as const;

/** Keys that must be cleared on logout (PII or identity-adjacent). */
export const BROWSER_STORAGE_CLEAR_ON_LOGOUT_PREFIXES = [
  "telepizza.auth.user",
  "telepizza.orders",
  "telepizza.loyalty.points",
  "telepizza.notifications.",
  "telepizza.customer.addresses.",
  "telepizza.customer.notification-prefs.",
  "telepizza.auth.next",
  "telepizza.auth.flow",
] as const;

export const POLISH07_RULES = {
  pausePollingWhenDocumentHidden: true,
  shareIdenticalInflightReads: true,
  csvFormulaInjectionGuard: true,
  sanitizeClientConsoleErrors: true,
  revokeExportObjectUrls: true,
} as const;
