import { fetchApiData } from "@/lib/api";

export type OpsOrderListItem = {
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

export type OpsOrderDetail = OpsOrderListItem & {
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

export type KitchenTicket = {
  id: string;
  orderId: string;
  branchId: string;
  status: string;
  priority: number;
  sequenceNumber: number;
  acceptedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    itemNameSnapshot: string;
    quantity: number;
    modifiersSnapshot: unknown;
    isCompleted: boolean;
  }>;
};

export type DeliveryAssignment = {
  id: string;
  orderId: string;
  orderNumber: string;
  branchId: string;
  status: string;
  deliveryAddress: string;
  riderId: string | null;
  riderName: string | null;
  orderStatus: string;
  contactName: string;
  contactPhone: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
};

export type RiderRosterItem = {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  status: string;
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function listOpsOrders(
  accessToken: string,
  query?: { status?: string; orderType?: string; limit?: number },
): Promise<OpsOrderListItem[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.orderType) params.set("orderType", query.orderType);
  params.set("limit", String(query?.limit ?? 50));
  const qs = params.toString();
  return fetchApiData<OpsOrderListItem[]>(`/admin/orders?${qs}`, {
    headers: authHeaders(accessToken),
  });
}

export async function getOpsOrder(accessToken: string, orderId: string): Promise<OpsOrderDetail> {
  return fetchApiData<OpsOrderDetail>(`/admin/orders/${orderId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function transitionOpsOrder(
  accessToken: string,
  orderId: string,
  action: "confirm" | "reject" | "preparing" | "ready" | "dispatch" | "complete" | "cancel",
  body?: { reasonCode?: string; note?: string },
): Promise<{ status: string; idempotentReplay: boolean }> {
  return fetchApiData(`/admin/orders/${orderId}/${action}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body ?? {}),
  });
}

export async function listKitchenTickets(
  accessToken: string,
  query?: { status?: string; limit?: number },
): Promise<KitchenTicket[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  params.set("limit", String(query?.limit ?? 50));
  return fetchApiData<KitchenTicket[]>(`/kitchen/tickets?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
}

export async function patchKitchenTicketStatus(
  accessToken: string,
  ticketId: string,
  status: string,
): Promise<unknown> {
  return fetchApiData(`/kitchen/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ status }),
  });
}

export async function listDeliveryAssignments(
  accessToken: string,
  query?: { status?: string; limit?: number },
): Promise<DeliveryAssignment[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  params.set("limit", String(query?.limit ?? 50));
  return fetchApiData<DeliveryAssignment[]>(`/riders/assignments?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
}

export async function listRiderRoster(accessToken: string): Promise<RiderRosterItem[]> {
  return fetchApiData<RiderRosterItem[]>(`/riders/roster`, {
    headers: authHeaders(accessToken),
  });
}

export async function assignDeliveryRider(
  accessToken: string,
  deliveryId: string,
  riderId: string,
): Promise<unknown> {
  return fetchApiData(`/riders/deliveries/${deliveryId}/assign`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ riderId }),
  });
}

export async function updateDeliveryStatus(
  accessToken: string,
  deliveryId: string,
  status: "picked-up" | "delivered",
): Promise<unknown> {
  return fetchApiData(`/riders/deliveries/${deliveryId}/status`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ status }),
  });
}
