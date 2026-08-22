import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import type {
  BranchSummary,
  CatalogDataSource,
  MenuCatalog,
  MenuCatalogCategory,
  MenuCatalogModifierGroup,
  MenuCatalogSku,
} from "./types.js";
import { splitMenuCatalogForCustomer } from "./visibility.js";

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

interface MenuItemRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | string;
  product_group_slug: string | null;
  size_label: string | null;
  size_code: string | null;
  sort_order: number;
  badge: string | null;
  product_type: string;
  is_available: boolean;
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
}

function getCategory(
  category: MenuItemRow["category"],
) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category;
}

type NormalizedMenuItemRow = Omit<MenuItemRow, "category"> & {
  category: {
    name: string;
    slug: string;
  } | null;
};

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
    case "topping":
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

async function fetchModifierGroupsByItemSlug(
  client: SupabaseClient,
): Promise<Map<string, MenuCatalogModifierGroup[]>> {
  const { data, error } = await client
    .from("item_modifier_groups")
    .select(
      "sort_order, is_active, is_available, is_required, min_select, max_select, menu_item:menu_items!inner(slug), group:modifier_groups!inner(code, name, description, selection_type, min_select, max_select, is_required, sort_order, is_active, options:modifier_options(code, name, price_delta, price_delta_by_size, size_code, is_default, sort_order, is_active, linked_item:menu_items!modifier_options_linked_menu_item_id_fkey(slug)))",
    )
    .eq("is_active", true)
    .eq("is_available", true)
    .is("branch_id", null);

  if (error) {
    // Additive feature — catalog still works before migration is applied.
    return new Map();
  }

  const bySlug = new Map<string, MenuCatalogModifierGroup[]>();
  for (const row of data ?? []) {
    const menuItemRaw = (row as { menu_item: { slug: string } | { slug: string }[] }).menu_item;
    const groupRaw = (
      row as {
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
              options:
                | Array<{
                    code: string;
                    name: string;
                    price_delta: number | string;
                    price_delta_by_size: Partial<Record<"small" | "medium" | "large", number>> | null;
                    size_code: string | null;
                    is_default: boolean;
                    sort_order: number;
                    is_active: boolean;
                    linked_item: { slug: string } | { slug: string }[] | null;
                  }>
                | null;
            }
          | Array<{
              code: string;
              name: string;
              description: string | null;
              selection_type: "single" | "multi";
              min_select: number;
              max_select: number | null;
              is_required: boolean;
              sort_order: number;
              is_active: boolean;
              options:
                | Array<{
                    code: string;
                    name: string;
                    price_delta: number | string;
                    price_delta_by_size: Partial<Record<"small" | "medium" | "large", number>> | null;
                    size_code: string | null;
                    is_default: boolean;
                    sort_order: number;
                    is_active: boolean;
                    linked_item: { slug: string } | { slug: string }[] | null;
                  }>
                | null;
            }>;
      }
    ).group;

    const menuItem = Array.isArray(menuItemRaw) ? menuItemRaw[0] : menuItemRaw;
    const group = Array.isArray(groupRaw) ? groupRaw[0] : groupRaw;
    if (!menuItem?.slug || !group || group.is_active === false) continue;

    const mapped: MenuCatalogModifierGroup = {
      code: group.code,
      name: group.name,
      description: group.description ?? undefined,
      selectionType: group.selection_type,
      minSelect: (row as { min_select: number | null }).min_select ?? group.min_select,
      maxSelect: (row as { max_select: number | null }).max_select ?? group.max_select,
      isRequired: (row as { is_required: boolean | null }).is_required ?? group.is_required,
      sortOrder: (row as { sort_order: number }).sort_order ?? group.sort_order,
      options: (group.options ?? [])
        .filter((option) => option.is_active !== false)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((option) => {
          const linked = Array.isArray(option.linked_item)
            ? option.linked_item[0]
            : option.linked_item;
          return {
            code: option.code,
            name: option.name,
            priceDelta: parseNumber(option.price_delta),
            priceDeltaBySize: option.price_delta_by_size ?? undefined,
            sizeCode: option.size_code ?? undefined,
            linkedMenuItemSlug: linked?.slug,
            isDefault: option.is_default,
            sortOrder: option.sort_order,
          };
        }),
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

async function fetchMenuCatalog(client: SupabaseClient): Promise<MenuCatalog> {
  // TODO(ADR-046 follow-up): hardcoded to Telepizza's organization_id until a
  // tenant-resolution strategy for anonymous/public traffic is decided (see
  // ADR-045 Section 1, "anonymous public reads"). There is exactly one
  // tenant today, so this is unambiguous; do not remove this filter when
  // adding a second tenant without first deciding how public requests
  // resolve which tenant they're asking about.
  const organizationId = "00000000-0000-4000-8000-000000000001";

  const [categoriesResult, itemsResult, modifiersBySlug] = await Promise.all([
    client
      .from("menu_categories")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true }),
    client
      .from("menu_items")
      .select(
        "id, slug, name, description, image_url, price, product_group_slug, size_label, size_code, sort_order, badge, product_type, is_available, is_featured, category:menu_categories(name, slug)",
      )
      .eq("is_available", true)
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    fetchModifierGroupsByItemSlug(client),
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

  const skus = (((itemsResult.data ?? []) as unknown as MenuItemRow[]).map<NormalizedMenuItemRow>(
    (item) => ({
      ...item,
      category: getCategory(item.category),
    }),
  ))
    .map<MenuCatalogSku>((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      productGroupSlug: item.product_group_slug ?? item.slug,
      sizeLabel: item.size_label ?? undefined,
      sizeCode: item.size_code ?? undefined,
      price: parseNumber(item.price),
      available: item.is_available,
      sortOrder: item.sort_order ?? 0,
      category: item.category?.name ?? "Uncategorized",
      categorySlug: item.category?.slug ?? "uncategorized",
      description: item.description ?? "",
      image: item.image_url ?? getFallbackImage(item.product_type),
      badge: item.badge ?? undefined,
      productType: item.product_type,
      featured: item.is_featured,
      modifierGroups: modifiersBySlug.get(item.slug),
    }))
    .sort((left, right) => {
      if (left.categorySlug === right.categorySlug) {
        if (left.productGroupSlug === right.productGroupSlug) {
          return left.sortOrder - right.sortOrder || left.price - right.price;
        }
        if (left.featured !== right.featured) {
          return left.featured ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      }

      const leftSort = categories.find((category) => category.slug === left.categorySlug)?.sortOrder ?? 9999;
      const rightSort = categories.find((category) => category.slug === right.categorySlug)?.sortOrder ?? 9999;
      return leftSort - rightSort;
    });

  return splitMenuCatalogForCustomer({
    categories,
    skus,
  });
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
