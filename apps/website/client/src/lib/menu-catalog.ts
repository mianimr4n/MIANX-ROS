import {
  menuCategories as fallbackMenuCategories,
  menuItems as fallbackMenuItems,
} from "@/data/menu-data";
import {
  getStaticModifierGroupsForItem,
  type ModifierGroupDef,
  type ModifierSizeTier,
} from "@/data/modifier-catalog";
import { getCategoryPlaceholderImage, resolveMenuItemImage } from "@/lib/menu-images";
import {
  getCustomerBrowseCategories,
  getCustomerBrowseItems,
  isCustomerBrowseItem,
} from "@/lib/menu-visibility";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { MenuCategory, MenuItem, MenuVariant, ModifierGroup } from "@/lib/telepizza-types";

export type MenuCatalogSource = "supabase" | "static";

export interface MenuCatalogResult {
  /** Public customer categories only (13). */
  categories: MenuCategory[];
  /** Public browseable products only. */
  items: MenuItem[];
  /** Internal topping SKUs for Pizza Customizer / Admin / POS. */
  toppings: MenuItem[];
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

function mapModifierGroups(defs: ModifierGroupDef[]): ModifierGroup[] {
  return defs.map((group) => ({
    code: group.code,
    name: group.name,
    description: group.description,
    selectionType: group.selectionType,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    isRequired: group.isRequired,
    sortOrder: group.sortOrder,
    options: group.options.map((option) => ({
      code: option.code,
      name: option.name,
      priceDelta: option.priceDelta,
      priceDeltaBySize: option.priceDeltaBySize,
      sizeCode: option.sizeCode,
      linkedMenuItemSlug: option.linkedMenuItemSlug,
      isDefault: option.isDefault,
      sortOrder: option.sortOrder,
    })),
  }));
}

function attachStaticModifiers(item: MenuItem): MenuItem {
  const groups = mapModifierGroups(getStaticModifierGroupsForItem(item.slug ?? item.id));
  return groups.length > 0 ? { ...item, modifierGroups: groups } : item;
}

function mapMenuItemRow(row: SupabaseMenuItemRow, modifierGroups?: ModifierGroup[]): MenuItem {
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
    image: resolveMenuItemImage(row.slug, categoryName, row.image_url),
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
    modifierGroups:
      modifierGroups && modifierGroups.length > 0
        ? modifierGroups
        : mapModifierGroups(getStaticModifierGroupsForItem(row.slug)),
  };
}

interface SupabaseModifierOptionRow {
  code: string;
  name: string;
  price_delta: number | string;
  price_delta_by_size: Partial<Record<ModifierSizeTier, number>> | null;
  size_code: string | null;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  linked_item: { slug: string } | { slug: string }[] | null;
}

interface SupabaseItemModifierGroupRow {
  menu_item_id: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean | null;
  min_select: number | null;
  max_select: number | null;
  menu_item: { slug: string } | { slug: string }[] | null;
  group:
    | {
        code: string;
        name: string;
        description: string | null;
        selection_type: "single" | "multi";
        min_select: number;
        max_select: number | null;
        is_required: boolean;
        sort_order: number;
        is_active: boolean;
        options: SupabaseModifierOptionRow[] | null;
      }
    | {
        code: string;
        name: string;
        description: string | null;
        selection_type: "single" | "multi";
        min_select: number;
        max_select: number | null;
        is_required: boolean;
        sort_order: number;
        is_active: boolean;
        options: SupabaseModifierOptionRow[] | null;
      }[]
    | null;
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapSupabaseModifierGroupsBySlug(
  rows: SupabaseItemModifierGroupRow[],
): Map<string, ModifierGroup[]> {
  const bySlug = new Map<string, ModifierGroup[]>();

  for (const row of rows) {
    if (row.is_active === false) continue;
    const menuItem = unwrapOne(row.menu_item);
    const group = unwrapOne(row.group);
    if (!menuItem?.slug || !group || group.is_active === false) continue;

    const options = (group.options ?? [])
      .filter((option) => option.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((option) => {
        const linked = unwrapOne(option.linked_item);
        return {
          code: option.code,
          name: option.name,
          priceDelta: parseNumber(option.price_delta),
          priceDeltaBySize: option.price_delta_by_size ?? undefined,
          sizeCode: (option.size_code as ModifierSizeTier | null) ?? undefined,
          linkedMenuItemSlug: linked?.slug,
          isDefault: option.is_default,
          sortOrder: option.sort_order,
        };
      });

    const mapped: ModifierGroup = {
      code: group.code,
      name: group.name,
      description: group.description ?? undefined,
      selectionType: group.selection_type,
      minSelect: row.min_select ?? group.min_select,
      maxSelect: row.max_select ?? group.max_select,
      isRequired: row.is_required ?? group.is_required,
      sortOrder: row.sort_order ?? group.sort_order,
      options,
    };

    const existing = bySlug.get(menuItem.slug) ?? [];
    existing.push(mapped);
    bySlug.set(
      menuItem.slug,
      existing.sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }

  return bySlug;
}

function splitCatalog(
  categories: MenuCategory[],
  allItems: MenuItem[],
  source: MenuCatalogSource,
): MenuCatalogResult {
  return {
    categories: getCustomerBrowseCategories(categories),
    items: getCustomerBrowseItems(allItems),
    toppings: allItems.filter((item) => !isCustomerBrowseItem(item)),
    source,
  };
}

function buildStaticCatalog(): MenuCatalogResult {
  const categories = getCustomerBrowseCategories(
    fallbackMenuCategories
      .filter((category) => category !== "All")
      .map((name, index) => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        sortOrder: index + 1,
      })),
  );

  return splitCatalog(categories, fallbackMenuItems.map(attachStaticModifiers), "static");
}

export function getStaticMenuCatalog(): MenuCatalogResult {
  return buildStaticCatalog();
}

export async function fetchMenuCatalogFromSupabase(): Promise<MenuCatalogResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return buildStaticCatalog();
  }

  const [categoriesResult, itemsResult, modifiersResult] = await Promise.all([
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
    supabase
      .from("item_modifier_groups")
      .select(
        "menu_item_id, sort_order, is_active, is_required, min_select, max_select, menu_item:menu_items(slug), group:modifier_groups(code, name, description, selection_type, min_select, max_select, is_required, sort_order, is_active, options:modifier_options(code, name, price_delta, price_delta_by_size, size_code, is_default, sort_order, is_active, linked_item:menu_items!modifier_options_linked_menu_item_id_fkey(slug)))",
      )
      .eq("is_active", true),
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

  const modifiersBySlug =
    modifiersResult.error || !modifiersResult.data
      ? new Map<string, ModifierGroup[]>()
      : mapSupabaseModifierGroupsBySlug(modifiersResult.data as SupabaseItemModifierGroupRow[]);

  const items = (itemsResult.data as SupabaseMenuItemRow[]).map((row) =>
    mapMenuItemRow(row, modifiersBySlug.get(row.slug)),
  );

  if (categories.length === 0 || items.length === 0) {
    throw new Error("Supabase returned an empty menu catalog.");
  }

  return splitCatalog(categories, items, "supabase");
}

export async function loadMenuCatalog(): Promise<MenuCatalogResult> {
  if (!isSupabaseConfigured) {
    return buildStaticCatalog();
  }

  return fetchMenuCatalogFromSupabase();
}
