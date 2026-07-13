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
}

export interface MenuCatalog {
  categories: MenuCatalogCategory[];
  items: MenuCatalogItem[];
}

export interface CatalogDataSource {
  listBranches(): Promise<BranchSummary[]>;
  getMenuCatalog(): Promise<MenuCatalog>;
}
