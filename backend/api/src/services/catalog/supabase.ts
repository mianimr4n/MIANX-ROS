import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import type {
  BranchSummary,
  CatalogDataSource,
  MenuCatalog,
  MenuCatalogCategory,
  MenuCatalogItem,
  MenuCatalogVariant,
} from "./types.js";

interface BranchRow {
  id: string;
  branch_code: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: "operating" | "coming-soon" | "inactive";
  opening_hours: { daily?: string } | null;
}

interface MenuCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface MenuVariantRow {
  id: string;
  label: string;
  price: number | string;
  size_code: string | null;
  sort_order: number;
  is_default: boolean;
  is_available: boolean;
}

interface MenuItemRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number | string | null;
  badge: string | null;
  product_type: string;
  is_featured: boolean;
  category:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
  variants: MenuVariantRow[] | null;
}

function getCategory(
  category: MenuItemRow["category"],
) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category;
}

interface NormalizedMenuItemRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number | string | null;
  badge: string | null;
  product_type: string;
  is_featured: boolean;
  category: {
    name: string;
    slug: string;
  } | null;
  variants: MenuVariantRow[] | null;
}

export class ServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceConfigurationError";
  }
}

function createShortName(code: string) {
  return code
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  return 0;
}

function createSupabaseAdminClient(envStatus: EnvironmentStatus) {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ServiceConfigurationError(
      "Supabase admin client is unavailable because required environment variables are missing.",
    );
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getHours(status: BranchRow["status"], openingHours: BranchRow["opening_hours"]) {
  if (openingHours?.daily) {
    return openingHours.daily;
  }

  return status === "coming-soon" ? "Coming Soon" : "Hours unavailable";
}

function getFallbackImage(productType: string) {
  switch (productType) {
    case "burger":
      return "/images/menu-burger_bf9b42fb.jpg";
    case "drink":
      return "/images/desserts-drinks_397216c1.jpg";
    case "deal":
      return "/images/deals-section_ee7752d9.jpg";
    case "pasta":
      return "/images/pasta-dish_6d0eeea5.jpg";
    case "sandwich":
    case "wings":
    case "fries":
    case "wrap":
    case "side":
      return "/images/sides-platter_782cdd37.jpg";
    default:
      return "/images/menu-pizza_f729e710.jpg";
  }
}

async function fetchBranches(client: SupabaseClient): Promise<BranchSummary[]> {
  const { data, error } = await client
    .from("branches")
    .select("id, branch_code, name, city, address, phone, latitude, longitude, status, opening_hours")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load branches from Supabase: ${error.message}`);
  }

  return ((data ?? []) as BranchRow[]).map((row) => ({
    id: row.id,
    code: row.branch_code,
    name: row.name,
    shortName: createShortName(row.branch_code),
    address: row.address,
    phone: row.phone ?? "Coming Soon",
    city: row.city,
    coordinates: {
      lat: parseNumber(row.latitude),
      lng: parseNumber(row.longitude),
    },
    hours: getHours(row.status, row.opening_hours),
    status: row.status,
  }));
}

async function fetchMenuCatalog(client: SupabaseClient): Promise<MenuCatalog> {
  const [categoriesResult, itemsResult] = await Promise.all([
    client
      .from("menu_categories")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("menu_items")
      .select(
        "id, slug, name, description, image_url, base_price, badge, product_type, is_featured, category:menu_categories(name, slug), variants:menu_item_variants(id, label, price, size_code, sort_order, is_default, is_available)",
      )
      .eq("is_available", true)
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new Error(`Unable to load menu categories from Supabase: ${categoriesResult.error.message}`);
  }

  if (itemsResult.error) {
    throw new Error(`Unable to load menu items from Supabase: ${itemsResult.error.message}`);
  }

  const categories = ((categoriesResult.data ?? []) as MenuCategoryRow[]).map<MenuCatalogCategory>(
    (category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sort_order,
    }),
  );

  const items = (((itemsResult.data ?? []) as unknown as MenuItemRow[]).map<NormalizedMenuItemRow>(
    (item) => ({
      ...item,
      category: getCategory(item.category),
    }),
  ))
    .map<MenuCatalogItem>((item) => {
      const variants = (item.variants ?? [])
        .filter((variant) => variant.is_available)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map<MenuCatalogVariant>((variant) => ({
          id: variant.id,
          label: variant.label,
          price: parseNumber(variant.price),
          sizeCode: variant.size_code ?? undefined,
          isDefault: variant.is_default,
        }));

      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category?.name ?? "Uncategorized",
        categorySlug: item.category?.slug ?? "uncategorized",
        description: item.description ?? "",
        image: item.image_url ?? getFallbackImage(item.product_type),
        badge: item.badge ?? undefined,
        price: item.base_price === null ? undefined : parseNumber(item.base_price),
        productType: item.product_type,
        featured: item.is_featured,
        variants: variants.length > 0 ? variants : undefined,
      };
    })
    .sort((left, right) => {
      if (left.category === right.category) {
        if (left.featured !== right.featured) {
          return left.featured ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }

      const leftSort = categories.find((category) => category.slug === left.categorySlug)?.sortOrder ?? 9999;
      const rightSort = categories.find((category) => category.slug === right.categorySlug)?.sortOrder ?? 9999;
      return leftSort - rightSort;
    });

  return {
    categories,
    items,
  };
}

export function createSupabaseCatalogDataSource(envStatus: EnvironmentStatus): CatalogDataSource {
  return {
    async listBranches() {
      const client = createSupabaseAdminClient(envStatus);
      return fetchBranches(client);
    },
    async getMenuCatalog() {
      const client = createSupabaseAdminClient(envStatus);
      return fetchMenuCatalog(client);
    },
  };
}
