export interface Branch {
  id: string;
  code?: string;
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

export interface MenuVariant {
  id?: string;
  label: string;
  price: number;
  sizeCode?: string;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  slug?: string;
  name: string;
  category: string;
  categorySlug?: string;
  description: string;
  image: string;
  badge?: string;
  price?: number;
  productType?: string;
  featured?: boolean;
  variants?: MenuVariant[];
}

export interface MenuCategory {
  id?: string;
  name: string;
  slug?: string;
  sortOrder?: number;
}
