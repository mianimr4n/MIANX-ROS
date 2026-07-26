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

export type MenuSizeCode = "small" | "medium" | "large";

export interface ModifierOption {
  code: string;
  name: string;
  priceDelta: number;
  priceDeltaBySize?: Partial<Record<"small" | "medium" | "large", number>>;
  sizeCode?: "small" | "medium" | "large";
  linkedMenuItemSlug?: string;
  isDefault?: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  code: string;
  name: string;
  description?: string;
  selectionType: "single" | "multi";
  minSelect: number;
  maxSelect: number | null;
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOption[];
}

/**
 * A sellable SKU with exactly one current selling price.
 *
 * Sizes are separate SKUs grouped for display by `productGroupSlug`. There is no variant
 * price matrix: `price` is the one price, and `id` is the exact item the server prices.
 */
export interface MenuItem {
  id: string;
  slug?: string;
  name: string;
  /** Presentation-only family key shared by sibling size SKUs. */
  productGroupSlug?: string;
  /** Human-readable option label, e.g. `10 inch Medium`. Absent for single-option products. */
  sizeLabel?: string;
  /** Machine size tier used to match size-scaled modifier pricing. */
  sizeCode?: MenuSizeCode;
  category: string;
  categorySlug?: string;
  description: string;
  image: string;
  badge?: string;
  /** The single selling price of this SKU (PKR). */
  price: number;
  available?: boolean;
  sortOrder?: number;
  productType?: string;
  featured?: boolean;
  /** Relational modifier groups (DB or static fallback). */
  modifierGroups?: ModifierGroup[];
}

/**
 * Presentation grouping of sibling SKUs. Carries no price of its own — the customer picks
 * an option, and that option is the exact sellable SKU sent to the server.
 */
export interface MenuProductGroup {
  productGroupSlug: string;
  /** Family name without the size suffix, e.g. `Tele Special`. */
  name: string;
  category: string;
  categorySlug?: string;
  description: string;
  image: string;
  badge?: string;
  productType?: string;
  featured?: boolean;
  options: MenuItem[];
}

export interface MenuCategory {
  id?: string;
  name: string;
  slug?: string;
  sortOrder?: number;
}

export interface CreateOrderItemPayload {
  /** Preferred: the exact sellable SKU id. */
  menuItemId?: string;
  menuItemSlug: string;
  /** Size/option label snapshot for display; the server prices from the SKU. */
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  variantName?: string;
  instructions?: string;
  extras?: Array<{
    label: string;
    price: number;
    slug?: string;
    groupCode?: string;
    optionCode?: string;
  }>;
  modifiers?: Array<{
    groupCode: string;
    optionCode: string;
  }>;
}

export interface CreateOrderPayload {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  orderSource: "website" | "whatsapp" | "mobile" | "pos" | "admin";
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
    extras?: Array<{ slug?: string; label: string; price: number; kind?: string }>;
    modifiers?: Array<{
      groupCode: string;
      groupName: string;
      optionCode: string;
      optionName: string;
      priceDelta: number;
    }>;
  }>;
}

export interface CancelOrderResponse {
  orderNumber: string;
  status: "cancelled";
  cancelledAt: string;
  cancelReasonCode: string;
}
