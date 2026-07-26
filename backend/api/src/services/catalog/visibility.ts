import type {
  MenuCatalogCategory,
  MenuCatalogCategoryView,
  MenuCatalogProductGroup,
  MenuCatalogSku,
} from "./types.js";

/** Internal catalog grouping — never returned as a customer browse category. */
export const INTERNAL_CATEGORY_SLUGS = new Set(["toppings"]);

/** Product types kept for Admin/POS/Kitchen SKUs but not customer browse grids. */
export const INTERNAL_PRODUCT_TYPES = new Set(["topping"]);

export function isCustomerBrowseCategory(category: Pick<MenuCatalogCategory, "name" | "slug">): boolean {
  if (INTERNAL_CATEGORY_SLUGS.has(category.slug.toLowerCase())) {
    return false;
  }

  return category.name.trim().toLowerCase() !== "toppings";
}

export function isCustomerBrowseItem(
  item: Pick<MenuCatalogSku, "productType" | "category" | "categorySlug">,
): boolean {
  if (INTERNAL_PRODUCT_TYPES.has(item.productType)) {
    return false;
  }

  if (INTERNAL_CATEGORY_SLUGS.has(item.categorySlug.toLowerCase())) {
    return false;
  }

  return item.category.trim().toLowerCase() !== "toppings";
}

/**
 * Derive the product-family name by stripping the SKU's size suffix.
 * `Tele Special — 10 inch Medium` + `10 inch Medium` -> `Tele Special`.
 */
export function deriveFamilyName(sku: Pick<MenuCatalogSku, "name" | "sizeLabel">): string {
  if (!sku.sizeLabel) {
    return sku.name;
  }

  const suffix = ` — ${sku.sizeLabel}`;
  return sku.name.endsWith(suffix) ? sku.name.slice(0, -suffix.length) : sku.name;
}

/** Group sellable SKUs into presentation-only product families, preserving SKU order. */
export function groupSkusIntoFamilies(skus: MenuCatalogSku[]): MenuCatalogProductGroup[] {
  const groups = new Map<string, MenuCatalogProductGroup>();

  for (const sku of skus) {
    const existing = groups.get(sku.productGroupSlug);
    if (existing) {
      existing.options.push(sku);
      existing.featured = existing.featured || sku.featured;
      continue;
    }

    groups.set(sku.productGroupSlug, {
      productGroupSlug: sku.productGroupSlug,
      name: deriveFamilyName(sku),
      category: sku.category,
      categorySlug: sku.categorySlug,
      description: sku.description,
      image: sku.image,
      badge: sku.badge,
      productType: sku.productType,
      featured: sku.featured,
      options: [sku],
    });
  }

  for (const group of groups.values()) {
    group.options.sort((left, right) => left.sortOrder - right.sortOrder || left.price - right.price);
  }

  return [...groups.values()];
}

export function splitMenuCatalogForCustomer(catalog: {
  categories: MenuCatalogCategory[];
  skus: MenuCatalogSku[];
}): {
  categories: MenuCatalogCategoryView[];
  skus: MenuCatalogSku[];
  toppings: MenuCatalogSku[];
} {
  const toppings = catalog.skus.filter((sku) => !isCustomerBrowseItem(sku));
  const skus = catalog.skus.filter(isCustomerBrowseItem);
  const families = groupSkusIntoFamilies(skus);

  const categories = catalog.categories.filter(isCustomerBrowseCategory).map<MenuCatalogCategoryView>(
    (category) => ({
      ...category,
      items: families.filter((family) => family.categorySlug === category.slug),
    }),
  );

  return { categories, skus, toppings };
}
