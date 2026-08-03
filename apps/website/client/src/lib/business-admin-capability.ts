/**
 * POLISH-04 — Business-administration capability honesty vocabulary.
 * Presentation only; does not invent APIs or broaden permissions.
 */

export const BUSINESS_ADMIN_MATURITY = [
  "LIVE",
  "PARTIAL_LIVE",
  "FOUNDATION",
  "NAVIGATION_ONLY",
  "METADATA_ONLY",
  "CONFIGURATION_REQUIRED",
  "UNAVAILABLE",
  "DEFERRED",
] as const;

export type BusinessAdminMaturity = (typeof BUSINESS_ADMIN_MATURITY)[number];

export const BUSINESS_ADMIN_MATURITY_LABEL: Record<BusinessAdminMaturity, string> = {
  LIVE: "Live",
  PARTIAL_LIVE: "Partial live",
  FOUNDATION: "Foundation",
  NAVIGATION_ONLY: "Opens module",
  METADATA_ONLY: "Metadata only",
  CONFIGURATION_REQUIRED: "Configuration required",
  UNAVAILABLE: "Unavailable",
  DEFERRED: "Deferred",
};

/** Settings category presentation — separate from legacy LIVE classification for nav-only modules. */
export type SettingsCategoryPresentation =
  | "EDITABLE"
  | "NAVIGATION_ONLY"
  | "METADATA_ONLY"
  | "READ_ONLY"
  | "FOUNDATION"
  | "UNAVAILABLE";

export const SETTINGS_PRESENTATION_LABEL: Record<SettingsCategoryPresentation, string> = {
  EDITABLE: "Editable",
  NAVIGATION_ONLY: "Opens module",
  METADATA_ONLY: "Metadata only",
  READ_ONLY: "Read-only",
  FOUNDATION: "Foundation",
  UNAVAILABLE: "Unavailable",
};

export function settingsPresentationLabel(presentation: SettingsCategoryPresentation): string {
  return SETTINGS_PRESENTATION_LABEL[presentation];
}
