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

/** All sellable SKUs that belong to the same product family as `slug`. */
export function findCatalogFamily(catalogItems: MenuItem[], slug: string): MenuItem[] {
  const direct = findCatalogItemBySlug(catalogItems, slug);
  const groupSlug = direct?.productGroupSlug ?? slug;
  return catalogItems.filter((entry) => (entry.productGroupSlug ?? entry.slug ?? entry.id) === groupSlug);
}

/**
 * Resolve topping price from shared catalog only.
 *
 * Size-scaled toppings are sibling SKUs in one family; the tier selects the exact SKU.
 * Returns null when the SKU is missing or the requested tier is unavailable — callers must
 * disable the option (never invent a price in UI business logic).
 */
export function resolveCatalogToppingPrice(
  family: MenuItem[] | MenuItem | undefined,
  tier: ToppingSizeTier,
): number | null {
  const options = Array.isArray(family) ? family : family ? [family] : [];
  if (options.length === 0) {
    return null;
  }

  if (options.length === 1) {
    return typeof options[0].price === "number" ? options[0].price : null;
  }

  const bySizeCode = options.find((option) => option.sizeCode === tier);
  if (bySizeCode && typeof bySizeCode.price === "number") {
    return bySizeCode.price;
  }

  const byLabel = options.find((option) => (option.sizeLabel ?? "").toLowerCase().includes(tier));
  if (byLabel && typeof byLabel.price === "number") {
    return byLabel.price;
  }

  // Size-tier toppings must not fall back to an unrelated sibling SKU price.
  return null;
}

/** Pizza families with more than one size SKU open the customizer. */
export function isPizzaFamily(group: { category: string; options: MenuItem[] }): boolean {
  const first = group.options[0];
  if (!first || !isCustomerBrowseItem(first)) {
    return false;
  }

  return group.category.includes("Pizza") && group.options.length > 1;
}

/** A single SKU opens the customizer only when it carries configurable modifiers. */
export function isConfigurableSku(item: MenuItem): boolean {
  return isCustomerBrowseItem(item) && Boolean(item.modifierGroups?.length);
}

/** Internal topping SKUs are never standalone cart products. */
export function isStandalonePurchasable(item: MenuItem): boolean {
  return isCustomerBrowseItem(item);
}

export function getLineItemTotal(price: number, extras: { price: number }[] = [], quantity = 1): number {
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
  return (price + extrasTotal) * quantity;
}
