/**
 * D3 — floor plan, reservations, waitlist, and dining-session API client.
 * All endpoints are branch-scoped and authorized server-side; UI gating is
 * convenience only.
 */
import { bearerHeaders, fetchApiData } from "@/lib/api";
import { ADMIN_READ_TIMEOUT_MS, ADMIN_WRITE_TIMEOUT_MS, type AdminReadOptions } from "@/lib/admin-api";
import { clampListLimit, TABLE_SERVICE_LIST_LIMIT_MAX } from "@/lib/clamp-list-limit";

export { clampListLimit, TABLE_SERVICE_LIST_LIMIT_MAX, TABLE_SERVICE_LIST_LIMIT_MIN } from "@/lib/clamp-list-limit";

export type TableOperationalStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "ordering"
  | "served"
  | "bill_requested"
  | "payment_pending"
  | "cleaning"
  | "blocked"
  | "out_of_service";

export type TableShape = "square" | "rectangle" | "round" | "custom";

export type FloorRecord = {
  id: string;
  branchId: string;
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ServiceAreaRecord = {
  id: string;
  branchId: string;
  floorId: string;
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  colorToken: string | null;
  isActive: boolean;
};

export type FloorTableRecord = {
  id: string;
  branchId: string;
  floorId: string | null;
  serviceAreaId: string | null;
  tableNumber: string;
  displayName: string | null;
  capacityMin: number;
  capacityMax: number | null;
  shape: TableShape;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  isAccessible: boolean;
  highChairSupported: boolean;
  isActive: boolean;
  operationalStatus: TableOperationalStatus;
  updatedAt: string;
};

export type FloorConfiguration = {
  floors: FloorRecord[];
  areas: ServiceAreaRecord[];
  tables: FloorTableRecord[];
};

export type TableCombinationRecord = {
  id: string;
  branchId: string;
  code: string;
  displayName: string;
  minPartySize: number;
  maxPartySize: number | null;
  isActive: boolean;
  tableIds: string[];
  derivedCapacity: number;
};

export type ReservationStatus =
  | "inquiry"
  | "pending"
  | "confirmed"
  | "arrived"
  | "partially_seated"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show"
  | "declined";

export type ReservationRecord = {
  id: string;
  branchId: string;
  reservationNumber: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  reservationDate: string;
  startAt: string;
  expectedEndAt: string;
  partySize: number;
  highChairCount: number;
  accessibilityRequired: boolean;
  assignedTableId: string | null;
  reservationStatus: ReservationStatus;
  bookingChannel: string;
  specialRequests: string | null;
  internalNotes: string | null;
  confirmationStatus: string;
  cancellationReason: string | null;
  arrivedAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  tableIds: string[];
};

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  available: boolean;
  tableOptions: { tableId: string; tableNumber: string; capacity: number; isAccessible: boolean }[];
  combinationOptions: {
    combinationId: string;
    code: string;
    displayName: string;
    tableIds: string[];
    capacity: number;
  }[];
};

export type WaitlistStatus =
  | "waiting"
  | "notified"
  | "arrived"
  | "seated"
  | "cancelled"
  | "left"
  | "expired";

export type WaitlistRecord = {
  id: string;
  branchId: string;
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  accessibilityRequired: boolean;
  highChairCount: number;
  quotedWaitMinutes: number | null;
  estimatedSeatAt: string | null;
  status: WaitlistStatus;
  notes: string | null;
  notifiedAt: string | null;
  arrivedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
};

export type DiningSessionRecord = {
  id: string;
  branchId: string;
  sessionNumber: string | null;
  status: string;
  serviceStatus: string;
  partySize: number | null;
  guestName: string | null;
  reservationId: string | null;
  waitlistId: string | null;
  primaryServerUserId: string | null;
  openedAt: string;
  seatedAt: string | null;
  firstOrderAt: string | null;
  billRequestedAt: string | null;
  closedAt: string | null;
  tableIds: string[];
};

export type DiningSessionDetail = DiningSessionRecord & {
  servers: { userId: string; role: string; assignedAt: string }[];
  orders: { id: string; orderNumber: string; status: string; totalAmount: number }[];
  bills: { id: string; billNumber: string; status: string; grandTotal: number }[];
};

export type LiveFloorTable = FloorTableRecord & {
  table_number?: string;
  session: {
    id: string;
    sessionNumber: string | null;
    guestName: string | null;
    partySize: number | null;
    serviceStatus: string;
    openedAt: string;
    seatedAt: string | null;
    billRequestedAt: string | null;
    primaryServerUserId: string | null;
    primaryServerName: string | null;
  } | null;
};

export type LiveFloorState = {
  branchId: string;
  floors: { id: string; code: string; display_name: string; sort_order: number; is_active: boolean }[];
  areas: {
    id: string;
    floor_id: string;
    code: string;
    display_name: string;
    color_token: string | null;
    is_active: boolean;
  }[];
  tables: Array<Record<string, unknown> & { id: string; session: LiveFloorTable["session"] }>;
  activeSessions: DiningSessionRecord[];
  upcomingReservations: Array<Record<string, unknown>>;
  waitlistCount: number;
  conflicts: { tableId: string; reason: string }[];
  lastUpdatedAt: string;
};

export type ReservationDailyReport = {
  date: string;
  branchId: string;
  totalReservations: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  covers: number;
  seatedCovers: number;
  noShows: number;
  cancellations: number;
  diningSessions: number;
  walkInSessions: number;
  reservationSessions: number;
};

function readInit(accessToken: string, opts?: AdminReadOptions) {
  return {
    headers: bearerHeaders(accessToken),
    signal: opts?.signal,
    correlationId: opts?.correlationId,
    timeoutMs: opts?.timeoutMs ?? ADMIN_READ_TIMEOUT_MS,
  };
}

function writeInit(accessToken: string, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    method: "POST" as const,
    headers: { ...bearerHeaders(accessToken), ...(extraHeaders ?? {}) },
    body: JSON.stringify(body),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  };
}

// ---------------------------------------------------------------- floor config

export async function getFloorConfiguration(
  accessToken: string,
  branchId: string,
  opts?: AdminReadOptions,
): Promise<FloorConfiguration> {
  return fetchApiData<FloorConfiguration>(
    `/admin/floor/configuration?branchId=${encodeURIComponent(branchId)}`,
    readInit(accessToken, opts),
  );
}

export async function createFloor(
  accessToken: string,
  input: { branchId: string; code: string; displayName: string; description?: string; sortOrder?: number },
): Promise<FloorRecord> {
  return fetchApiData<FloorRecord>(`/admin/floor/floors`, writeInit(accessToken, input));
}

export async function updateFloor(
  accessToken: string,
  floorId: string,
  patch: { displayName?: string; description?: string | null; sortOrder?: number; isActive?: boolean },
): Promise<FloorRecord> {
  return fetchApiData<FloorRecord>(`/admin/floor/floors/${floorId}`, {
    ...writeInit(accessToken, patch),
    method: "PATCH",
  });
}

export async function createServiceArea(
  accessToken: string,
  input: {
    branchId: string;
    floorId: string;
    code: string;
    displayName: string;
    description?: string;
    sortOrder?: number;
    colorToken?: string;
  },
): Promise<ServiceAreaRecord> {
  return fetchApiData<ServiceAreaRecord>(`/admin/floor/areas`, writeInit(accessToken, input));
}

export async function updateServiceArea(
  accessToken: string,
  areaId: string,
  patch: { displayName?: string; sortOrder?: number; colorToken?: string | null; isActive?: boolean },
): Promise<ServiceAreaRecord> {
  return fetchApiData<ServiceAreaRecord>(`/admin/floor/areas/${areaId}`, {
    ...writeInit(accessToken, patch),
    method: "PATCH",
  });
}

export async function updateTableLayout(
  accessToken: string,
  tableId: string,
  patch: Partial<{
    displayName: string | null;
    floorId: string | null;
    serviceAreaId: string | null;
    capacityMin: number;
    capacityMax: number | null;
    shape: TableShape;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    rotation: number;
    isAccessible: boolean;
    highChairSupported: boolean;
    isActive: boolean;
  }>,
): Promise<FloorTableRecord> {
  return fetchApiData<FloorTableRecord>(`/admin/floor/tables/${tableId}/layout`, {
    ...writeInit(accessToken, patch),
    method: "PATCH",
  });
}

export async function transitionTableStatus(
  accessToken: string,
  tableId: string,
  toStatus: TableOperationalStatus,
  note?: string,
): Promise<FloorTableRecord> {
  return fetchApiData<FloorTableRecord>(
    `/admin/floor/tables/${tableId}/status`,
    writeInit(accessToken, { toStatus, ...(note ? { note } : {}) }),
  );
}

export async function listTableCombinations(
  accessToken: string,
  branchId: string,
  opts?: AdminReadOptions,
): Promise<TableCombinationRecord[]> {
  return fetchApiData<TableCombinationRecord[]>(
    `/admin/floor/combinations?branchId=${encodeURIComponent(branchId)}`,
    readInit(accessToken, opts),
  );
}

export async function createTableCombination(
  accessToken: string,
  input: {
    branchId: string;
    code: string;
    displayName: string;
    minPartySize?: number;
    maxPartySize?: number;
    tableIds: string[];
  },
): Promise<TableCombinationRecord> {
  return fetchApiData<TableCombinationRecord>(`/admin/floor/combinations`, writeInit(accessToken, input));
}

export async function updateTableCombination(
  accessToken: string,
  combinationId: string,
  patch: { displayName?: string; minPartySize?: number; maxPartySize?: number | null; isActive?: boolean },
): Promise<TableCombinationRecord> {
  return fetchApiData<TableCombinationRecord>(`/admin/floor/combinations/${combinationId}`, {
    ...writeInit(accessToken, patch),
    method: "PATCH",
  });
}

// ---------------------------------------------------------------- reservations

export async function searchReservationAvailability(
  accessToken: string,
  query: { branchId: string; date: string; partySize: number; durationMinutes?: number },
  opts?: AdminReadOptions,
): Promise<{ slots: AvailabilitySlot[]; policy: Record<string, unknown> }> {
  const params = new URLSearchParams({
    branchId: query.branchId,
    date: query.date,
    partySize: String(query.partySize),
  });
  if (query.durationMinutes) params.set("durationMinutes", String(query.durationMinutes));
  return fetchApiData(`/admin/reservations/availability?${params.toString()}`, readInit(accessToken, opts));
}

export async function createReservation(
  accessToken: string,
  input: {
    branchId: string;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    startAt: string;
    expectedEndAt?: string;
    partySize: number;
    highChairCount?: number;
    accessibilityRequired?: boolean;
    bookingChannel?: string;
    reservationStatus?: "inquiry" | "pending" | "confirmed";
    specialRequests?: string;
    internalNotes?: string;
    tableIds?: string[];
    overrideCapacity?: boolean;
  },
  idempotencyKey: string,
): Promise<{ id: string; reservationNumber: string; status: string; idempotentReplay: boolean }> {
  return fetchApiData(`/admin/reservations`, writeInit(accessToken, input, { "Idempotency-Key": idempotencyKey }));
}

export async function listReservations(
  accessToken: string,
  query: { branchId: string; date?: string; status?: ReservationStatus; limit?: number; offset?: number },
  opts?: AdminReadOptions,
): Promise<ReservationRecord[]> {
  const params = new URLSearchParams({ branchId: query.branchId });
  if (query.date) params.set("date", query.date);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(clampListLimit(query.limit)));
  if (query.offset != null && query.offset > 0) params.set("offset", String(Math.trunc(query.offset)));
  return fetchApiData<ReservationRecord[]>(
    `/admin/reservations?${params.toString()}`,
    readInit(accessToken, opts),
  );
}

export async function getReservation(
  accessToken: string,
  id: string,
  opts?: AdminReadOptions,
): Promise<ReservationRecord> {
  return fetchApiData<ReservationRecord>(`/admin/reservations/${id}`, readInit(accessToken, opts));
}

export async function transitionReservation(
  accessToken: string,
  id: string,
  action: "confirm" | "cancel" | "arrive" | "no-show" | "decline" | "complete",
  reason?: string,
): Promise<ReservationRecord> {
  return fetchApiData<ReservationRecord>(
    `/admin/reservations/${id}/${action}`,
    writeInit(accessToken, reason ? { reason } : {}),
  );
}

export async function assignReservationTables(
  accessToken: string,
  id: string,
  tableIds: string[],
  overrideCapacity = false,
): Promise<ReservationRecord> {
  return fetchApiData<ReservationRecord>(
    `/admin/reservations/${id}/tables`,
    writeInit(accessToken, { tableIds, overrideCapacity }),
  );
}

export async function seatReservation(
  accessToken: string,
  id: string,
  input: { tableIds: string[]; serverUserId?: string; overrideCapacity?: boolean },
): Promise<{ sessionId: string; sessionNumber: string }> {
  return fetchApiData(`/admin/reservations/${id}/seat`, writeInit(accessToken, input));
}

export async function getReservationDailyReport(
  accessToken: string,
  branchId: string,
  date: string,
  opts?: AdminReadOptions,
): Promise<ReservationDailyReport> {
  return fetchApiData<ReservationDailyReport>(
    `/admin/reservations/reports/daily?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`,
    readInit(accessToken, opts),
  );
}

// ---------------------------------------------------------------- waitlist

export async function addWaitlistEntry(
  accessToken: string,
  input: {
    branchId: string;
    guestName: string;
    guestPhone?: string;
    partySize: number;
    quotedWaitMinutes?: number;
    accessibilityRequired?: boolean;
    highChairCount?: number;
    notes?: string;
  },
): Promise<WaitlistRecord> {
  return fetchApiData<WaitlistRecord>(`/admin/waitlist`, writeInit(accessToken, input));
}

export async function listWaitlist(
  accessToken: string,
  query: { branchId: string; status?: WaitlistStatus; limit?: number },
  opts?: AdminReadOptions,
): Promise<WaitlistRecord[]> {
  const params = new URLSearchParams({ branchId: query.branchId });
  if (query.status) params.set("status", query.status);
  params.set("limit", String(clampListLimit(query.limit)));
  return fetchApiData<WaitlistRecord[]>(`/admin/waitlist?${params.toString()}`, readInit(accessToken, opts));
}

export async function transitionWaitlistEntry(
  accessToken: string,
  id: string,
  action: "notify" | "arrive" | "cancel" | "left",
): Promise<WaitlistRecord> {
  return fetchApiData<WaitlistRecord>(`/admin/waitlist/${id}/${action}`, writeInit(accessToken, {}));
}

export async function updateWaitlistEntry(
  accessToken: string,
  id: string,
  patch: { quotedWaitMinutes?: number | null; notes?: string | null; partySize?: number },
): Promise<WaitlistRecord> {
  return fetchApiData<WaitlistRecord>(`/admin/waitlist/${id}`, {
    ...writeInit(accessToken, patch),
    method: "PATCH",
  });
}

export async function seatWaitlistEntry(
  accessToken: string,
  id: string,
  input: { tableIds: string[]; serverUserId?: string; overrideCapacity?: boolean },
): Promise<{ sessionId: string; sessionNumber: string }> {
  return fetchApiData(`/admin/waitlist/${id}/seat`, writeInit(accessToken, input));
}

// ---------------------------------------------------------------- table service

export async function getLiveFloorState(
  accessToken: string,
  branchId: string,
  opts?: AdminReadOptions,
): Promise<LiveFloorState> {
  return fetchApiData<LiveFloorState>(
    `/admin/table-service/floor-state?branchId=${encodeURIComponent(branchId)}`,
    readInit(accessToken, opts),
  );
}

export async function seatWalkIn(
  accessToken: string,
  input: {
    branchId: string;
    tableIds: string[];
    partySize: number;
    guestName: string;
    serverUserId?: string;
    overrideCapacity?: boolean;
  },
): Promise<{ sessionId: string; sessionNumber: string }> {
  return fetchApiData(`/admin/table-service/sessions/walk-in`, writeInit(accessToken, input));
}

export async function listActiveSessions(
  accessToken: string,
  branchId: string,
  opts?: AdminReadOptions,
): Promise<DiningSessionRecord[]> {
  return fetchApiData<DiningSessionRecord[]>(
    `/admin/table-service/sessions?branchId=${encodeURIComponent(branchId)}`,
    readInit(accessToken, opts),
  );
}

export async function getDiningSession(
  accessToken: string,
  sessionId: string,
  opts?: AdminReadOptions,
): Promise<DiningSessionDetail> {
  return fetchApiData<DiningSessionDetail>(
    `/admin/table-service/sessions/${sessionId}`,
    readInit(accessToken, opts),
  );
}

export async function transferSessionTables(
  accessToken: string,
  sessionId: string,
  input: { addTableIds?: string[]; removeTableIds?: string[]; reason?: string },
): Promise<{ sessionId: string; tableIds: string[] }> {
  return fetchApiData(`/admin/table-service/sessions/${sessionId}/transfer`, writeInit(accessToken, input));
}

export async function requestSessionBill(
  accessToken: string,
  sessionId: string,
): Promise<DiningSessionRecord> {
  return fetchApiData<DiningSessionRecord>(
    `/admin/table-service/sessions/${sessionId}/request-bill`,
    writeInit(accessToken, {}),
  );
}

export async function closeDiningSession(
  accessToken: string,
  sessionId: string,
  input?: { overrideOpenBill?: boolean; note?: string },
): Promise<{ sessionId: string; releasedTableIds: string[] }> {
  return fetchApiData(`/admin/table-service/sessions/${sessionId}/close`, writeInit(accessToken, input ?? {}));
}

export async function cancelDiningSession(
  accessToken: string,
  sessionId: string,
  reason?: string,
): Promise<{ cancelled: boolean }> {
  return fetchApiData(
    `/admin/table-service/sessions/${sessionId}/cancel`,
    writeInit(accessToken, reason ? { reason } : {}),
  );
}

/** Text labels shown next to status colors (never color alone). */
export const TABLE_STATUS_LABELS: Record<TableOperationalStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  ordering: "Ordering",
  served: "Served",
  bill_requested: "Bill requested",
  payment_pending: "Payment pending",
  cleaning: "Cleaning",
  blocked: "Blocked",
  out_of_service: "Out of service",
};

export const TABLE_STATUS_CLASSES: Record<TableOperationalStatus, string> = {
  available: "bg-emerald-100 text-emerald-900 border-emerald-300",
  reserved: "bg-sky-100 text-sky-900 border-sky-300",
  occupied: "bg-amber-100 text-amber-900 border-amber-300",
  ordering: "bg-orange-100 text-orange-900 border-orange-300",
  served: "bg-lime-100 text-lime-900 border-lime-300",
  bill_requested: "bg-purple-100 text-purple-900 border-purple-300",
  payment_pending: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  cleaning: "bg-slate-200 text-slate-800 border-slate-400",
  blocked: "bg-red-100 text-red-900 border-red-300",
  out_of_service: "bg-neutral-200 text-neutral-700 border-neutral-400",
};

/** D3 corrective — settle a restaurant bill (idempotent). */
export async function settleBillPayment(
  token: string,
  input: {
    branchId: string;
    restaurantBillId: string;
    amount: number;
    method: "cash" | "card_terminal" | "bank_manual" | "complimentary";
    cashTendered?: number;
    externalReference?: string;
    note?: string;
  },
  idempotencyKey: string,
) {
  return fetchApiData<Record<string, unknown>>("/api/v1/admin/payments/settle", {
    method: "POST",
    headers: {
      ...bearerHeaders(token),
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  });
}

export async function getBillBalance(token: string, billId: string) {
  return fetchApiData<{
    billId: string;
    grandTotal: number;
    paidTotal: number;
    remaining: number;
    status: string;
  }>(`/api/v1/admin/payments/bills/${billId}/balance`, {
    headers: bearerHeaders(token),
    timeoutMs: ADMIN_READ_TIMEOUT_MS,
  });
}

