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

export interface MenuCatalogVariant {
  id: string;
  label: string;
  price: number;
  sizeCode?: string;
  isDefault: boolean;
}

export interface MenuCatalogItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  description: string;
  image: string;
  badge?: string;
  price?: number;
  productType: string;
  featured: boolean;
  variants?: MenuCatalogVariant[];
  modifierGroups?: MenuCatalogModifierGroup[];
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

export interface MenuCatalog {
  /** Customer browse categories only (excludes internal groupings like Toppings). */
  categories: MenuCatalogCategory[];
  /** Customer browse items only (excludes product_type topping / internal SKUs). */
  items: MenuCatalogItem[];
  /** Shared topping SKUs for customizer / Admin / POS / Kitchen (not a browse category). */
  toppings: MenuCatalogItem[];
}

export interface CatalogDataSource {
  listBranches(): Promise<BranchSummary[]>;
  getMenuCatalog(): Promise<MenuCatalog>;
}
