/** Menu Management helpers — read-only catalog browser; no invented CRUD. */

import { displayPrice } from "@/lib/admin-pos";
import type { MenuCategory, MenuItem } from "@/lib/telepizza-types";

export type MenuCatalogItemView = MenuItem & {
  catalogScope: "browse" | "internal";
};

export type MenuKpiSnapshot = {
  categories: number;
  products: number;
  browseProducts: number;
  internalSkus: number;
  deals: number;
  modifierGroups: number;
  variants: number;
  averagePrice: number | null;
  withModifiers: number;
  missingImages: number;
};

export type MenuInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "derived" | "foundation";
};

export type MenuFilterState = {
  categorySlug: string;
  productType: string;
  featuredOnly: boolean;
  hasModifiersOnly: boolean;
  search: string;
};

export function mergeCatalogProducts(items: MenuItem[], toppings: MenuItem[]): MenuCatalogItemView[] {
  const browse = items.map((item) => ({ ...item, catalogScope: "browse" as const }));
  const internal = toppings.map((item) => ({ ...item, catalogScope: "internal" as const }));
  return [...browse, ...internal];
}

export function itemSku(item: MenuItem): string {
  return item.slug ?? item.id;
}

export function isLikelyOutOfStock(item: MenuItem): boolean {
  const price = displayPrice(item);
  return price <= 0;
}

export function modifierGroupCount(item: MenuItem): number {
  return item.modifierGroups?.length ?? 0;
}

export function variantCount(item: MenuItem): number {
  return item.variants?.length ?? 0;
}

export function buildMenuKpis(products: MenuCatalogItemView[]): MenuKpiSnapshot {
  const browse = products.filter((p) => p.catalogScope === "browse");
  const modifierGroups = products.reduce((sum, p) => sum + modifierGroupCount(p), 0);
  const variants = products.reduce((sum, p) => sum + variantCount(p), 0);
  const prices = browse.map((p) => displayPrice(p)).filter((n) => n > 0);
  const categories = new Set(browse.map((p) => p.categorySlug ?? p.category)).size;

  return {
    categories,
    products: products.length,
    browseProducts: browse.length,
    internalSkus: products.length - browse.length,
    deals: browse.filter((p) => p.productType === "deal").length,
    modifierGroups,
    variants,
    averagePrice:
      prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    withModifiers: products.filter((p) => modifierGroupCount(p) > 0).length,
    missingImages: products.filter((p) => !p.image || p.image.includes("placeholder")).length,
  };
}

export function filterMenuProducts(products: MenuCatalogItemView[], filters: MenuFilterState): MenuCatalogItemView[] {
  const needle = filters.search.trim().toLowerCase();
  return products.filter((product) => {
    if (filters.categorySlug && (product.categorySlug ?? "") !== filters.categorySlug && filters.categorySlug !== "internal") {
      return false;
    }
    if (filters.categorySlug === "internal" && product.catalogScope !== "internal") {
      return false;
    }
    if (filters.productType && product.productType !== filters.productType) {
      return false;
    }
    if (filters.featuredOnly && !product.featured) {
      return false;
    }
    if (filters.hasModifiersOnly && modifierGroupCount(product) === 0) {
      return false;
    }
    if (!needle) return true;
    return (
      product.name.toLowerCase().includes(needle) ||
      itemSku(product).toLowerCase().includes(needle) ||
      product.description.toLowerCase().includes(needle) ||
      product.category.toLowerCase().includes(needle)
    );
  });
}

export function buildMenuInsights(products: MenuCatalogItemView[]): MenuInsightItem[] {
  const items: MenuInsightItem[] = [];
  const missingImages = products.filter((p) => !p.image).length;
  const noCategory = products.filter((p) => !p.categorySlug || p.category === "Uncategorized").length;
  const heavyModifiers = products.filter((p) => modifierGroupCount(p) >= 3).length;
  const duplicateNames = (() => {
    const names = new Map<string, number>();
    for (const p of products) {
      const key = p.name.trim().toLowerCase();
      names.set(key, (names.get(key) ?? 0) + 1);
    }
    return Array.from(names.values()).filter((n) => n > 1).length;
  })();

  if (missingImages > 0) {
    items.push({
      id: "missing-images",
      title: `${missingImages} products are missing dedicated images in the loaded catalog.`,
      detail: "Rule-based Summary from catalog image_url fields.",
      source: "derived",
    });
  }
  if (noCategory > 0) {
    items.push({
      id: "missing-category",
      title: `${noCategory} products lack a resolved category slug.`,
      detail: "Derived from categorySlug on catalog items.",
      source: "derived",
    });
  }
  if (heavyModifiers > 0) {
    items.push({
      id: "heavy-modifiers",
      title: `${heavyModifiers} products have three or more modifier groups.`,
      detail: "Review modifier complexity before POS/customizer rollout.",
      source: "derived",
    });
  }
  if (duplicateNames > 0) {
    items.push({
      id: "duplicate-names",
      title: `${duplicateNames} duplicate product names appear in the catalog.`,
      detail: "Slug remains unique — names may still confuse staff search.",
      source: "derived",
    });
  }

  items.push({
    id: "read-only",
    title: "Menu Management is read-only — no admin write API exists yet.",
    detail: "Create, update, publish, and branch overrides require menu.write backend endpoints.",
    source: "foundation",
  });

  if (items.filter((i) => i.source !== "foundation").length === 0) {
    return [
      {
        id: "calm",
        title: "Catalog loaded without elevated menu quality signals.",
        detail: "Mianx.ai surfaces rule-based summaries as gaps appear.",
        source: "foundation",
      },
      items.find((i) => i.id === "read-only")!,
    ];
  }

  return items.slice(0, 6);
}

export function categoryTreeEntries(
  categories: MenuCategory[],
  products: MenuCatalogItemView[],
): Array<{ slug: string; name: string; count: number; internal?: boolean }> {
  const entries: Array<{ slug: string; name: string; count: number; internal?: boolean }> = categories.map((category) => ({
    slug: category.slug ?? category.name,
    name: category.name,
    count: products.filter((p) => p.catalogScope === "browse" && (p.categorySlug ?? p.category) === (category.slug ?? category.name)).length,
  }));
  const internalCount = products.filter((p) => p.catalogScope === "internal").length;
  if (internalCount > 0) {
    entries.push({ slug: "internal", name: "Internal / Toppings", count: internalCount, internal: true });
  }
  return entries;
}
