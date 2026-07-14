import {
  menuCategories as fallbackMenuCategories,
  menuItems as fallbackMenuItems,
} from "@/data/menu-data";
import { getCategoryPlaceholderImage, getMenuItemImage } from "@/lib/menu-images";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { MenuCategory, MenuItem, MenuVariant } from "@/lib/telepizza-types";

export type MenuCatalogSource = "supabase" | "static";

export interface MenuCatalogResult {
  categories: MenuCategory[];
  items: MenuItem[];
  source: MenuCatalogSource;
}

interface SupabaseMenuCategoryRow {
  id: number | string;
  name: string;
  slug: string;
  sort_order: number;
}

interface SupabaseMenuCategoryJoin {
  name: string;
  slug: string;
}

interface SupabaseMenuVariantRow {
  id: number | string;
  label: string;
  price: number | string;
  size_code: string | null;
  sort_order: number;
  is_default: boolean;
  is_available: boolean;
}

interface SupabaseMenuItemRow {
  id: number | string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  badge: string | null;
  base_price: number | string | null;
  product_type: string;
  is_featured: boolean;
  category: SupabaseMenuCategoryJoin | SupabaseMenuCategoryJoin[] | null;
  variants: SupabaseMenuVariantRow[] | null;
}

/** Re-export for category previews and Supabase fallbacks. */
export { getCategoryPlaceholderImage } from "@/lib/menu-images";

function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  return 0;
}

function getCategory(category: SupabaseMenuItemRow["category"]) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category;
}

function mapMenuItemRow(row: SupabaseMenuItemRow): MenuItem {
  const category = getCategory(row.category);
  const categoryName = category?.name ?? "Uncategorized";
  const categorySlug = category?.slug ?? "uncategorized";

  const variants: MenuVariant[] = (row.variants ?? [])
    .filter((variant) => variant.is_available !== false)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((variant) => ({
      id: String(variant.id),
      label: variant.label,
      price: parseNumber(variant.price),
      sizeCode: variant.size_code ?? undefined,
      isDefault: variant.is_default,
    }));

  return {
    id: row.slug,
    slug: row.slug,
    name: row.name,
    category: categoryName,
    categorySlug,
    description: row.description ?? "",
    image: row.image_url?.trim() || getMenuItemImage(row.slug, categoryName),
    badge: row.badge ?? undefined,
    price:
      variants.length > 0
        ? undefined
        : row.base_price != null
          ? parseNumber(row.base_price)
          : undefined,
    productType: row.product_type,
    featured: row.is_featured,
    variants: variants.length > 0 ? variants : undefined,
  };
}

function buildStaticCatalog(): MenuCatalogResult {
  return {
    categories: fallbackMenuCategories
      .filter((category) => category !== "All")
      .map((name, index) => ({ name, sortOrder: index + 1 })),
    items: fallbackMenuItems,
    source: "static",
  };
}

export function getStaticMenuCatalog(): MenuCatalogResult {
  return buildStaticCatalog();
}

export async function fetchMenuCatalogFromSupabase(): Promise<MenuCatalogResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return buildStaticCatalog();
  }

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select(
        "id, slug, name, description, image_url, base_price, badge, product_type, is_featured, category:menu_categories(name, slug), variants:menu_item_variants(id, label, price, size_code, sort_order, is_default, is_available)",
      )
      .eq("is_available", true)
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  const categories = (categoriesResult.data as SupabaseMenuCategoryRow[]).map((row) => ({
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  }));

  const items = (itemsResult.data as SupabaseMenuItemRow[]).map(mapMenuItemRow);

  if (categories.length === 0 || items.length === 0) {
    throw new Error("Supabase returned an empty menu catalog.");
  }

  return {
    categories,
    items,
    source: "supabase",
  };
}

export async function loadMenuCatalog(): Promise<MenuCatalogResult> {
  if (!isSupabaseConfigured) {
    return buildStaticCatalog();
  }

  return fetchMenuCatalogFromSupabase();
}
