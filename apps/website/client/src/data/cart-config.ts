import type { MenuItem } from "@/lib/telepizza-types";

/** Verified extra topping prices from REAL-MENU Link 3 (Small / Medium / Large). */
export type ToppingSizeTier = "small" | "medium" | "large";

export const EXTRA_TOPPING_PRICES = {
  chicken: { small: 50, medium: 100, large: 150 },
  cheese: { small: 50, medium: 100, large: 150 },
  cheeseSlice: 60,
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

export function isPizzaItem(item: MenuItem): boolean {
  return item.category.includes("Pizza") && Boolean(item.variants?.length);
}

export function getLineItemTotal(price: number, extras: { price: number }[] = [], quantity = 1): number {
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  return (price + extrasTotal) * quantity;
}
