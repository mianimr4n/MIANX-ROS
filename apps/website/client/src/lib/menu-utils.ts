import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

export function getDefaultVariant(item: MenuItem): MenuVariant | undefined {
  return item.variants?.[0];
}

export function getDisplayPrice(item: MenuItem): number | undefined {
  return getDefaultVariant(item)?.price ?? item.price;
}

export function getVariantId(variant: MenuVariant): string {
  return variant.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function buildCartItemPayload(
  item: MenuItem,
  variant?: MenuVariant,
) {
  const selectedVariant = variant ?? getDefaultVariant(item);
  const price = selectedVariant?.price ?? item.price;

  if (price === undefined) {
    return null;
  }

  const variantId = selectedVariant ? getVariantId(selectedVariant) : null;

    return {
      id: variantId ? `${item.id}-${variantId}` : item.id,
      menuSlug: item.id,
      name: item.name,
    price,
    category: item.category,
    variant: selectedVariant?.label,
    image: item.image,
    description: item.description,
  };
}

export function getItemsByCategory(items: MenuItem[], category: string): MenuItem[] {
  return items.filter((item) => item.category === category);
}

export function getItemsByIds(items: MenuItem[], ids: string[]): MenuItem[] {
  return ids
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is MenuItem => item !== undefined);
}
