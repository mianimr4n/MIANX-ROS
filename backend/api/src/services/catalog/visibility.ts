import type { MenuCatalogCategory, MenuCatalogItem } from "./types.js";

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

export function isCustomerBrowseItem(item: Pick<MenuCatalogItem, "productType" | "category" | "categorySlug">): boolean {
  if (INTERNAL_PRODUCT_TYPES.has(item.productType)) {
    return false;
  }

  if (INTERNAL_CATEGORY_SLUGS.has(item.categorySlug.toLowerCase())) {
    return false;
  }

  return item.category.trim().toLowerCase() !== "toppings";
}

export function splitMenuCatalogForCustomer(catalog: {
  categories: MenuCatalogCategory[];
  items: MenuCatalogItem[];
}): {
  categories: MenuCatalogCategory[];
  items: MenuCatalogItem[];
  toppings: MenuCatalogItem[];
} {
  const toppings = catalog.items.filter((item) => !isCustomerBrowseItem(item));
  const items = catalog.items.filter(isCustomerBrowseItem);
  const categories = catalog.categories.filter(isCustomerBrowseCategory);

  return { categories, items, toppings };
}
