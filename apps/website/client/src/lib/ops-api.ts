import { bearerHeaders, fetchApiData } from "@/lib/api";
import { ADMIN_READ_TIMEOUT_MS, ADMIN_WRITE_TIMEOUT_MS, type AdminReadOptions } from "@/lib/admin-api";

export type OpsReadOptions = AdminReadOptions;

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
  createdAt: string;
  updatedAt: string;
};

export type RiderRosterItem = {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  status: string;
};

function readInit(accessToken: string, opts?: OpsReadOptions) {
  return {
    headers: bearerHeaders(accessToken),
    signal: opts?.signal,
    correlationId: opts?.correlationId,
    timeoutMs: opts?.timeoutMs ?? ADMIN_READ_TIMEOUT_MS,
  };
}

export async function listOpsOrders(
  accessToken: string,
  query?: { status?: string; orderType?: string; branchId?: string | null; limit?: number },
  opts?: OpsReadOptions,
): Promise<OpsOrderListItem[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.orderType) params.set("orderType", query.orderType);
  if (query?.branchId) params.set("branchId", query.branchId);
  params.set("limit", String(query?.limit ?? 50));
  const qs = params.toString();
  return fetchApiData<OpsOrderListItem[]>(`/admin/orders?${qs}`, readInit(accessToken, opts));
}

export async function getOpsOrder(
  accessToken: string,
  orderId: string,
  opts?: OpsReadOptions,
): Promise<OpsOrderDetail> {
  return fetchApiData<OpsOrderDetail>(`/admin/orders/${orderId}`, readInit(accessToken, opts));
}

export async function transitionOpsOrder(
  accessToken: string,
  orderId: string,
  action: "confirm" | "reject" | "preparing" | "ready" | "dispatch" | "complete" | "cancel",
  body?: { reasonCode?: string; note?: string },
): Promise<{ status: string; idempotentReplay: boolean }> {
  return fetchApiData(`/admin/orders/${orderId}/${action}`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(body ?? {}),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export async function listKitchenTickets(
  accessToken: string,
  query?: { status?: string; branchId?: string | null; limit?: number; offset?: number },
  opts?: OpsReadOptions,
): Promise<KitchenTicket[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.branchId) params.set("branchId", query.branchId);
  params.set("limit", String(query?.limit ?? 50));
  if (query?.offset) params.set("offset", String(query.offset));
  return fetchApiData<KitchenTicket[]>(
    `/kitchen/tickets?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export async function patchKitchenTicketStatus(
  accessToken: string,
  ticketId: string,
  status: string,
): Promise<unknown> {
  return fetchApiData(`/kitchen/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({ status }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export async function listDeliveryAssignments(
  accessToken: string,
  query?: { status?: string; branchId?: string | null; limit?: number; offset?: number },
  opts?: OpsReadOptions,
): Promise<DeliveryAssignment[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.branchId) params.set("branchId", query.branchId);
  params.set("limit", String(query?.limit ?? 50));
  if (query?.offset) params.set("offset", String(query.offset));
  return fetchApiData<DeliveryAssignment[]>(
    `/riders/assignments?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export async function listRiderRoster(
  accessToken: string,
  query?: { branchId?: string | null },
  opts?: OpsReadOptions,
): Promise<RiderRosterItem[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<RiderRosterItem[]>(
    `/riders/roster${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export async function assignDeliveryRider(
  accessToken: string,
  deliveryId: string,
  riderId: string,
): Promise<unknown> {
  return fetchApiData(`/riders/deliveries/${deliveryId}/assign`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({ riderId }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export async function updateDeliveryStatus(
  accessToken: string,
  deliveryId: string,
  status: "picked-up" | "delivered",
): Promise<unknown> {
  return fetchApiData(`/riders/deliveries/${deliveryId}/status`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify({ status }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}
