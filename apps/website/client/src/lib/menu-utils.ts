import type { MenuItem, MenuProductGroup } from "@/lib/telepizza-types";

/**
 * Canonical single-price helpers.
 *
 * Every `MenuItem` is a sellable SKU with exactly one price. Sizes are sibling SKUs inside
 * a `MenuProductGroup`; picking a size means picking a different SKU, never a price matrix.
 */

/** The option a product family shows first (cheapest available, else first listed). */
export function getDefaultSku(group: MenuProductGroup): MenuItem | undefined {
  const available = group.options.filter((option) => option.available !== false);
  return (available.length > 0 ? available : group.options)[0];
}

export function getDisplayPrice(item: MenuItem): number | undefined {
  return item.price;
}

/** True when a family offers more than one independently priced option. */
export function hasMultipleOptions(group: MenuProductGroup): boolean {
  return group.options.length > 1;
}

/** Flat SKUs with a "Starting Price" badge advertise a floor, not a full size matrix. */
export function isStartingPriceItem(item: MenuItem | MenuProductGroup): boolean {
  return Boolean(item.badge?.toLowerCase().includes("starting"));
}

export function formatMenuPriceLabel(item: MenuItem | MenuProductGroup, price?: number): string {
  if (price === undefined) {
    return "Unavailable";
  }

  const formatted = `Rs ${price.toLocaleString()}`;
  return isStartingPriceItem(item) ? `Starting from ${formatted}` : formatted;
}

/** Stable per-SKU cart key segment. */
export function getSkuKey(item: MenuItem): string {
  return item.slug ?? item.id;
}

export function buildCartItemPayload(item: MenuItem) {
  if (item.price === undefined) {
    return null;
  }

  return {
    id: getSkuKey(item),
    menuItemId: item.id,
    menuSlug: item.slug ?? item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    variant: item.sizeLabel,
    image: item.image,
    description: item.description,
  };
}

export function getItemsByCategory<T extends { category: string }>(items: T[], category: string): T[] {
  return items.filter((item) => item.category === category);
}

export function getItemsByIds(items: MenuItem[], ids: string[]): MenuItem[] {
  return ids
    .map((id) => items.find((item) => item.slug === id || item.id === id))
    .filter((item): item is MenuItem => item !== undefined);
}

/** Resolve product families by slug/id, preserving the requested order. */
export function getGroupsByIds(groups: MenuProductGroup[], ids: string[]): MenuProductGroup[] {
  return ids
    .map((id) => groups.find((group) => group.productGroupSlug === id))
    .filter((group): group is MenuProductGroup => group !== undefined);
}
