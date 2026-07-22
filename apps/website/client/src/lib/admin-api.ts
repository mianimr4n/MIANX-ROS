import { fetchApiData, fetchApiEnvelope } from "@/lib/api";

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  orderSource: string;
  branchId: string;
  branchCode: string | null;
  contactName: string;
  contactPhone: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  deliveryAddress: string | null;
  notes: string | null;
  cancelReasonCode: string | null;
  items: Array<{
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions: string | null;
    extras: Array<{ slug: string; label: string; price: number }>;
  }>;
  delivery: {
    status: string;
    deliveryAddress: string | null;
    assignedAt: string | null;
    pickedUpAt: string | null;
    deliveredAt: string | null;
  } | null;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    reasonCode: string | null;
    note: string | null;
    createdAt: string;
  }>;
};

export type AdminOperationsDashboard = {
  generatedAt: string;
  timezone: "Asia/Karachi";
  dayStart: string;
  branchId: string | null;
  kpis: {
    todayOrders: number;
    todayGrossSales: number;
    activeOrders: number;
    averageOrderValue: number | null;
    kitchenWaiting: number;
    activeDeliveries: number;
  };
  statusCounts: Record<string, number>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  recentOrders: AdminOrderListItem[];
  branchPerformance: Array<{
    branchId: string;
    branchCode: string | null;
    todayOrders: number;
    todayGrossSales: number;
    activeOrders: number;
  }> | null;
  alerts: Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    code: string;
    message: string;
    orderId?: string;
    orderNumber?: string;
  }>;
  insights: string[];
};

export type AdminOrderListResult = {
  orders: AdminOrderListItem[];
  pagination: { limit: number; offset: number; total: number; returned: number };
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function fetchAdminOperationsDashboard(
  accessToken: string,
  query?: { branchId?: string | null },
): Promise<AdminOperationsDashboard> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<AdminOperationsDashboard>(`/admin/dashboard/operations${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export async function listAdminOrders(
  accessToken: string,
  query?: {
    branchId?: string | null;
    status?: string;
    orderType?: string;
    orderSource?: string;
    orderNumber?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AdminOrderListResult> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  if (query?.status) params.set("status", query.status);
  if (query?.orderType) params.set("orderType", query.orderType);
  if (query?.orderSource) params.set("orderSource", query.orderSource);
  if (query?.orderNumber) params.set("orderNumber", query.orderNumber);
  params.set("limit", String(query?.limit ?? 20));
  params.set("offset", String(query?.offset ?? 0));
  const envelope = await fetchApiEnvelope<AdminOrderListItem[]>(`/admin/orders?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
  const pagination = (envelope.meta?.pagination ?? {
    limit: query?.limit ?? 20,
    offset: query?.offset ?? 0,
    total: envelope.data.length,
    returned: envelope.data.length,
  }) as AdminOrderListResult["pagination"];
  return { orders: envelope.data, pagination };
}

export async function getAdminOrder(accessToken: string, orderId: string): Promise<AdminOrderDetail> {
  return fetchApiData<AdminOrderDetail>(`/admin/orders/${orderId}`, {
    headers: authHeaders(accessToken),
  });
}
