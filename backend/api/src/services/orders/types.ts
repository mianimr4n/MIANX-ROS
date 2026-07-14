export interface OrderLineExtra {
  label: string;
  price: number;
}

export interface CreateOrderItemInput {
  menuItemSlug: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  productName: string;
  variantName?: string;
  instructions?: string;
  extras?: OrderLineExtra[];
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
}

export interface CreatedOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  totalAmount: number;
  createdAt: string;
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
  }>;
}

export interface OrdersDataSource {
  createOrder(input: CreateOrderInput): Promise<CreatedOrderSummary>;
  getOrderTracking(orderNumber: string, contactPhone: string): Promise<OrderTrackingSummary | null>;
}
