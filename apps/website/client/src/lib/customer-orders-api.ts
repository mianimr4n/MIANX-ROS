import { fetchApiData, isApiConfigured } from "@/lib/api";
import type { StoredOrder, StoredOrderItem } from "@/lib/customer-store";

export type CloudOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  branchId: string;
  branchCode: string;
  contactName: string;
  contactPhone: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CloudOrderDetail = CloudOrderListItem & {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  deliveryAddress: string | null;
  notes: string | null;
  branchName: string;
  items: Array<{
    menuItemSlug?: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions: string | null;
    extras: Array<{ slug: string; label: string; price: number }>;
  }>;
};

export const cloudOrdersAvailable = isApiConfigured;

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

function normalizeOrderType(value: string): StoredOrder["orderType"] {
  if (value === "pickup" || value === "dine-in") return value;
  return "delivery";
}

function mapCloudItems(
  items: CloudOrderDetail["items"] | undefined,
): StoredOrderItem[] {
  return (items ?? []).map((item) => ({
    menuItemSlug: item.menuItemSlug,
    productName: item.productName,
    variantName: item.variantName ?? undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    instructions: item.instructions ?? undefined,
    extras: item.extras?.map((extra) => ({
      label: extra.label,
      price: extra.price,
      slug: extra.slug,
    })),
  }));
}

export function cloudListItemToStored(item: CloudOrderListItem): StoredOrder {
  return {
    id: item.id,
    orderNumber: item.orderNumber,
    status: item.status,
    orderType: normalizeOrderType(item.orderType),
    branchCode: item.branchCode,
    branchName: item.branchCode,
    contactName: item.contactName,
    contactPhone: item.contactPhone,
    subtotal: item.totalAmount,
    totalAmount: item.totalAmount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    source: "api",
    items: [],
  };
}

export function cloudDetailToStored(detail: CloudOrderDetail): StoredOrder {
  return {
    id: detail.id,
    orderNumber: detail.orderNumber,
    status: detail.status,
    orderType: normalizeOrderType(detail.orderType),
    branchCode: detail.branchCode,
    branchName: detail.branchName || detail.branchCode,
    contactName: detail.contactName,
    contactPhone: detail.contactPhone,
    deliveryAddress: detail.deliveryAddress ?? undefined,
    notes: detail.notes ?? undefined,
    subtotal: detail.subtotal,
    totalAmount: detail.totalAmount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    source: "api",
    items: mapCloudItems(detail.items),
  };
}

export async function fetchCloudOrders(
  accessToken: string,
  options: { limit?: number; offset?: number; status?: string } = {},
): Promise<{ orders: CloudOrderListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.status) params.set("status", options.status);
  const query = params.toString();
  const path = query ? `/me/orders?${query}` : "/me/orders";

  const data = await fetchApiData<{
    orders: CloudOrderListItem[];
    pagination: { total: number };
  }>(path, { headers: authHeaders(accessToken) });

  return {
    orders: data.orders ?? [],
    total: data.pagination?.total ?? data.orders?.length ?? 0,
  };
}

export async function fetchCloudOrderDetail(
  accessToken: string,
  orderNumber: string,
): Promise<CloudOrderDetail> {
  const data = await fetchApiData<{ order: CloudOrderDetail }>(
    `/me/orders/${encodeURIComponent(orderNumber)}`,
    { headers: authHeaders(accessToken) },
  );
  return data.order;
}
