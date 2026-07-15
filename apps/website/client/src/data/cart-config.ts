import type { MenuItem } from "@/lib/telepizza-types";

/** Verified extra topping size tiers (maps pizza size → topping variant size_code). */
export type ToppingSizeTier = "small" | "medium" | "large";

/**
 * Shared topping SKU slugs — must match Supabase `menu_items.slug`
 * and static fallback entries in `menu-data.ts` (BFR-012 BOTH).
 */
export const PIZZA_TOPPING_SLUGS = {
  chicken: "extra-chicken",
  cheese: "extra-cheese",
  cheeseSlice: "extra-cheese-slice",
} as const;

/**
 * Offline / missing-catalog emergency fallback only.
 * Source of truth is Supabase menu_items (+ variants) via the catalog.
 */
export const TOPPING_PRICE_FALLBACK = {
  chicken: { small: 50, medium: 100, large: 150 },
  cheese: { small: 50, medium: 100, large: 150 },
  cheeseSlice: 60,
} as const;

/** @deprecated Prefer catalog-driven resolveCatalogToppingPrice — kept for tests/compat. */
export const EXTRA_TOPPING_PRICES = TOPPING_PRICE_FALLBACK;

export const PIZZA_ADDON_DRINK_IDS = [
  "drink-345ml",
  "drink-500ml",
  "drink-1l",
  "drink-1-5l",
] as const;

export const PIZZA_ADDON_FRIES_IDS = ["french-fries", "family-fries", "loaded-fries"] as const;

/** Promo codes validated here only — no invented discounts. */
export const VERIFIED_COUPON_CODES: Record<string, { description: string }> = {};

export function getToppingTierFromVariantLabel(label: string): ToppingSizeTier {
  const normalized = label.toLowerCase();
  if (normalized.includes("12 inch") || normalized.includes('12"') || normalized === "large") {
    return "large";
  }
  if (
    normalized.includes("10 inch") ||
    normalized.includes('10"') ||
    normalized.includes("9 inch") ||
    normalized === "medium"
  ) {
    return "medium";
  }
  return "small";
}

export function findCatalogItemBySlug(
  catalogItems: MenuItem[],
  slug: string,
): MenuItem | undefined {
  return catalogItems.find((entry) => entry.id === slug || entry.slug === slug);
}

/**
 * Resolve topping price from shared catalog item (Admin Dashboard → Supabase → Website).
 * Falls back to verified seed prices only when the catalog row is unavailable.
 */
export function resolveCatalogToppingPrice(
  item: MenuItem | undefined,
  tier: ToppingSizeTier,
  fallback: number,
): number {
  if (!item) {
    return fallback;
  }

  if (item.variants && item.variants.length > 0) {
    const bySizeCode = item.variants.find((variant) => variant.sizeCode === tier);
    if (bySizeCode) {
      return bySizeCode.price;
    }

    const labelMatch = item.variants.find((variant) => {
      const label = variant.label.toLowerCase();
      if (tier === "large") return label.includes("large");
      if (tier === "medium") return label.includes("medium");
      return label.includes("small");
    });
    if (labelMatch) {
      return labelMatch.price;
    }
  }

  if (typeof item.price === "number") {
    return item.price;
  }

  return fallback;
}

export function isPizzaItem(item: MenuItem): boolean {
  if (item.category === "Toppings" || item.productType === "topping") {
    return false;
  }

  return item.category.includes("Pizza") && Boolean(item.variants?.length);
}

export function getLineItemTotal(price: number, extras: { price: number }[] = [], quantity = 1): number {
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  return (price + extrasTotal) * quantity;
}
