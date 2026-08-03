/**
 * POLISH-06 — Admin accessibility & responsive certification contracts (semantics).
 * Not a claim of full legal WCAG certification.
 */

export const ADMIN_A11Y_CERTIFICATION = {
  wording:
    "Repository-supported accessibility and responsive professional-readiness certification with 0 automated critical/serious findings on the tested matrix.",
  axeCriticalTarget: 0,
  axeSeriousTarget: 0,
  legalWcagClaimed: false,
} as const;

/** Required responsive viewports for POLISH-06 matrix. */
export const ADMIN_RESPONSIVE_VIEWPORTS = [
  { w: 320, h: 568 },
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 412, h: 915 },
  { w: 768, h: 1024 },
  { w: 820, h: 1180 },
  { w: 1024, h: 768 },
  { w: 1280, h: 720 },
  { w: 1366, h: 768 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
] as const;

export const ADMIN_A11Y_SHELL_RULES = {
  oneMainLandmark: true,
  oneShellPageH1: true,
  modulePageTitleIsNotH1: true,
  mobileDrawerFocusTrap: true,
  moduleNavigatorAlwaysNamed: true,
  ctrlKSkipsFormFields: true,
  reducedMotionSupported: true,
} as const;

export type Polish06CoverageClass =
  | "FULLY_TESTED"
  | "COVERED_BY_SHARED_LAYOUT"
  | "COVERED_BY_ROUTE_FAMILY"
  | "AUTHORIZATION_ONLY"
  | "DEAD_OR_UNREACHABLE"
  | "DEFERRED"
  | "BLOCKED_BY_MISSING_FIXTURE"
  | "REQUIRES_MANUAL_REVIEW";
