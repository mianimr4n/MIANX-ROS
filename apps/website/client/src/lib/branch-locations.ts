import type { Branch } from "@/lib/telepizza-types";

/**
 * Google Maps place feature ID for Telepizza, Royal Orchard, Multan.
 * Documented in REAL-MENU-EXTRACTION.md §2 (menu photo listing evidence).
 * Used for embed + directions so we never send customers to an unrelated pin
 * via provisional lat/lng.
 */
export const ROYAL_ORCHARD_GOOGLE_PLACE_FEATURE_ID =
  "0x393b35b86e6b36f1:0x340e96d98b9eed61";

export const ROYAL_ORCHARD_GOOGLE_PLACE_URL =
  `https://www.google.com/maps/place/data=!3m1!4b1!4m2!3m1!1s${ROYAL_ORCHARD_GOOGLE_PLACE_FEATURE_ID}`;

function isRoyalOrchard(branch: Pick<Branch, "id" | "code">): boolean {
  const code = (branch.code ?? branch.id).toLowerCase();
  return code === "royal-orchard" || branch.id === "royal-orchard";
}

/** Directions URL for the same branch shown in the Contact card. */
export function getBranchDirectionsUrl(branch: Branch): string | null {
  if (branch.status !== "operating") {
    return null;
  }
  if (isRoyalOrchard(branch)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      ROYAL_ORCHARD_GOOGLE_PLACE_FEATURE_ID,
    )}&travelmode=driving`;
  }
  // No verified place URL / coordinates for other branches — do not invent pins.
  return null;
}

/** Keyless Google Maps embed pointing at the verified Royal Orchard place. */
export function getBranchMapEmbedUrl(branch: Branch): string | null {
  if (branch.status !== "operating") {
    return null;
  }
  if (isRoyalOrchard(branch)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      ROYAL_ORCHARD_GOOGLE_PLACE_FEATURE_ID,
    )}&z=16&output=embed`;
  }
  return null;
}

export function getBranchPlaceUrl(branch: Branch): string | null {
  if (isRoyalOrchard(branch) && branch.status === "operating") {
    return ROYAL_ORCHARD_GOOGLE_PLACE_URL;
  }
  return null;
}
