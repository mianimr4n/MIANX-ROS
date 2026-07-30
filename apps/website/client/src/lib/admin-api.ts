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
    /** Launch cash path — only `cash` is accepted at place-order today. */
    paymentMethod?: "cash";
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

export const ASSIGNABLE_STAFF_ROLE_CODES = [
  "branch-manager",
  "cashier",
  "kitchen",
  "rider",
  "customer-support",
  "host",
  "waiter",
] as const;

export type StaffAssignment = {
  id: string;
  branchId: string | null;
  userId: string;
  roleId: string;
  roleCode: string;
  assignmentStatus: string;
  invitationId: string | null;
  assignedBy: string | null;
  assignedAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  userFullName: string | null;
  branchCode: string | null;
  branchName: string | null;
};

export type StaffAssignmentEvent = {
  id: string;
  userRoleId: string;
  branchId: string | null;
  userId: string;
  roleId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  notes: string | null;
  createdAt: string;
};

export type BookingPolicy = {
  id: string;
  branchId: string;
  version: number;
  status: string;
  bookingEnabled: boolean;
  onlineBookingEnabled: boolean;
  minimumPartySize: number;
  maximumPartySize: number;
  bookingIntervalMinutes: number;
  minimumAdvanceMinutes: number;
  maximumAdvanceDays: number;
  cancellationWindowMinutes: number;
  gracePeriodMinutes: number;
  tableHoldMinutes: number;
  waitlistEnabled: boolean;
  sameDayBookingEnabled: boolean;
  specialNotes: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listStaffAssignments(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<StaffAssignment[]>(
    `/admin/staff/assignments?${params}`,
    readInit(accessToken, opts),
  );
}

export function listAvailableStaffUsers(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<Array<{ userId: string; email: string | null; fullName: string | null }>>(
    `/admin/staff/available-users?${params}`,
    readInit(accessToken, opts),
  );
}

export function createStaffAssignment(
  accessToken: string,
  input: { branchId: string; userId: string; roleCode: string; notes?: string | null },
) {
  return fetchApiData<StaffAssignment>(`/admin/staff/assignments`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function deactivateStaffAssignment(accessToken: string, id: string, notes?: string | null) {
  return fetchApiData<StaffAssignment>(`/admin/staff/assignments/${id}/deactivate`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ notes: notes ?? null }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function reactivateStaffAssignment(accessToken: string, id: string, notes?: string | null) {
  return fetchApiData<StaffAssignment>(`/admin/staff/assignments/${id}/reactivate`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ notes: notes ?? null }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listStaffAssignmentHistory(accessToken: string, id: string, opts?: AdminReadOptions) {
  return fetchApiData<StaffAssignmentEvent[]>(
    `/admin/staff/assignments/${id}/history`,
    readInit(accessToken, opts),
  );
}

export function fetchCurrentBookingPolicy(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<BookingPolicy | null>(
    `/admin/booking-policies/current?${params}`,
    readInit(accessToken, opts),
  );
}

export function listBookingPolicyVersions(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<BookingPolicy[]>(`/admin/booking-policies?${params}`, readInit(accessToken, opts));
}

export function createBookingPolicyDraft(
  accessToken: string,
  input: Partial<BookingPolicy> & { branchId: string },
) {
  return fetchApiData<BookingPolicy>(`/admin/booking-policies`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function submitBookingPolicy(accessToken: string, id: string) {
  return fetchApiData<BookingPolicy>(`/admin/booking-policies/${id}/submit`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function approveBookingPolicy(accessToken: string, id: string) {
  return fetchApiData<BookingPolicy>(`/admin/booking-policies/${id}/approve`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function activateBookingPolicy(accessToken: string, id: string) {
  return fetchApiData<BookingPolicy>(`/admin/booking-policies/${id}/activate`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function retireBookingPolicy(accessToken: string, id: string) {
  return fetchApiData<BookingPolicy>(`/admin/booking-policies/${id}/retire`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

// --- Opening Operations M2 (payments, notifications, devices) ---

export const OPENING_PAYMENT_METHOD_CODES = ["CASH", "CARD", "BANK_TRANSFER", "ONLINE_PAYMENT"] as const;
export type OpeningPaymentMethodCode = (typeof OPENING_PAYMENT_METHOD_CODES)[number];

export const OPENING_NOTIFICATION_PURPOSES = [
  "CUSTOMER_ORDER",
  "KITCHEN_ALERT",
  "RIDER_ALERT",
  "ESCALATION",
] as const;
export type OpeningNotificationPurpose = (typeof OPENING_NOTIFICATION_PURPOSES)[number];

export const OPENING_NOTIFICATION_CHANNELS = [
  "IN_APP",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PHONE_MANUAL",
] as const;
export type OpeningNotificationChannel = (typeof OPENING_NOTIFICATION_CHANNELS)[number];

export const OPENING_DEVICE_TYPES = [
  "POS_DEVICE",
  "KDS_DEVICE",
  "RECEIPT_PRINTER",
  "CARD_TERMINAL",
  "RIDER_DEVICE",
  "PRIMARY_INTERNET",
  "BACKUP_INTERNET",
  "UPS_POWER_BACKUP",
] as const;
export type OpeningDeviceType = (typeof OPENING_DEVICE_TYPES)[number];

export const OPENING_EVIDENCE_TYPES = [
  "ONSITE_CHECK",
  "SUPPLIER_CONFIRMATION",
  "MANUAL_TEST",
  "DOCUMENTED_CONTINGENCY",
  "LOCAL_TEST_ONLY",
] as const;
export type OpeningEvidenceType = (typeof OPENING_EVIDENCE_TYPES)[number];

export type OpeningPaymentMethod = {
  id: string;
  branchId: string;
  methodCode: OpeningPaymentMethodCode;
  displayName: string;
  enabled: boolean;
  configurationStatus: string;
  verificationStatus: string;
  verifiedAt: string | null;
  notes: string | null;
};

export type OpeningPaymentProvider = {
  id: string;
  branchId: string;
  providerName: string;
  providerEnvironment: string;
  providerStatus: string;
  terminalRequired: boolean;
  terminalVerified: boolean;
  verificationSummary: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
};

export type OpeningCardTerminal = {
  id: string;
  branchId: string;
  terminalLabel: string;
  terminalProvider: string | null;
  physicalLocation: string | null;
  verificationResult: string;
  evidenceType: OpeningEvidenceType | null;
  verifiedAt: string | null;
  failureReason: string | null;
};

export type OpeningCashProcedure = {
  id: string;
  branchId: string;
  procedureDocumented: boolean;
  procedureReviewed: boolean;
  cashDrawerProcessApproved: boolean;
  shiftReconciliationApproved: boolean;
  discrepancyEscalationDefined: boolean;
  documentationStatus: string;
  approvedAt: string | null;
  notes: string | null;
};

export type OpeningNotificationChannelRow = {
  id: string;
  branchId: string;
  purposeCode: OpeningNotificationPurpose;
  channelCode: OpeningNotificationChannel;
  enabled: boolean;
  providerName: string | null;
  providerStatus: string;
  destinationReference: string | null;
  testStatus: string;
  localTestOnly: boolean;
  testedAt: string | null;
  failureReason: string | null;
};

export type OpeningDeviceVerification = {
  id: string;
  branchId: string;
  deviceType: OpeningDeviceType;
  deviceLabel: string;
  location: string | null;
  verificationStatus: string;
  evidenceType: OpeningEvidenceType | null;
  evidenceSummary: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
};

function openingQuery(branchId: string) {
  return new URLSearchParams({ branchId });
}

export function listOpeningPaymentMethods(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningPaymentMethod[]>(
    `/admin/opening/payment-methods?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningPaymentMethod(
  accessToken: string,
  input: {
    branchId: string;
    methodCode: OpeningPaymentMethodCode;
    displayName: string;
    enabled: boolean;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningPaymentMethod>(`/admin/opening/payment-methods`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function setOpeningPaymentMethodEnabled(accessToken: string, id: string, enabled: boolean) {
  return fetchApiData<OpeningPaymentMethod>(`/admin/opening/payment-methods/${id}/enabled`, {
    method: "PATCH",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningPaymentProviders(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningPaymentProvider[]>(
    `/admin/opening/payment-providers?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningPaymentProvider(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    providerName: string;
    providerEnvironment?: "TEST" | "SANDBOX" | "PRODUCTION";
    terminalRequired?: boolean;
    verificationMethod?: string | null;
  },
) {
  return fetchApiData<OpeningPaymentProvider>(`/admin/opening/payment-providers`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function verifyOpeningPaymentProvider(
  accessToken: string,
  id: string,
  input: { summary: string; expiresAt?: string | null; terminalVerified?: boolean },
) {
  return fetchApiData<OpeningPaymentProvider>(`/admin/opening/payment-providers/${id}/verify`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningPaymentProvider(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningPaymentProvider>(`/admin/opening/payment-providers/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningCardTerminals(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningCardTerminal[]>(
    `/admin/opening/card-terminals?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function recordOpeningCardTerminal(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    terminalLabel: string;
    terminalProvider?: string | null;
    physicalLocation?: string | null;
    evidenceType: OpeningEvidenceType;
    verificationNote?: string | null;
  },
) {
  return fetchApiData<OpeningCardTerminal>(`/admin/opening/card-terminals`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningCardTerminal(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningCardTerminal>(`/admin/opening/card-terminals/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function fetchOpeningCashProcedure(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningCashProcedure | null>(
    `/admin/opening/cash-procedure?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningCashProcedure(
  accessToken: string,
  input: {
    branchId: string;
    procedureDocumented?: boolean;
    procedureReviewed?: boolean;
    cashDrawerProcessApproved?: boolean;
    shiftReconciliationApproved?: boolean;
    discrepancyEscalationDefined?: boolean;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningCashProcedure>(`/admin/opening/cash-procedure`, {
    method: "PUT",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function approveOpeningCashProcedure(accessToken: string, branchId: string) {
  return fetchApiData<OpeningCashProcedure>(`/admin/opening/cash-procedure/${branchId}/approve`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningNotificationChannels(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningNotificationChannelRow[]>(
    `/admin/opening/notification-channels?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningNotificationChannel(
  accessToken: string,
  input: {
    branchId: string;
    purposeCode: OpeningNotificationPurpose;
    channelCode: OpeningNotificationChannel;
    enabled: boolean;
    providerName?: string | null;
    destinationReference?: string | null;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningNotificationChannelRow>(`/admin/opening/notification-channels`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function localTestOpeningNotificationChannel(accessToken: string, id: string, passed: boolean) {
  return fetchApiData<OpeningNotificationChannelRow>(`/admin/opening/notification-channels/${id}/local-test`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ passed }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function verifyOpeningNotificationChannel(accessToken: string, id: string) {
  return fetchApiData<OpeningNotificationChannelRow>(`/admin/opening/notification-channels/${id}/verify`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningNotificationChannel(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningNotificationChannelRow>(`/admin/opening/notification-channels/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningDevices(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningDeviceVerification[]>(
    `/admin/opening/devices?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function listOpeningMissingDeviceTypes(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningDeviceType[]>(
    `/admin/opening/devices/missing?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningDevice(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    deviceType: OpeningDeviceType;
    deviceLabel: string;
    location?: string | null;
    serialOrAssetReference?: string | null;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningDeviceVerification>(`/admin/opening/devices`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function verifyOpeningDevice(
  accessToken: string,
  id: string,
  input: {
    evidenceType: OpeningEvidenceType;
    evidenceSummary: string;
    expiresAt?: string | null;
    recheckDueAt?: string | null;
  },
) {
  return fetchApiData<OpeningDeviceVerification>(`/admin/opening/devices/${id}/verify`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningDevice(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningDeviceVerification>(`/admin/opening/devices/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

/** Soft-remove device from active inventory (NOT_APPLICABLE) — not a FAILED block. */
export function removeOpeningDevice(accessToken: string, id: string) {
  return fetchApiData<OpeningDeviceVerification>(`/admin/opening/devices/${id}/remove`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

// --- Opening Operations M3 (SOPs, training, rehearsals, governance) ---

export const OPENING_SOP_CODES = [
  "ORDER_CONFIRMATION",
  "KITCHEN_PROGRESSION",
  "DELIVERY_DISPATCH",
  "CANCELLATION_REFUND",
  "OPENING_CHECKLIST",
  "CLOSING_CHECKLIST",
  "CASH_RECONCILIATION",
  "RESERVATION_AND_WAITLIST",
  "INCIDENT_ESCALATION",
] as const;
export type OpeningSopCode = (typeof OPENING_SOP_CODES)[number];

export const OPENING_TRAINING_CODES = [
  "BRANCH_MANAGER",
  "CASHIER_POS",
  "KITCHEN",
  "RIDER_DELIVERY",
  "HOST_WAITER",
  "CUSTOMER_SUPPORT",
  "OPENING_AND_CLOSING",
  "SAFETY_AND_INCIDENT",
  "CASH_RECONCILIATION",
] as const;
export type OpeningTrainingCode = (typeof OPENING_TRAINING_CODES)[number];

export const OPENING_ROLE_REHEARSAL_CODES = [
  "BRANCH_MANAGER_OPENING",
  "CASHIER_POS",
  "KITCHEN_ORDER_FLOW",
  "RIDER_DISPATCH",
  "HOST_WAITER_FLOOR",
  "CUSTOMER_SUPPORT_ESCALATION",
] as const;
export type OpeningRoleRehearsalCode = (typeof OPENING_ROLE_REHEARSAL_CODES)[number];

export const OPENING_FOUNDER_DECISIONS = [
  "NOT_READY",
  "REVIEW_REQUIRED",
  "GO_CONDITIONAL",
  "GO_APPROVED",
  "NO_GO",
  "WITHDRAWN",
] as const;
export type OpeningFounderDecision = (typeof OPENING_FOUNDER_DECISIONS)[number];

export type OpeningSopReview = {
  id: string;
  branchId: string;
  sopCode: OpeningSopCode;
  documentReference: string | null;
  documentVersion: string | null;
  reviewStatus: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  operationalVerificationStatus: string;
  operationallyVerifiedAt: string | null;
  reviewDueAt: string | null;
  notes: string | null;
};

export type OpeningTrainingSession = {
  id: string;
  branchId: string;
  trainingCode: OpeningTrainingCode;
  title: string;
  scheduledAt: string | null;
  completedAt: string | null;
  trainingStatus: string;
  result: string;
  localTestOnly: boolean;
  followUpRequired: boolean;
  notes: string | null;
};

export type OpeningRoleRehearsal = {
  id: string;
  branchId: string;
  rehearsalCode: OpeningRoleRehearsalCode;
  scenario: string;
  scheduledAt: string | null;
  completedAt: string | null;
  rehearsalStatus: string;
  result: string;
  localTestOnly: boolean;
  retestRequired: boolean;
  issuesFound: string | null;
  notes: string | null;
};

export type OpeningE2eRehearsal = {
  id: string;
  branchId: string;
  scheduledAt: string | null;
  completedAt: string | null;
  status: string;
  result: string;
  localTestOnly: boolean;
  criticalFailures: number;
  stagesCompleted: unknown[];
  stagesFailed: unknown[];
  retestRequired: boolean;
  notes: string | null;
};

export type OpeningFounderDecisionRecord = {
  id: string;
  branchId: string;
  decision: OpeningFounderDecision;
  decisionNotes: string | null;
  conditions: string | null;
  decidedAt: string;
  completedItems: number;
  requiredItems: number;
  readinessPercentage: number | null;
};

export type OpeningOwnerHandoverRecord = {
  id: string;
  branchId: string;
  handoverStatus: string;
  intendedOwnerName: string | null;
  intendedOwnerContactReference: string | null;
  handoverScope: string | null;
  accessReviewStatus: string;
  operationalDocumentsReviewed: boolean;
  financialProcedureReviewed: boolean;
  staffStructureReviewed: boolean;
  deviceInventoryReviewed: boolean;
  acceptedAt: string | null;
  notes: string | null;
};

export function listOpeningSops(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningSopReview[]>(`/admin/opening/sops?${openingQuery(branchId)}`, readInit(accessToken, opts));
}

export function upsertOpeningSop(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    sopCode: OpeningSopCode;
    documentReference?: string | null;
    documentVersion?: string | null;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningSopReview>(`/admin/opening/sops`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function approveOpeningSop(accessToken: string, id: string, notes?: string) {
  return fetchApiData<OpeningSopReview>(`/admin/opening/sops/${id}/approve`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(notes ? { notes } : {}),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function verifyOpeningSopOperational(
  accessToken: string,
  id: string,
  input: { summary: string; evidenceType?: OpeningEvidenceType },
) {
  return fetchApiData<OpeningSopReview>(`/admin/opening/sops/${id}/verify-operational`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningSop(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningSopReview>(`/admin/opening/sops/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningTraining(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningTrainingSession[]>(
    `/admin/opening/training?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningTrainingSession(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    trainingCode: OpeningTrainingCode;
    title: string;
    scheduledAt?: string | null;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningTrainingSession>(`/admin/opening/training`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function completeOpeningTrainingSession(
  accessToken: string,
  id: string,
  input: { result?: "PASS" | "CONDITIONAL_PASS" | "FAIL"; localTestOnly?: boolean; notes?: string },
) {
  return fetchApiData<OpeningTrainingSession>(`/admin/opening/training/${id}/complete`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningTrainingSession(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningTrainingSession>(`/admin/opening/training/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningRoleRehearsals(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningRoleRehearsal[]>(
    `/admin/opening/role-rehearsals?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningRoleRehearsal(
  accessToken: string,
  input: {
    id?: string;
    branchId: string;
    rehearsalCode: OpeningRoleRehearsalCode;
    scenario: string;
    scheduledAt?: string | null;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningRoleRehearsal>(`/admin/opening/role-rehearsals`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function completeOpeningRoleRehearsal(
  accessToken: string,
  id: string,
  input: { result?: "PASS" | "CONDITIONAL_PASS" | "FAIL"; localTestOnly?: boolean; notes?: string },
) {
  return fetchApiData<OpeningRoleRehearsal>(`/admin/opening/role-rehearsals/${id}/complete`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningRoleRehearsal(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningRoleRehearsal>(`/admin/opening/role-rehearsals/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningE2eRehearsals(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningE2eRehearsal[]>(
    `/admin/opening/e2e-rehearsals?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function scheduleOpeningE2eRehearsal(
  accessToken: string,
  input: { branchId: string; scheduledAt?: string | null; notes?: string | null },
) {
  return fetchApiData<OpeningE2eRehearsal>(`/admin/opening/e2e-rehearsals`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function completeOpeningE2eRehearsal(
  accessToken: string,
  id: string,
  input: {
    result?: "PASS" | "CONDITIONAL_PASS" | "FAIL";
    localTestOnly?: boolean;
    stagesCompleted?: string[];
    notes?: string;
  },
) {
  return fetchApiData<OpeningE2eRehearsal>(`/admin/opening/e2e-rehearsals/${id}/complete`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function failOpeningE2eRehearsal(accessToken: string, id: string, reason: string) {
  return fetchApiData<OpeningE2eRehearsal>(`/admin/opening/e2e-rehearsals/${id}/fail`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningFounderDecisions(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningFounderDecisionRecord[]>(
    `/admin/opening/founder-decisions?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function recordOpeningFounderDecision(
  accessToken: string,
  input: {
    branchId: string;
    decision: OpeningFounderDecision;
    decisionNotes?: string | null;
    conditions?: string | null;
  },
) {
  return fetchApiData<OpeningFounderDecisionRecord>(`/admin/opening/founder-decisions`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function fetchOpeningOwnerHandover(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningOwnerHandoverRecord | null>(
    `/admin/opening/owner-handover?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function upsertOpeningOwnerHandover(
  accessToken: string,
  input: {
    branchId: string;
    intendedOwnerName?: string | null;
    intendedOwnerContactReference?: string | null;
    handoverScope?: string | null;
    operationalDocumentsReviewed?: boolean;
    financialProcedureReviewed?: boolean;
    staffStructureReviewed?: boolean;
    deviceInventoryReviewed?: boolean;
    notes?: string | null;
  },
) {
  return fetchApiData<OpeningOwnerHandoverRecord>(`/admin/opening/owner-handover`, {
    method: "PUT",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function markOpeningOwnerHandoverReady(accessToken: string, branchId: string) {
  return fetchApiData<OpeningOwnerHandoverRecord>(`/admin/opening/owner-handover/${branchId}/ready`, {
    method: "POST",
    headers: bearerHeaders(accessToken),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function acceptOpeningOwnerHandover(
  accessToken: string,
  branchId: string,
  acceptedByReference: string,
) {
  return fetchApiData<OpeningOwnerHandoverRecord>(`/admin/opening/owner-handover/${branchId}/accept`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ acceptedByReference }),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function reviewOpeningSop(accessToken: string, id: string, notes?: string) {
  return fetchApiData<OpeningSopReview>(`/admin/opening/sops/${id}/review`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(notes ? { notes } : {}),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type OpeningStaffSeedRun = {
  id: string;
  branchId: string;
  runStatus: string;
  environmentMode: string;
  productionApplyAuthorized: boolean;
  seedScriptHash: string;
  handoverFileHash: string | null;
  handoverCipherPath: string | null;
  keyFilePathHint: string | null;
  localTestOnly: boolean;
  createdAt: string;
};

export type OpeningLiveConfigSnapshot = {
  id: string;
  branchId: string;
  snapshotStatus: string;
  timezone: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  serviceModes: unknown;
  paymentMethods: unknown;
  notificationChannels: unknown;
  deviceRecords: unknown;
  localTestOnly: boolean;
  snapshotHash: string;
  capturedAt: string;
};

export type OpeningDryRunSession = {
  id: string;
  branchId: string;
  sessionStatus: string;
  result: string;
  simulatedOrderId: string | null;
  simulatedTicketId: string | null;
  simulatedDeliveryId: string | null;
  readinessPercentage: number | null;
  localTestOnly: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type OpeningDryRunDecision = "GO" | "NO_GO" | "REVIEW_REQUIRED";

export type OpeningDryRunEvidence = {
  id: string;
  dryRunId: string;
  branchId: string;
  evidenceHash: string;
  decision: OpeningDryRunDecision | "NOT_DECIDED";
  decidedAt: string;
  readinessPercentage: number | null;
  logHash: string;
  localTestOnly: boolean;
  northernBypassUnchanged: boolean;
  branchStatusUnchanged: boolean;
  createdAt: string;
};

export function listOpeningStaffSeedRuns(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningStaffSeedRun[]>(
    `/admin/opening/staff-seed/runs?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function simulateOpeningStaffSeedLocal(
  accessToken: string,
  input: { branchId: string; handoverDir: string; keyDir: string; notes?: string | null },
) {
  return fetchApiData<{
    run: OpeningStaffSeedRun;
    accountCount: number;
    handoverCipherPath: string;
    keyFilePath: string;
    passwordsReturned: false;
  }>(`/admin/opening/staff-seed/simulate-local`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningLiveConfigSnapshots(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningLiveConfigSnapshot[]>(
    `/admin/opening/live-config?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function captureOpeningLiveConfigSnapshot(
  accessToken: string,
  input: { branchId: string; notes?: string | null },
) {
  return fetchApiData<OpeningLiveConfigSnapshot>(`/admin/opening/live-config/snapshot`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listOpeningDryRuns(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<OpeningDryRunSession[]>(
    `/admin/opening/dry-runs?${openingQuery(branchId)}`,
    readInit(accessToken, opts),
  );
}

export function startOpeningDryRun(
  accessToken: string,
  input: { branchId: string; seedRunId?: string | null; liveConfigSnapshotId?: string | null },
) {
  return fetchApiData<OpeningDryRunSession>(`/admin/opening/dry-runs`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function recordOpeningDryRunStep(
  accessToken: string,
  id: string,
  input: {
    stepCode: string;
    stepStatus: "PASSED" | "FAILED" | "SKIPPED";
    evidenceSummary?: string | null;
    screenshotHash?: string | null;
  },
) {
  return fetchApiData<OpeningDryRunSession>(`/admin/opening/dry-runs/${id}/steps`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function completeOpeningDryRun(
  accessToken: string,
  id: string,
  input?: { readinessPercentage?: number | null },
) {
  return fetchApiData<OpeningDryRunSession>(`/admin/opening/dry-runs/${id}/complete`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function recordOpeningDryRunFounderDecision(
  accessToken: string,
  id: string,
  input: { decision: OpeningDryRunDecision; notes?: string | null },
) {
  return fetchApiData<OpeningDryRunEvidence>(`/admin/opening/dry-runs/${id}/founder-decision`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

// --- Phase 2: Organization + Branch profile settings ---

export type OrganizationSettings = {
  companyName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type OrganizationSettingsUpdate = {
  companyName?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export function fetchOrganizationSettings(accessToken: string, opts?: AdminReadOptions) {
  return fetchApiData<OrganizationSettings>(
    `/admin/settings/organization`,
    readInit(accessToken, opts),
  );
}

export function updateOrganizationSettings(accessToken: string, input: OrganizationSettingsUpdate) {
  return fetchApiData<OrganizationSettings>(`/admin/settings/organization`, {
    method: "PUT",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type BranchProfile = {
  id: string;
  branchCode: string;
  name: string;
  city: string;
  area: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
  timezone: string;
  opensAt: string | null;
  closesAt: string | null;
  hoursDaily: string | null;
  deliveryRadiusKm: number | null;
  updatedAt: string;
};

export type BranchProfileUpdate = {
  phone?: string | null;
  email?: string | null;
  address?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  deliveryRadiusKm?: number | null;
};

export function fetchBranchProfile(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  return fetchApiData<BranchProfile>(`/admin/branches/${branchId}`, readInit(accessToken, opts));
}

export function updateBranchProfile(accessToken: string, branchId: string, input: BranchProfileUpdate) {
  return fetchApiData<BranchProfile>(`/admin/branches/${branchId}`, {
    method: "PUT",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type DeliverySettings = {
  branchId: string;
  branchCode: string;
  branchName: string;
  deliveryRadiusKm: number | null;
  minimumOrderAmount: number | null;
  deliveryFee: number | null;
  updatedAt: string;
};

export type DeliverySettingsUpdate = {
  branchId: string;
  deliveryRadiusKm?: number | null;
  minimumOrderAmount?: number | null;
  deliveryFee?: number | null;
};

export function fetchDeliverySettings(accessToken: string, branchId: string, opts?: AdminReadOptions) {
  const params = new URLSearchParams({ branchId });
  return fetchApiData<DeliverySettings>(
    `/admin/settings/delivery?${params}`,
    readInit(accessToken, opts),
  );
}

export function updateDeliverySettings(accessToken: string, input: DeliverySettingsUpdate) {
  return fetchApiData<DeliverySettings>(`/admin/settings/delivery`, {
    method: "PUT",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type HrEmployeeStatus = "active" | "inactive" | "on_leave" | "terminated";

export type HrEmployee = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: HrEmployeeStatus;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateHrEmployeeInput = {
  branchId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  status?: HrEmployeeStatus;
  hiredAt?: string | null;
};

export function listHrEmployees(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<HrEmployee[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<HrEmployee[]>(
    `/admin/hr/employees${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createHrEmployee(accessToken: string, input: CreateHrEmployeeInput) {
  return fetchApiData<HrEmployee>(`/admin/hr/employees`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type InventoryItemStatus = "active" | "inactive" | "discontinued";

export type InventoryItem = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  costPrice: number | null;
  status: InventoryItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  branchId: string;
  movementType: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  itemName: string | null;
  itemSku: string | null;
};

export type CreateInventoryItemInput = {
  branchId: string;
  sku: string;
  name: string;
  category?: string | null;
  unit?: string;
  currentStock?: number;
  minimumStock?: number;
  reorderLevel?: number;
  costPrice?: number | null;
  status?: InventoryItemStatus;
};

export type CreateStockAdjustmentInput = {
  inventoryItemId: string;
  quantityDelta: number;
  reason?: string | null;
  movementType?: "adjustment" | "receipt" | "waste";
};

export function listInventoryItems(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<InventoryItem[]>(
    `/admin/inventory/items${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createInventoryItem(accessToken: string, input: CreateInventoryItemInput) {
  return fetchApiData<InventoryItem>(`/admin/inventory/items`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type UpdateInventoryItemInput = {
  name?: string;
  category?: string | null;
  unit?: string;
  minimumStock?: number;
  reorderLevel?: number;
  costPrice?: number | null;
  status?: InventoryItemStatus;
};

export function updateInventoryItem(accessToken: string, id: string, input: UpdateInventoryItemInput) {
  return fetchApiData<InventoryItem>(`/admin/inventory/items/${id}`, {
    method: "PATCH",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function createStockAdjustment(accessToken: string, input: CreateStockAdjustmentInput) {
  return fetchApiData<{ item: InventoryItem; movement: StockMovement }>(`/admin/inventory/adjustments`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listStockMovements(
  accessToken: string,
  query?: { branchId?: string; inventoryItemId?: string; limit?: number },
  opts?: AdminReadOptions,
): Promise<StockMovement[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  if (query?.inventoryItemId) params.set("inventoryItemId", query.inventoryItemId);
  if (query?.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return fetchApiData<StockMovement[]>(
    `/admin/inventory/movements${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export type SupplierStatus = "active" | "inactive";

export type Supplier = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";

export type PurchaseOrder = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  supplierId: string;
  supplierName: string | null;
  poNumber: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  expectedDeliveryDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierInput = {
  branchId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status?: SupplierStatus;
};

export type CreatePurchaseOrderInput = {
  branchId: string;
  supplierId: string;
  poNumber?: string | null;
  status?: PurchaseOrderStatus;
  totalAmount?: number;
  expectedDeliveryDate?: string | null;
};

export function listSuppliers(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<Supplier[]>(
    `/admin/purchasing/suppliers${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createSupplier(accessToken: string, input: CreateSupplierInput) {
  return fetchApiData<Supplier>(`/admin/purchasing/suppliers`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listPurchaseOrders(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<PurchaseOrder[]>(
    `/admin/purchasing/orders${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createPurchaseOrder(accessToken: string, input: CreatePurchaseOrderInput) {
  return fetchApiData<PurchaseOrder>(`/admin/purchasing/orders`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export type RequisitionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "converted"
  | "cancelled";

export type PurchaseRequisition = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  title: string;
  status: RequisitionStatus;
  notes: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoodsReceivingStatus = "draft" | "posted" | "cancelled";

export type GoodsReceiving = {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  purchaseOrderId: string | null;
  poNumber: string | null;
  grnNumber: string;
  status: GoodsReceivingStatus;
  receivedAt: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRequisitionInput = {
  branchId: string;
  title: string;
  notes?: string | null;
  status?: RequisitionStatus;
};

export type CreateGoodsReceivingInput = {
  branchId: string;
  purchaseOrderId?: string | null;
  grnNumber?: string | null;
  status?: GoodsReceivingStatus;
  notes?: string | null;
  receivedAt?: string | null;
};

export function listPurchaseRequisitions(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<PurchaseRequisition[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<PurchaseRequisition[]>(
    `/admin/purchasing/requisitions${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createPurchaseRequisition(accessToken: string, input: CreateRequisitionInput) {
  return fetchApiData<PurchaseRequisition>(`/admin/purchasing/requisitions`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export function listGoodsReceiving(
  accessToken: string,
  query?: { branchId?: string },
  opts?: AdminReadOptions,
): Promise<GoodsReceiving[]> {
  const params = new URLSearchParams();
  if (query?.branchId) params.set("branchId", query.branchId);
  const qs = params.toString();
  return fetchApiData<GoodsReceiving[]>(
    `/admin/purchasing/receiving${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createGoodsReceiving(accessToken: string, input: CreateGoodsReceivingInput) {
  return fetchApiData<GoodsReceiving>(`/admin/purchasing/receiving`, {
    method: "POST",
    headers: { ...bearerHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}
