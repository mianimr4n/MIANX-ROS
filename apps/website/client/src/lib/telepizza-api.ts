import { fetchApiData } from "@/lib/api";
import type {
  Branch,
  CreateOrderPayload,
  CreatedOrderResponse,
  MenuCategory,
  MenuItem,
  OrderTrackingResponse,
} from "@/lib/telepizza-types";

interface MenuCatalogResponse {
  categories: MenuCategory[];
  items: MenuItem[];
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

export function fetchOrderTracking(orderNumber: string, phone: string) {
  const params = new URLSearchParams({ phone });
  return fetchApiData<OrderTrackingResponse>(
    `/orders/${encodeURIComponent(orderNumber)}/tracking?${params.toString()}`,
  );
}
