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

export interface CreateOrderItemPayload {
  menuItemSlug: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  variantName?: string;
  instructions?: string;
  extras?: Array<{ label: string; price: number }>;
}

export interface CreateOrderPayload {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  orderSource: "website";
  contactName: string;
  contactPhone: string;
  deliveryAddress?: string;
  notes?: string;
  couponCode?: string;
  items: CreateOrderItemPayload[];
  /** Optional Sprint 4.2 signed quote id. */
  quoteId?: string;
}

export interface CreatedOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  createdAt: string;
}

export interface QuoteWarning {
  code: string;
  message: string;
}

export interface QuoteOrderResponse {
  quoteId: string;
  expiresAt: string;
  branch: { code: string; orderType: string };
  items: Array<{
    menuItemSlug: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    foodUnitPrice: number;
    extras: Array<{ slug: string; label: string; price: number; kind: string }>;
    lineUnitPrice: number;
    lineTotal: number;
  }>;
  totals: {
    currency: "PKR";
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    deliveryFee: number;
    totalAmount: number;
  };
  warnings: QuoteWarning[];
  pricedAt: string;
}

export interface OrderTrackingResponse {
  orderNumber: string;
  status: string;
  orderType: string;
  contactName: string;
  contactPhone: string;
  subtotal: number;
  totalAmount: number;
  deliveryAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions?: string | null;
  }>;
}
