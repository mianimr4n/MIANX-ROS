import type { MenuCategory, MenuItem } from "@/lib/telepizza-types";

/** Internal catalog grouping — never shown as a customer menu browse tab. */
export const INTERNAL_CATEGORY_SLUGS = new Set(["toppings"]);

/** Product types that stay in the shared catalog for customizer/Admin/POS but not customer browse grids. */
export const INTERNAL_PRODUCT_TYPES = new Set(["topping"]);

export function isCustomerBrowseCategory(
  category: Pick<MenuCategory, "name" | "slug"> | { name: string; slug?: string },
): boolean {
  const slug = category.slug?.toLowerCase();
  if (slug && INTERNAL_CATEGORY_SLUGS.has(slug)) {
    return false;
  }

  return category.name.trim().toLowerCase() !== "toppings";
}

export function isCustomerBrowseItem(
  item: Pick<MenuItem, "productType" | "category" | "categorySlug">,
): boolean {
  if (item.productType && INTERNAL_PRODUCT_TYPES.has(item.productType)) {
    return false;
  }

  if (item.categorySlug && INTERNAL_CATEGORY_SLUGS.has(item.categorySlug.toLowerCase())) {
    return false;
  }

  return item.category.trim().toLowerCase() !== "toppings";
}

export function getCustomerBrowseCategories<T extends Pick<MenuCategory, "name" | "slug">>(
  categories: T[],
): T[] {
  return categories.filter(isCustomerBrowseCategory);
}

export function getCustomerBrowseItems<T extends Pick<MenuItem, "productType" | "category" | "categorySlug">>(
  items: T[],
): T[] {
  return items.filter(isCustomerBrowseItem);
}
