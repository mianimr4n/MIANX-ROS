const PRODUCT_IMAGES = {
  signaturePizza: "/images/products/signature-pizza.jpg",
  periPeriPizza: "/images/products/peri-peri-pizza.jpg",
  classicPizza: "/images/products/classic-pizza.jpg",
  specialtyPizza: "/images/products/specialty-pizza.jpg",
  broast: "/images/products/broast.jpg",
  burger: "/images/products/burger.jpg",
  sandwich: "/images/products/sandwich.jpg",
  wings: "/images/products/wings.jpg",
  pasta: "/images/products/pasta.jpg",
  fries: "/images/products/fries.jpg",
  wrap: "/images/products/wrap.jpg",
  roll: "/images/products/roll.jpg",
  nuggets: "/images/products/nuggets.jpg",
  drinks: "/images/products/drinks.jpg",
  dealCombo: "/images/products/deal-combo.jpg",
} as const;

const SLUG_IMAGE_OVERRIDES: Record<string, string> = {
  "tele-special": PRODUCT_IMAGES.signaturePizza,
  "peri-peri": PRODUCT_IMAGES.periPeriPizza,
  "bihari-kabab": PRODUCT_IMAGES.signaturePizza,
  kababish: PRODUCT_IMAGES.signaturePizza,
  "behari-kabab-pizza": PRODUCT_IMAGES.specialtyPizza,
  "crown-crust": PRODUCT_IMAGES.specialtyPizza,
  "chicago-extreme": PRODUCT_IMAGES.specialtyPizza,
  "stuffed-crust": PRODUCT_IMAGES.specialtyPizza,
  "tele-extreme": PRODUCT_IMAGES.specialtyPizza,
  "sixteen-inch-incher": PRODUCT_IMAGES.specialtyPizza,
  "patty-burger": PRODUCT_IMAGES.burger,
  "crunchy-sandwich": PRODUCT_IMAGES.sandwich,
  "special-sandwich": PRODUCT_IMAGES.sandwich,
  "baked-smoked-sandwich": PRODUCT_IMAGES.sandwich,
  "sizzling-sandwich": PRODUCT_IMAGES.sandwich,
  "fried-crispy-wings": PRODUCT_IMAGES.wings,
  "bbq-wings": PRODUCT_IMAGES.wings,
  "creamo-wings": PRODUCT_IMAGES.wings,
  "oven-baked-wings": PRODUCT_IMAGES.wings,
  "flaming-wings": PRODUCT_IMAGES.wings,
  "loaded-fries": PRODUCT_IMAGES.fries,
  "french-fries": PRODUCT_IMAGES.fries,
  "family-fries": PRODUCT_IMAGES.fries,
  "jumbo-wrap": PRODUCT_IMAGES.wrap,
  "crunchy-wrap": PRODUCT_IMAGES.wrap,
  "dynamite-wrap": PRODUCT_IMAGES.wrap,
  "behari-roll": PRODUCT_IMAGES.roll,
  "crunchy-pasta": PRODUCT_IMAGES.pasta,
  "quarter-broast": PRODUCT_IMAGES.broast,
  "half-broast": PRODUCT_IMAGES.broast,
  "full-broast": PRODUCT_IMAGES.broast,
  "chicken-tender-strips": PRODUCT_IMAGES.nuggets,
  "crispy-box": PRODUCT_IMAGES.nuggets,
  nuggets: PRODUCT_IMAGES.nuggets,
  "hot-shots": PRODUCT_IMAGES.nuggets,
  "broast-garlic-dip": PRODUCT_IMAGES.broast,
  "broast-mustard-dip": PRODUCT_IMAGES.broast,
  "fried-chicken-chest": PRODUCT_IMAGES.broast,
  "fried-chicken": PRODUCT_IMAGES.broast,
  tikka: PRODUCT_IMAGES.classicPizza,
  "drink-1-5l": PRODUCT_IMAGES.drinks,
  "drink-1l": PRODUCT_IMAGES.drinks,
  "drink-500ml": PRODUCT_IMAGES.drinks,
  "drink-345ml": PRODUCT_IMAGES.drinks,
  "large-water": PRODUCT_IMAGES.drinks,
  "small-water": PRODUCT_IMAGES.drinks,
  "family-deal": "/images/promos/family-deal.jpg",
  "pizza-fest": "/images/promos/pizza-fest.jpg",
  "pair-deal": "/images/promos/pair-deal.jpg",
  "knock-out-deal": "/images/promos/knock-out-deal.jpg",
  "mega-offer": PRODUCT_IMAGES.dealCombo,
  "family-festival": PRODUCT_IMAGES.dealCombo,
  "deal-for-two": PRODUCT_IMAGES.dealCombo,
  "extra-chicken": PRODUCT_IMAGES.specialtyPizza,
  "extra-cheese": PRODUCT_IMAGES.specialtyPizza,
  "extra-cheese-slice": PRODUCT_IMAGES.specialtyPizza,
};

function getCategoryImage(categoryName: string): string {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes("signature")) {
    return PRODUCT_IMAGES.signaturePizza;
  }

  if (normalized.includes("classic")) {
    return PRODUCT_IMAGES.classicPizza;
  }

  if (normalized.includes("specialty")) {
    return PRODUCT_IMAGES.specialtyPizza;
  }

  if (normalized.includes("pizza")) {
    return PRODUCT_IMAGES.classicPizza;
  }

  if (normalized.includes("broast")) {
    return PRODUCT_IMAGES.broast;
  }

  if (normalized.includes("burger")) {
    return PRODUCT_IMAGES.burger;
  }

  if (normalized.includes("sandwich")) {
    return PRODUCT_IMAGES.sandwich;
  }

  if (normalized.includes("wing")) {
    return PRODUCT_IMAGES.wings;
  }

  if (normalized.includes("fries") || normalized.includes("sides") || normalized.includes("chicken &")) {
    return PRODUCT_IMAGES.fries;
  }

  if (normalized.includes("wrap") || normalized.includes("roll")) {
    return normalized.includes("roll") ? PRODUCT_IMAGES.roll : PRODUCT_IMAGES.wrap;
  }

  if (normalized.includes("pasta")) {
    return PRODUCT_IMAGES.pasta;
  }

  if (normalized.includes("drink")) {
    return PRODUCT_IMAGES.drinks;
  }

  if (normalized.includes("topping")) {
    return PRODUCT_IMAGES.specialtyPizza;
  }

  if (normalized.includes("deal")) {
    return PRODUCT_IMAGES.dealCombo;
  }

  return PRODUCT_IMAGES.nuggets;
}

export function getMenuItemImage(slug: string, categoryName: string): string {
  return SLUG_IMAGE_OVERRIDES[slug] ?? getCategoryImage(categoryName);
}

/** Prefer curated local assets; only trust remote URLs when absolute (CDN/storage). */
export function resolveMenuItemImage(
  slug: string,
  categoryName: string,
  imageUrl?: string | null,
): string {
  if (SLUG_IMAGE_OVERRIDES[slug]) {
    return SLUG_IMAGE_OVERRIDES[slug];
  }

  const remote = imageUrl?.trim();
  if (remote?.startsWith("http://") || remote?.startsWith("https://")) {
    return remote;
  }

  return getMenuItemImage(slug, categoryName);
}

export function getCategoryPlaceholderImage(categoryName: string): string {
  return getCategoryImage(categoryName);
}

export function withMenuItemImages<T extends { id: string; category: string; image: string }>(
  items: T[],
): T[] {
  return items.map((item) => ({
    ...item,
    image: getMenuItemImage(item.id, item.category),
  }));
}
