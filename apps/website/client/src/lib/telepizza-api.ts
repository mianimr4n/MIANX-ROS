import { fetchApiData } from "@/lib/api";
import type {
  Branch,
  CreateOrderPayload,
  CreatedOrderResponse,
  QuoteOrderResponse,
  MenuCategory,
  MenuItem,
  OrderTrackingResponse,
} from "@/lib/telepizza-types";

interface MenuCatalogResponse {
  categories: MenuCategory[];
  items: MenuItem[];
  /** Internal topping SKUs — not customer browse categories. */
  toppings: MenuItem[];
}

export function fetchBranches() {
  return fetchApiData<Branch[]>("/branches");
}

export function fetchMenuCatalog() {
  return fetchApiData<MenuCatalogResponse>("/menu/catalog");
}

export function createOrder(payload: CreateOrderPayload) {
  return fetchApiData<CreatedOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createOrderWithIdempotency(payload: CreateOrderPayload, idempotencyKey: string) {
  return fetchApiData<CreatedOrderResponse>("/orders", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function quoteOrder(payload: {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  couponCode?: string;
  contactPhone?: string;
  items: Array<{
    menuItemSlug: string;
    variantLabel?: string;
    quantity: number;
    unitPrice?: number;
    productName?: string;
    variantName?: string;
    instructions?: string;
    extras?: Array<{ label?: string; slug?: string; price?: number }>;
  }>;
}) {
  return fetchApiData<QuoteOrderResponse>("/orders/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchOrderTracking(orderNumber: string, phone: string) {
  const params = new URLSearchParams({ phone });
  return fetchApiData<OrderTrackingResponse>(
    `/orders/${encodeURIComponent(orderNumber)}/tracking?${params.toString()}`,
  );
}
