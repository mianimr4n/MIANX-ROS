import { fetchApiData, isApiConfigured } from "@/lib/api";
import type {
  Branch,
  CancelOrderResponse,
  CreateOrderPayload,
  CreatedOrderResponse,
  QuoteOrderResponse,
  ModifierGroup,
  OrderTrackingResponse,
} from "@/lib/telepizza-types";

/** Matches GET /api/v1/menu/catalog canonical-single-price-v1 contract. */
export interface ApiMenuCatalogSku {
  id: string;
  slug: string;
  name: string;
  productGroupSlug: string;
  sizeLabel?: string;
  sizeCode?: string;
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
  modifierGroups?: ModifierGroup[];
}

export interface ApiMenuCatalogCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  items: Array<{
    productGroupSlug: string;
    name: string;
    options: ApiMenuCatalogSku[];
  }>;
}

export interface MenuCatalogResponse {
  categories: ApiMenuCatalogCategory[];
  skus: ApiMenuCatalogSku[];
  toppings: ApiMenuCatalogSku[];
}

export function fetchBranches() {
  return fetchApiData<Branch[]>("/branches");
}

export function fetchMenuCatalog() {
  return fetchApiData<MenuCatalogResponse>("/menu/catalog");
}

export { isApiConfigured };

export function createOrder(payload: CreateOrderPayload) {
  return fetchApiData<CreatedOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createOrderWithIdempotency(
  payload: CreateOrderPayload,
  idempotencyKey: string,
  accessToken?: string,
) {
  return fetchApiData<CreatedOrderResponse>("/orders", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
    /** Preferred: exact sellable SKU id. */
    menuItemId?: string;
    menuItemSlug: string;
    variantLabel?: string;
    quantity: number;
    unitPrice?: number;
    productName?: string;
    variantName?: string;
    instructions?: string;
    extras?: Array<{ label?: string; slug?: string; price?: number }>;
    modifiers?: Array<{ groupCode: string; optionCode: string }>;
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

export function fetchOrder(orderNumber: string, phone: string) {
  const params = new URLSearchParams({ phone });
  return fetchApiData<OrderTrackingResponse>(
    `/orders/${encodeURIComponent(orderNumber)}?${params.toString()}`,
  );
}

export function cancelOrder(orderNumber: string, contactPhone: string, note?: string) {
  return fetchApiData<CancelOrderResponse>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      contactPhone,
      note: note?.trim() || undefined,
    }),
  });
}
