import type { MenuItem } from "@/lib/telepizza-types";
import { isCustomerBrowseItem } from "@/lib/menu-visibility";

/** Verified extra topping size tiers (maps pizza size → topping variant size_code). */
export type ToppingSizeTier = "small" | "medium" | "large";

/**
 * Shared topping SKU slugs — must match Supabase `menu_items.slug`
 * and static fallback entries in `menu-data.ts` (BFR-012 BOTH / Option B).
 */
export const PIZZA_TOPPING_SLUGS = {
  chicken: "extra-chicken",
  cheese: "extra-cheese",
  cheeseSlice: "extra-cheese-slice",
} as const;

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
 * Resolve topping price from shared catalog only.
 * Returns null when the SKU is missing or the requested tier/price is unavailable —
 * callers must disable the option (never invent a price in UI business logic).
 */
export function resolveCatalogToppingPrice(
  item: MenuItem | undefined,
  tier: ToppingSizeTier,
): number | null {
  if (!item) {
    return null;
  }

  if (item.variants && item.variants.length > 0) {
    const bySizeCode = item.variants.find((variant) => variant.sizeCode === tier);
    if (bySizeCode && typeof bySizeCode.price === "number") {
      return bySizeCode.price;
    }

    const labelMatch = item.variants.find((variant) => {
      const label = variant.label.toLowerCase();
      if (tier === "large") return label.includes("large");
      if (tier === "medium") return label.includes("medium");
      return label.includes("small");
    });
    if (labelMatch && typeof labelMatch.price === "number") {
      return labelMatch.price;
    }

    // Size-tier toppings must not fall back to an unrelated variant/base price.
    return null;
  }

  if (typeof item.price === "number") {
    return item.price;
  }

  return null;
}

/** Pizzas with size variants open the customizer. Flat / starting-price SKUs do not. */
export function isPizzaItem(item: MenuItem): boolean {
  if (!isCustomerBrowseItem(item)) {
    return false;
  }

  return item.category.includes("Pizza") && Boolean(item.variants?.length);
}

/** Internal topping SKUs are never standalone cart products. */
export function isStandalonePurchasable(item: MenuItem): boolean {
  return isCustomerBrowseItem(item);
}

export function getLineItemTotal(price: number, extras: { price: number }[] = [], quantity = 1): number {
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  return (price + extrasTotal) * quantity;
}
