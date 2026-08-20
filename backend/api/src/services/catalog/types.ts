export interface BranchSummary {
  id: string;
  code: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  hours: string;
  status: "operating" | "coming-soon" | "inactive";
}

export interface MenuCatalogCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

/**
 * A sellable SKU with exactly one current selling price.
 *
 * This is the only pricing unit in the canonical menu domain: Customer Website, Admin,
 * POS, Orders, Kitchen and Reports all reference `id`. `menu_item_variants` is deprecated
 * and is never exposed here.
 */
export interface MenuCatalogSku {
  id: string;
  slug: string;
  /** Full SKU name including its size/option suffix, e.g. `Tele Special — 10 inch Medium`. */
  name: string;
  /** Presentation-only family key shared by sibling SKUs. */
  productGroupSlug: string;
  /** Human-readable option label, e.g. `10 inch Medium`. Absent for single-option products. */
  sizeLabel?: string;
  /** Machine size tier used to match size-scaled modifier pricing. */
  sizeCode?: string;
  /** The single selling price of this SKU (PKR). */
  price: number;
  available: boolean;
  sortOrder: number;
  category: string;
  categorySlug: string;
  description: string;
  image: string;
  badge?: string;
  productType: string;
  featured: boolean;
  modifierGroups?: MenuCatalogModifierGroup[];
}

/**
 * Presentation grouping of sibling SKUs. Carries no price of its own — grouping is
 * metadata, never pricing indirection.
 */
export interface MenuCatalogProductGroup {
  productGroupSlug: string;
  /** Family name without the size suffix, e.g. `Tele Special`. */
  name: string;
  category: string;
  categorySlug: string;
  description: string;
  image: string;
  badge?: string;
  productType: string;
  featured: boolean;
  /** Every option is a real sellable SKU with one price. */
  options: MenuCatalogSku[];
}

export interface MenuCatalogModifierOption {
  code: string;
  name: string;
  priceDelta: number;
  priceDeltaBySize?: Partial<Record<"small" | "medium" | "large", number>>;
  sizeCode?: string;
  linkedMenuItemSlug?: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface MenuCatalogModifierGroup {
  code: string;
  name: string;
  description?: string;
  selectionType: "single" | "multi";
  minSelect: number;
  maxSelect: number | null;
  isRequired: boolean;
  sortOrder: number;
  options: MenuCatalogModifierOption[];
}

export interface MenuCatalogCategoryView extends MenuCatalogCategory {
  /** Product families in this category; each option inside is a sellable SKU. */
  items: MenuCatalogProductGroup[];
}

export interface MenuCatalog {
  /** Customer browse categories with their grouped product families. */
  categories: MenuCatalogCategoryView[];
  /** Flat browse SKUs — same data as categories[].items[].options, for search and POS. */
  skus: MenuCatalogSku[];
  /** Internal SKUs (toppings) available to customizer / Admin / POS, not a browse category. */
  toppings: MenuCatalogSku[];
}

/**
 * Tenant brand identity, sourced from public.brands (MIANX-ROS-01/02).
 * Shape mirrors apps/website/client/src/lib/brand.ts's BRAND constant so the
 * frontend can swap a hardcoded object for a fetched one with no other changes.
 */
export interface BrandConfig {
  name: string;
  legalName: string;
  tagline: string;
  region: string;
  logoPrimary: string;
  logoWordmark: string;
  favicon: string;
  phone: string;
  hours: string;
  city: string;
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
  };
}

export interface CatalogDataSource {
  listBranches(): Promise<BranchSummary[]>;
  getMenuCatalog(): Promise<MenuCatalog>;
  getBrandConfig(): Promise<BrandConfig>;
}
