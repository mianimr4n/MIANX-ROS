import {
  menuCategories as fallbackMenuCategories,
  menuItems as fallbackMenuItems,
} from "@/data/menu-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { MenuCategory, MenuItem, MenuVariant } from "@/lib/telepizza-types";

export type MenuCatalogSource = "supabase" | "static";

export interface MenuCatalogResult {
  categories: MenuCategory[];
  items: MenuItem[];
  source: MenuCatalogSource;
}

interface SupabaseMenuCategoryRow {
  id: number;
  name: string;
  slug: string;
  display_order: number;
}

interface SupabaseVariantJson {
  id: number;
  label: string;
  size_code: string | null;
  price: number;
  is_available: boolean;
}

interface SupabaseMenuItemRow {
  id: number;
  category_name: string;
  category_slug: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  badge: string | null;
  base_price: number | null;
  is_available: boolean;
  is_featured: boolean;
  display_order: number;
  variants: SupabaseVariantJson[] | null;
}

/** Existing bundled artwork only — never invent image URLs. */
export function getCategoryPlaceholderImage(categoryName: string): string {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes("pizza")) {
    return "/images/menu-pizza.jpg";
  }

  if (normalized.includes("burger") || normalized.includes("broast")) {
    return "/images/menu-burger.jpg";
  }

  if (normalized.includes("pasta")) {
    return "/images/pasta-dish.jpg";
  }

  if (
    normalized.includes("drink") ||
    normalized.includes("dessert") ||
    normalized.includes("telebar") ||
    normalized.includes("mojito") ||
    normalized.includes("smoothie") ||
    normalized.includes("matcha") ||
    normalized.includes("frappe") ||
    normalized.includes("shake") ||
    normalized.includes("mocktail") ||
    normalized.includes("coffee")
  ) {
    return "/images/desserts-drinks.jpg";
  }

  if (normalized.includes("deal")) {
    return "/images/deals-section.jpg";
  }

  return "/images/sides-platter.jpg";
}

function parseVariants(raw: unknown): MenuVariant[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((entry): entry is SupabaseVariantJson => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        "label" in entry &&
        "price" in entry &&
        entry.is_available !== false
      );
    })
    .map((entry) => ({
      id: String(entry.id),
      label: entry.label,
      price: Number(entry.price),
      sizeCode: entry.size_code ?? undefined,
    }));
}

function mapMenuItemRow(row: SupabaseMenuItemRow): MenuItem {
  const variants = parseVariants(row.variants);

  return {
    id: row.slug,
    slug: row.slug,
    name: row.name,
    category: row.category_name,
    categorySlug: row.category_slug,
    description: row.description ?? "",
    image: row.image_url?.trim() || getCategoryPlaceholderImage(row.category_name),
    badge: row.badge ?? undefined,
    price: variants.length > 0 ? undefined : row.base_price != null ? Number(row.base_price) : undefined,
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
      .select("id, name, slug, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("menu_items_with_pricing")
      .select(
        "id, category_name, category_slug, name, slug, description, image_url, badge, base_price, is_available, is_featured, display_order, variants",
      )
      .eq("is_available", true)
      .order("display_order", { ascending: true }),
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
    sortOrder: row.display_order,
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
