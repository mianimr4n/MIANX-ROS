import { bearerHeaders, fetchApiData, fetchApiEnvelope } from "@/lib/api";

/** Shared reliability options for admin reads (D2). */
export type AdminReadOptions = {
  signal?: AbortSignal;
  correlationId?: string;
  timeoutMs?: number;
};

/** Bounded default timeout for idempotent admin reads. */
export const ADMIN_READ_TIMEOUT_MS = 15_000;
/** Bounded default timeout for admin writes (never auto-retried). */
export const ADMIN_WRITE_TIMEOUT_MS = 20_000;

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

function readInit(accessToken: string, opts?: AdminReadOptions) {
  return {
    headers: bearerHeaders(accessToken),
    signal: opts?.signal,
    correlationId: opts?.correlationId,
    timeoutMs: opts?.timeoutMs ?? ADMIN_READ_TIMEOUT_MS,
  };
}

export async function fetchAdminOperationsDashboard(
  accessToken: string,
  query?: { branchId?: string | null },
  opts?: AdminReadOptions,
): Promise<AdminOperationsDashboard> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<AdminOperationsDashboard>(
    `/admin/dashboard/operations${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
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
  opts?: AdminReadOptions,
): Promise<AdminOrderListResult> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  if (query?.status) params.set("status", query.status);
  if (query?.orderType) params.set("orderType", query.orderType);
  if (query?.orderSource) params.set("orderSource", query.orderSource);
  if (query?.orderNumber) params.set("orderNumber", query.orderNumber);
  params.set("limit", String(query?.limit ?? 20));
  params.set("offset", String(query?.offset ?? 0));
  const envelope = await fetchApiEnvelope<AdminOrderListItem[]>(
    `/admin/orders?${params.toString()}`,
    readInit(accessToken, opts),
  );
  const pagination = (envelope.meta?.pagination ?? {
    limit: query?.limit ?? 20,
    offset: query?.offset ?? 0,
    total: envelope.data.length,
    returned: envelope.data.length,
  }) as AdminOrderListResult["pagination"];
  return { orders: envelope.data, pagination };
}

export async function getAdminOrder(
  accessToken: string,
  orderId: string,
  opts?: AdminReadOptions,
): Promise<AdminOrderDetail> {
  return fetchApiData<AdminOrderDetail>(`/admin/orders/${orderId}`, readInit(accessToken, opts));
}

export type AdminOrderTransitionAction =
  | "confirm"
  | "reject"
  | "preparing"
  | "ready"
  | "dispatch"
  | "complete"
  | "cancel";

export async function transitionAdminOrder(
  accessToken: string,
  orderId: string,
  action: AdminOrderTransitionAction,
  body?: { reasonCode?: string; note?: string },
): Promise<{ status: string; idempotentReplay: boolean }> {
  // Writes are never auto-retried; a bounded timeout still applies.
  return fetchApiData(`/admin/orders/${orderId}/${action}`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(body ?? {}),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

/** Authenticated POS create — membership + operating branch enforced server-side. */
export function createAdminPosOrder(
  accessToken: string,
  payload: {
    branchCode: string;
    orderType: "delivery" | "pickup" | "dine-in";
    contactName: string;
    contactPhone: string;
    deliveryAddress?: string;
    notes?: string;
    couponCode?: string;
    quoteId?: string;
    /** D3 — attach a dine-in order to an active dining session (dine-in only). */
    diningSessionId?: string;
    items: Array<{
      /** Preferred: the exact sellable SKU the server must price. */
      menuItemId?: string;
      menuItemSlug: string;
      variantLabel?: string;
      quantity: number;
      unitPrice?: number;
      productName?: string;
      instructions?: string;
      modifiers?: Array<{ groupCode: string; optionCode: string }>;
    }>;
  },
  idempotencyKey: string,
) {
  return fetchApiData<{
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
  }>("/admin/pos/orders", {
    method: "POST",
    headers: {
      ...bearerHeaders(accessToken),
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type BranchReadinessReport = {
  branchId: string;
  branchCode: string;
  name: string;
  status: string;
  operationallyActive: boolean;
  readinessGrade?: "READY" | "READY_WITH_LIMITATIONS" | "BLOCKED" | "NOT_VERIFIED" | "ERROR";
  blockers: Array<{ code: string; message: string; nextAction?: string }>;
  nextActions?: string[];
  checks: Record<string, boolean>;
};

export function fetchBranchReadiness(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<BranchReadinessReport>(
    `/admin/branches/${branchId}/readiness`,
    readInit(accessToken, opts),
  );
}

/** D4 — same readiness payload via dashboard contract. */
export function fetchOpeningReadiness(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<BranchReadinessReport>(
    `/admin/dashboard/opening-readiness?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export type TableServiceDashboardSummary = {
  generatedAt: string;
  branchId: string;
  branchCode: string | null;
  branchStatus: string;
  definitions: Record<string, string>;
  reservations: {
    todayTotal: number;
    confirmed: number;
    pending: number;
    arrived: number;
    noShows: number;
    cancellations: number;
    seatedCovers: number;
    coversBooked: number;
  };
  floor: {
    availableTables: number;
    occupiedTables: number;
    cleaningTables: number;
    totalActiveTables: number;
    seatedCovers: number;
    billRequests: number;
    paymentPending: number;
    activeSessions: number;
    waitlistCount: number;
    seatingConflicts: number;
    upcomingArrivals: number;
  };
  averages: {
    averageWaitMinutes: number | null;
    averageTableTurnMinutes: number | null;
    note: string;
  };
  occupancyByBranch: Array<{
    branchId: string;
    branchCode: string | null;
    occupiedTables: number;
    availableTables: number;
    waitlistCount: number;
  }> | null;
};

export function fetchTableServiceDashboard(
  accessToken: string,
  query: { branchId: string; includeOccupancyComparison?: boolean },
  opts?: AdminReadOptions,
) {
  const params = new URLSearchParams({ branchId: query.branchId });
  if (query.includeOccupancyComparison) params.set("includeOccupancyComparison", "true");
  return fetchApiData<TableServiceDashboardSummary>(
    `/admin/dashboard/table-service?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export type SystemHealthSummary = {
  generatedAt: string;
  api: { status: "ok" | "degraded"; supabaseConfigured: boolean };
  database: { status: "ready" | "unavailable"; note: string };
  notifications: {
    emailMode: string;
    workerReachable: boolean;
    pendingOutboxSample: number | null;
  };
  configurationWarnings: string[];
  correlationHint: string;
};

export function fetchSystemHealth(accessToken: string, opts?: AdminReadOptions) {
  return fetchApiData<SystemHealthSummary>(`/admin/dashboard/system-health`, readInit(accessToken, opts));
}

export type AdminRestaurantTable = {
  id: string;
  branchId: string;
  tableNumber: string;
  displayName: string | null;
  capacity: number | null;
  floorOrZone: string | null;
  status: string;
  qrVersion: number;
  qrIssued: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Requires branch.manage — cashiers without it cannot list tables. */
export async function listAdminTables(
  accessToken: string,
  query?: { branchId?: string | null; status?: string; limit?: number },
  opts?: AdminReadOptions,
): Promise<AdminRestaurantTable[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  if (query?.status) params.set("status", query.status);
  params.set("limit", String(query?.limit ?? 100));
  return fetchApiData<AdminRestaurantTable[]>(
    `/admin/tables?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export type AdminStaffInvite = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleCode: string;
  branchId: string;
  status: string;
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedUserId: string | null;
  sendCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Super-admin gated in backend — returns invites or throws on 403. */
export async function listAdminStaffInvites(
  accessToken: string,
  query?: { status?: string },
  opts?: AdminReadOptions,
): Promise<AdminStaffInvite[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return fetchApiData<AdminStaffInvite[]>(
    `/admin/staff/invites${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}
