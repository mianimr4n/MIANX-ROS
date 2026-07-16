export interface OrderLineExtra {
  label?: string;
  slug?: string;
  /** Ignored by server — never trusted for pricing. */
  price?: number;
}

export interface CreateOrderItemInput {
  menuItemSlug: string;
  variantLabel?: string;
  quantity: number;
  /** Ignored by server. */
  unitPrice?: number;
  /** Ignored by server. */
  productName?: string;
  variantName?: string;
  instructions?: string;
  toppings?: Array<{ slug: string }>;
  extras?: OrderLineExtra[];
}

export interface QuoteOrderInput {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  items: CreateOrderItemInput[];
  couponCode?: string;
  /** Optional — when present, quote is bound to this phone (E.164). */
  contactPhone?: string;
}

export interface QuoteWarningView {
  code: string;
  message: string;
}

export interface QuoteOrderResult {
  quoteId: string;
  expiresAt: string;
  branch: {
    code: string;
    orderType: string;
  };
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
  warnings: QuoteWarningView[];
  /** ISO timestamp when server priced this quote (audit). */
  pricedAt: string;
}

export interface CreateOrderInput {
  branchCode: string;
  customerId?: string;
  orderType: "delivery" | "pickup" | "dine-in";
  orderSource: "website" | "whatsapp" | "mobile" | "pos" | "admin";
  contactName: string;
  contactPhone: string;
  deliveryAddress?: string;
  notes?: string;
  couponCode?: string;
  items: CreateOrderItemInput[];
  idempotencyKey: string;
  /** Optional Sprint 4.2 signed quote — never bypasses Idempotency-Key. */
  quoteId?: string;
}

export interface CreatedOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  createdAt: string;
  idempotentReplay?: boolean;
}

export interface OrderTrackingSummary {
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
    extras?: Array<{ slug: string; label: string; price: number }>;
  }>;
}

export interface OrdersDataSource {
  quoteOrder(input: QuoteOrderInput): Promise<QuoteOrderResult>;
  createOrder(input: CreateOrderInput): Promise<CreatedOrderSummary>;
  getOrderTracking(orderNumber: string, contactPhone: string): Promise<OrderTrackingSummary | null>;
}
