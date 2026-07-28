import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";

import {
  assertValidIanaTimezone,
  businessDateInTimezone,
  businessDayUtcBounds,
  wallTimeToUtcIso,
} from "../time/branch-timezone.js";

/**
 * D3 — reservations: server-authoritative availability engine, atomic
 * creation (create_reservation_atomic RPC), lifecycle transitions, table
 * assignment (GiST exclusion protected), and the waitlist lifecycle.
 *
 * Branch wall-clock ↔ UTC conversion uses `branches.timezone` (IANA) via
 * the shared branch-timezone helpers.
 */

export const RESERVATION_STATUSES = [
  "inquiry",
  "pending",
  "confirmed",
  "arrived",
  "partially_seated",
  "seated",
  "completed",
  "cancelled",
  "no_show",
  "declined",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const BOOKING_CHANNELS = [
  "phone",
  "walk_in",
  "website",
  "admin",
  "staff",
  "whatsapp",
  "partner",
] as const;
export type BookingChannel = (typeof BOOKING_CHANNELS)[number];

export const WAITLIST_STATUSES = [
  "waiting",
  "notified",
  "arrived",
  "seated",
  "cancelled",
  "left",
  "expired",
] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

const RESERVATION_TRANSITIONS: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
  inquiry: ["pending", "confirmed", "declined", "cancelled"],
  pending: ["confirmed", "arrived", "cancelled", "declined", "no_show"],
  confirmed: ["arrived", "cancelled", "no_show"],
  arrived: ["cancelled", "no_show"],
  seated: ["completed"],
};

const WAITLIST_TRANSITIONS: Partial<Record<WaitlistStatus, WaitlistStatus[]>> = {
  waiting: ["notified", "arrived", "cancelled", "left", "expired"],
  notified: ["arrived", "cancelled", "left", "expired"],
  arrived: ["cancelled", "left"],
};

export interface ReservationRecord {
  id: string;
  branchId: string;
  reservationNumber: string;
  customerId: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  reservationDate: string;
  startAt: string;
  expectedEndAt: string;
  partySize: number;
  adults: number | null;
  children: number | null;
  highChairCount: number;
  accessibilityRequired: boolean;
  preferredFloorId: string | null;
  preferredAreaId: string | null;
  assignedTableId: string | null;
  reservationStatus: ReservationStatus;
  bookingChannel: BookingChannel;
  specialRequests: string | null;
  internalNotes: string | null;
  depositRequired: boolean;
  depositAmount: number | null;
  depositStatus: string;
  confirmationStatus: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  arrivedAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tableIds: string[];
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  available: boolean;
  tableOptions: { tableId: string; tableNumber: string; capacity: number; isAccessible: boolean }[];
  combinationOptions: { combinationId: string; code: string; displayName: string; tableIds: string[]; capacity: number }[];
}

export interface WaitlistRecord {
  id: string;
  branchId: string;
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  requestedAreaId: string | null;
  accessibilityRequired: boolean;
  highChairCount: number;
  quotedWaitMinutes: number | null;
  estimatedSeatAt: string | null;
  status: WaitlistStatus;
  notes: string | null;
  notifiedAt: string | null;
  arrivedAt: string | null;
  seatedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationInput {
  branchId: string;
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  customerId?: string | null;
  startAt: string;
  expectedEndAt?: string | null;
  partySize: number;
  adults?: number | null;
  children?: number | null;
  highChairCount?: number;
  accessibilityRequired?: boolean;
  preferredFloorId?: string | null;
  preferredAreaId?: string | null;
  bookingChannel?: BookingChannel;
  reservationStatus?: "inquiry" | "pending" | "confirmed";
  specialRequests?: string | null;
  internalNotes?: string | null;
  tableIds?: string[];
  overrideCapacity?: boolean;
  idempotencyKey: string;
}

export interface ReservationsService {
  searchAvailability(
    scope: BranchActorScope,
    query: {
      branchId: string;
      date: string;
      partySize: number;
      durationMinutes?: number;
      areaId?: string;
      accessibleOnly?: boolean;
    },
  ): Promise<{ slots: AvailabilitySlot[]; policy: Record<string, unknown>; timezone: string }>;
  createReservation(scope: BranchActorScope, input: CreateReservationInput): Promise<{
    id: string;
    reservationNumber: string;
    status: string;
    idempotentReplay: boolean;
    timezone: string;
    startAt: string;
  }>;
  listReservations(
    scope: BranchActorScope,
    filters: {
      branchId: string;
      date?: string;
      status?: ReservationStatus;
      limit: number;
      offset: number;
    },
  ): Promise<{ reservations: ReservationRecord[]; total: number }>;
  getReservation(scope: BranchActorScope, id: string): Promise<ReservationRecord>;
  updateReservation(
    scope: BranchActorScope,
    id: string,
    patch: {
      guestName?: string;
      guestPhone?: string | null;
      guestEmail?: string | null;
      partySize?: number;
      specialRequests?: string | null;
      internalNotes?: string | null;
      highChairCount?: number;
      accessibilityRequired?: boolean;
    },
  ): Promise<ReservationRecord>;
  transitionReservation(
    scope: BranchActorScope,
    id: string,
    action: "confirm" | "cancel" | "arrive" | "no_show" | "decline" | "complete",
    options?: { reason?: string },
  ): Promise<ReservationRecord>;
  assignTables(
    scope: BranchActorScope,
    id: string,
    tableIds: string[],
    overrideCapacity: boolean,
  ): Promise<ReservationRecord>;
  seatReservation(
    scope: BranchActorScope,
    id: string,
    input: { tableIds: string[]; serverUserId?: string | null; overrideCapacity?: boolean },
  ): Promise<{ sessionId: string; sessionNumber: string }>;
  addWaitlistEntry(
    scope: BranchActorScope,
    input: {
      branchId: string;
      guestName: string;
      guestPhone?: string | null;
      partySize: number;
      requestedAreaId?: string | null;
      accessibilityRequired?: boolean;
      highChairCount?: number;
      quotedWaitMinutes?: number | null;
      notes?: string | null;
    },
  ): Promise<WaitlistRecord>;
  listWaitlist(
    scope: BranchActorScope,
    filters: { branchId: string; status?: WaitlistStatus; limit: number; offset: number },
  ): Promise<{ entries: WaitlistRecord[]; total: number }>;
  updateWaitlistEntry(
    scope: BranchActorScope,
    id: string,
    patch: { quotedWaitMinutes?: number | null; notes?: string | null; partySize?: number },
  ): Promise<WaitlistRecord>;
  transitionWaitlistEntry(
    scope: BranchActorScope,
    id: string,
    action: "notify" | "arrive" | "cancel" | "left" | "expire",
  ): Promise<WaitlistRecord>;
  seatWaitlistEntry(
    scope: BranchActorScope,
    id: string,
    input: { tableIds: string[]; serverUserId?: string | null; overrideCapacity?: boolean },
  ): Promise<{ sessionId: string; sessionNumber: string }>;
  getDailyReport(
    scope: BranchActorScope,
    branchId: string,
    date: string,
  ): Promise<Record<string, unknown> & { timezone: string }>;
}

const DEFAULT_POLICY = {
  booking_enabled: true,
  online_booking_enabled: false,
  min_advance_minutes: 0,
  max_advance_days: 30,
  slot_interval_minutes: 30,
  default_duration_minutes: 90,
  max_party_size_online: 10,
  service_start_time: "12:00:00",
  service_end_time: "23:00:00",
  grace_period_minutes: 15,
  no_show_after_minutes: 30,
  cleaning_buffer_minutes: 10,
  overbooking_allowed: false,
};

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(scope: BranchActorScope, branchId: string): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "RESERVATION_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

/** Maps P0001 business codes raised by the D3 RPCs onto API errors. */
export function mapD3RpcError(error: { message?: string; code?: string; details?: string }): never {
  const raw = `${error.message ?? ""} ${error.details ?? ""}`;
  const notFound = [
    "BRANCH_NOT_FOUND",
    "TABLE_NOT_FOUND",
    "RESERVATION_NOT_FOUND",
    "WAITLIST_NOT_FOUND",
    "SESSION_NOT_FOUND",
  ];
  const conflict = [
    "IDEMPOTENCY_CONFLICT",
    "BRANCH_INACTIVE",
    "BRANCH_NOT_OPERATIONAL",
    "BOOKING_DISABLED",
    "ONLINE_BOOKING_DISABLED",
    "RESERVATION_BLACKOUT",
    "RESERVATION_TABLE_CONFLICT",
    "RESERVATION_CAPACITY_EXCEEDED",
    "RESERVATION_ALREADY_SEATED",
    "RESERVATION_NOT_SEATABLE",
    "RESERVATION_BRANCH_MISMATCH",
    "WAITLIST_ALREADY_SEATED",
    "WAITLIST_NOT_SEATABLE",
    "WAITLIST_BRANCH_MISMATCH",
    "TABLE_BRANCH_MISMATCH",
    "TABLE_NOT_ACTIVE",
    "TABLE_NOT_ASSIGNABLE",
    "TABLE_NOT_AVAILABLE",
    "TABLE_ALREADY_OCCUPIED",
    "TABLE_NOT_IN_SESSION",
    "SEATING_CAPACITY_EXCEEDED",
    "SERVER_NOT_IN_BRANCH",
    "SESSION_NOT_ACTIVE",
    "SESSION_ALREADY_CLOSED",
    "SESSION_NEEDS_TABLE",
    "SESSION_BILL_OPEN",
    "SESSION_UNPAID_BALANCE",
    "PAYMENT_EXCEEDS_BALANCE",
    "BILL_NOT_SETTLEABLE",
    "PAYMENT_ALREADY_VOIDED",
    "DEPOSIT_ALREADY_APPLIED",
    "COMPLIMENTARY_AMOUNT_MISMATCH",
    "CASH_TENDERED_INSUFFICIENT",
  ];
  const badRequest = [
    "IDEMPOTENCY_KEY_REQUIRED",
    "IDEMPOTENCY_HASH_REQUIRED",
    "RESERVATION_WINDOW_INVALID",
    "RESERVATION_PARTY_SIZE_INVALID",
    "RESERVATION_GUEST_NAME_REQUIRED",
    "RESERVATION_STATUS_INVALID",
    "SEATING_SOURCE_INVALID",
    "SEATING_TABLES_REQUIRED",
    "SEATING_PARTY_SIZE_INVALID",
    "RESERVATION_ID_REQUIRED",
    "WAITLIST_ID_REQUIRED",
    "UNPAID_OVERRIDE_REASON_REQUIRED",
    "PAYMENT_AMOUNT_INVALID",
    "PAYMENT_METHOD_INVALID",
  ];
  for (const code of notFound) {
    if (raw.includes(code)) throw new ApiError(404, code, "Resource was not found.");
  }
  for (const code of conflict) {
    if (raw.includes(code)) throw new ApiError(409, code, `Operation rejected: ${code}.`);
  }
  for (const code of badRequest) {
    if (raw.includes(code)) throw new ApiError(400, code, `Invalid request: ${code}.`);
  }
  throw new ApiError(500, "TABLE_SERVICE_RPC_FAILED", "Atomic table-service operation failed.");
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

type ReservationRow = Record<string, unknown>;

function toReservation(row: ReservationRow, tableIds: string[] = []): ReservationRecord {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    reservationNumber: row.reservation_number as string,
    customerId: (row.customer_id as string | null) ?? null,
    guestName: row.guest_name as string,
    guestPhone: (row.guest_phone as string | null) ?? null,
    guestEmail: (row.guest_email as string | null) ?? null,
    reservationDate: row.reservation_date as string,
    startAt: row.start_at as string,
    expectedEndAt: row.expected_end_at as string,
    partySize: row.party_size as number,
    adults: (row.adults as number | null) ?? null,
    children: (row.children as number | null) ?? null,
    highChairCount: (row.high_chair_count as number) ?? 0,
    accessibilityRequired: Boolean(row.accessibility_required),
    preferredFloorId: (row.preferred_floor_id as string | null) ?? null,
    preferredAreaId: (row.preferred_area_id as string | null) ?? null,
    assignedTableId: (row.assigned_table_id as string | null) ?? null,
    reservationStatus: row.reservation_status as ReservationStatus,
    bookingChannel: row.booking_channel as BookingChannel,
    specialRequests: (row.special_requests as string | null) ?? null,
    internalNotes: (row.internal_notes as string | null) ?? null,
    depositRequired: Boolean(row.deposit_required),
    depositAmount: row.deposit_amount === null ? null : Number(row.deposit_amount),
    depositStatus: row.deposit_status as string,
    confirmationStatus: row.confirmation_status as string,
    cancellationReason: (row.cancellation_reason as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    noShowAt: (row.no_show_at as string | null) ?? null,
    arrivedAt: (row.arrived_at as string | null) ?? null,
    seatedAt: (row.seated_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tableIds,
  };
}

function toWaitlist(row: Record<string, unknown>): WaitlistRecord {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    guestName: row.guest_name as string,
    guestPhone: (row.guest_phone as string | null) ?? null,
    partySize: row.party_size as number,
    requestedAreaId: (row.requested_area_id as string | null) ?? null,
    accessibilityRequired: Boolean(row.accessibility_required),
    highChairCount: (row.high_chair_count as number) ?? 0,
    quotedWaitMinutes: (row.quoted_wait_minutes as number | null) ?? null,
    estimatedSeatAt: (row.estimated_seat_at as string | null) ?? null,
    status: row.status as WaitlistStatus,
    notes: (row.notes as string | null) ?? null,
    notifiedAt: (row.notified_at as string | null) ?? null,
    arrivedAt: (row.arrived_at as string | null) ?? null,
    seatedAt: (row.seated_at as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function createReservationsService(envStatus: EnvironmentStatus): ReservationsService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadReservationRow(id: string): Promise<ReservationRow> {
    const { data, error } = await getClient()
      .from("reservations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ApiError(500, "RESERVATION_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "RESERVATION_NOT_FOUND", "Reservation not found.");
    return data as ReservationRow;
  }

  async function activeTableIds(reservationId: string): Promise<string[]> {
    const { data } = await getClient()
      .from("reservation_table_assignments")
      .select("table_id")
      .eq("reservation_id", reservationId)
      .is("released_at", null);
    return ((data ?? []) as { table_id: string }[]).map((r) => r.table_id);
  }

  async function loadWaitlistRow(id: string): Promise<Record<string, unknown>> {
    const { data, error } = await getClient()
      .from("waitlist_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ApiError(500, "WAITLIST_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "WAITLIST_NOT_FOUND", "Waitlist entry not found.");
    return data as Record<string, unknown>;
  }

  async function audit(entry: {
    branchId: string;
    actorUserId: string | null;
    resourceType: string;
    resourceId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    note?: string | null;
  }): Promise<void> {
    await getClient().from("table_service_audit").insert({
      branch_id: entry.branchId,
      actor_user_id: entry.actorUserId,
      actor_type: "staff",
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      action: entry.action,
      before_data: entry.before ?? null,
      after_data: entry.after ?? null,
      note: entry.note ?? null,
    });
  }

  async function seatViaRpc(
    scope: BranchActorScope,
    params: {
      branchId: string;
      source: "reservation" | "waitlist" | "walk_in";
      reservationId?: string | null;
      waitlistId?: string | null;
      tableIds: string[];
      partySize?: number | null;
      guestName?: string | null;
      serverUserId?: string | null;
      overrideCapacity?: boolean;
    },
  ): Promise<{ sessionId: string; sessionNumber: string }> {
    const { data, error } = await getClient().rpc("seat_party_atomic", {
      p_branch_id: params.branchId,
      p_source: params.source,
      p_reservation_id: params.reservationId ?? null,
      p_waitlist_id: params.waitlistId ?? null,
      p_table_ids: params.tableIds,
      p_party_size: params.partySize ?? null,
      p_guest_name: params.guestName ?? null,
      p_server_user_id: params.serverUserId ?? null,
      p_actor_user_id: scope.userId,
      p_override_capacity: params.overrideCapacity ?? false,
    });
    if (error) mapD3RpcError(error);
    const row = data as { id: string; sessionNumber: string };
    return { sessionId: row.id, sessionNumber: row.sessionNumber };
  }

  return {
    async searchAvailability(scope, query) {
      assertBranchInScope(scope, query.branchId);
      const supabase = getClient();

      const { data: branch, error: bErr } = await supabase
        .from("branches")
        .select("id, status, timezone")
        .eq("id", query.branchId)
        .maybeSingle();
      if (bErr) throw new ApiError(500, "AVAILABILITY_FAILED", bErr.message);
      if (!branch) throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found.");
      if (branch.status !== "operating") {
        throw new ApiError(409, "BRANCH_NOT_OPERATIONAL", "Branch is not operating.");
      }
      const timezone = assertValidIanaTimezone(
        typeof branch.timezone === "string" && branch.timezone.trim()
          ? branch.timezone
          : "Asia/Karachi",
      );

      const { data: policyRow } = await supabase
        .from("branch_booking_policies")
        .select("*")
        .eq("branch_id", query.branchId)
        .eq("status", "ACTIVE")
        .maybeSingle();
      const policy = { ...DEFAULT_POLICY, ...(policyRow ?? {}) };

      const duration = query.durationMinutes ?? (policy.default_duration_minutes as number);
      const interval = policy.slot_interval_minutes as number;
      const serviceStart = String(policy.service_start_time).slice(0, 8);
      const serviceEnd = String(policy.service_end_time).slice(0, 8);
      const dayStart = new Date(wallTimeToUtcIso(query.date, serviceStart, timezone));
      const dayEnd = new Date(wallTimeToUtcIso(query.date, serviceEnd, timezone));
      if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
        throw new ApiError(422, "VALIDATION_ERROR", "Invalid availability date.");
      }

      // One query per dataset (no N+1): tables, combos, blackouts,
      // overlapping reservation holds, active sessions.
      const windowStartIso = dayStart.toISOString();
      const windowEndIso = new Date(dayEnd.getTime() + duration * 60_000).toISOString();

      const [tablesRes, combosRes, membersRes, blackoutsRes, holdsRes, sessionsRes] = await Promise.all([
        supabase
          .from("restaurant_tables")
          .select(
            "id, table_number, capacity, capacity_min, capacity_max, is_active, operational_status, service_area_id, is_accessible",
          )
          .eq("branch_id", query.branchId),
        supabase
          .from("table_combinations")
          .select("id, code, display_name, min_party_size, max_party_size, is_active")
          .eq("branch_id", query.branchId)
          .eq("is_active", true),
        supabase.from("table_combination_members").select("combination_id, table_id"),
        supabase
          .from("service_blackouts")
          .select("floor_id, service_area_id, start_at, end_at, booking_allowed")
          .eq("branch_id", query.branchId)
          .lt("start_at", windowEndIso)
          .gt("end_at", windowStartIso),
        supabase
          .from("reservation_table_assignments")
          .select("table_id, reserved_range, released_at")
          .is("released_at", null),
        supabase
          .from("dining_session_tables")
          .select("table_id, released_at")
          .is("released_at", null),
      ]);
      if (tablesRes.error) throw new ApiError(500, "AVAILABILITY_FAILED", tablesRes.error.message);

      const tables = (tablesRes.data ?? []).filter(
        (t) =>
          t.is_active &&
          !["blocked", "out_of_service"].includes(t.operational_status as string) &&
          (!query.areaId || t.service_area_id === query.areaId) &&
          (!query.accessibleOnly || t.is_accessible),
      );
      const tableIdSet = new Set(tables.map((t) => t.id as string));

      const holds = ((holdsRes.data ?? []) as { table_id: string; reserved_range: string }[])
        .filter((h) => tableIdSet.has(h.table_id))
        .map((h) => {
          // tstzrange serialises as e.g. ["2026-07-25 12:00:00+00","2026-07-25 13:30:00+00")
          const match = /[[(]"?([^",]+)"?\s*,\s*"?([^")\]]+)"?[)\]]/.exec(h.reserved_range);
          return match
            ? {
                tableId: h.table_id,
                start: new Date(match[1]).getTime(),
                end: new Date(match[2]).getTime(),
              }
            : null;
        })
        .filter((h): h is { tableId: string; start: number; end: number } => h !== null);

      const occupiedNow = new Set(
        ((sessionsRes.data ?? []) as { table_id: string }[]).map((s) => s.table_id),
      );
      const blackouts = ((blackoutsRes.data ?? []) as {
        floor_id: string | null;
        service_area_id: string | null;
        start_at: string;
        end_at: string;
        booking_allowed: boolean;
      }[]).filter((b) => !b.booking_allowed);

      const comboMembers = new Map<string, string[]>();
      for (const m of (membersRes.data ?? []) as { combination_id: string; table_id: string }[]) {
        const list = comboMembers.get(m.combination_id) ?? [];
        list.push(m.table_id);
        comboMembers.set(m.combination_id, list);
      }
      const combos = ((combosRes.data ?? []) as {
        id: string;
        code: string;
        display_name: string;
        min_party_size: number;
        max_party_size: number | null;
      }[]).filter((c) => {
        const members = comboMembers.get(c.id) ?? [];
        return (
          members.length >= 2 &&
          members.every((id) => tableIdSet.has(id)) &&
          c.min_party_size <= query.partySize &&
          (c.max_party_size === null || query.partySize <= c.max_party_size)
        );
      });

      const capacityOf = (t: (typeof tables)[number]) =>
        (t.capacity_max as number | null) ?? (t.capacity as number | null) ?? (t.capacity_min as number) ?? 0;

      const now = Date.now();
      const minAdvanceMs = (policy.min_advance_minutes as number) * 60_000;
      const cleaningBufferMs = (policy.cleaning_buffer_minutes as number) * 60_000;
      const slots: AvailabilitySlot[] = [];

      for (
        let slotStart = dayStart.getTime();
        slotStart + duration * 60_000 <= dayEnd.getTime() + duration * 60_000;
        slotStart += interval * 60_000
      ) {
        if (slotStart > dayEnd.getTime()) break;
        const slotEnd = slotStart + duration * 60_000;
        const startIso = new Date(slotStart).toISOString();
        const endIso = new Date(slotEnd).toISOString();

        if (slotStart < now + minAdvanceMs) {
          continue;
        }

        const blackedOut = blackouts.some(
          (b) =>
            b.floor_id === null &&
            b.service_area_id === null &&
            overlaps(slotStart, slotEnd, new Date(b.start_at).getTime(), new Date(b.end_at).getTime()),
        );
        if (blackedOut) {
          slots.push({ startAt: startIso, endAt: endIso, available: false, tableOptions: [], combinationOptions: [] });
          continue;
        }

        const freeTableIds = new Set<string>();
        for (const t of tables) {
          const tid = t.id as string;
          const held = holds.some(
            (h) => h.tableId === tid && overlaps(slotStart, slotEnd + cleaningBufferMs, h.start, h.end + cleaningBufferMs),
          );
          if (held) continue;
          if (occupiedNow.has(tid) && overlaps(slotStart, slotEnd, now - 1, now + 1)) continue;
          freeTableIds.add(tid);
        }

        const tableOptions = tables
          .filter((t) => freeTableIds.has(t.id as string) && capacityOf(t) >= query.partySize)
          .map((t) => ({
            tableId: t.id as string,
            tableNumber: t.table_number as string,
            capacity: capacityOf(t),
            isAccessible: Boolean(t.is_accessible),
          }));

        const combinationOptions = combos
          .filter((c) => (comboMembers.get(c.id) ?? []).every((id) => freeTableIds.has(id)))
          .map((c) => {
            const memberIds = comboMembers.get(c.id) ?? [];
            const capacity = tables
              .filter((t) => memberIds.includes(t.id as string))
              .reduce((sum, t) => sum + capacityOf(t), 0);
            return {
              combinationId: c.id,
              code: c.code,
              displayName: c.display_name,
              tableIds: memberIds,
              capacity,
            };
          })
          .filter((c) => c.capacity >= query.partySize);

        slots.push({
          startAt: startIso,
          endAt: endIso,
          available: tableOptions.length > 0 || combinationOptions.length > 0,
          tableOptions: tableOptions.slice(0, 10),
          combinationOptions: combinationOptions.slice(0, 5),
        });
      }

      return {
        slots,
        timezone,
        policy: {
          bookingEnabled: policy.booking_enabled,
          onlineBookingEnabled: policy.online_booking_enabled,
          slotIntervalMinutes: interval,
          defaultDurationMinutes: policy.default_duration_minutes,
          serviceStartTime: policy.service_start_time,
          serviceEndTime: policy.service_end_time,
          cleaningBufferMinutes: policy.cleaning_buffer_minutes,
        },
      };
    },

    async createReservation(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const supabase = getClient();

      const { data: branchRow, error: branchErr } = await supabase
        .from("branches")
        .select("timezone")
        .eq("id", input.branchId)
        .maybeSingle();
      if (branchErr) throw new ApiError(500, "RESERVATION_CREATE_FAILED", branchErr.message);
      if (!branchRow) throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found.");
      const timezone = assertValidIanaTimezone(
        typeof branchRow.timezone === "string" && branchRow.timezone.trim()
          ? branchRow.timezone
          : "Asia/Karachi",
      );

      const startAt = new Date(input.startAt);
      if (Number.isNaN(startAt.getTime())) {
        throw new ApiError(422, "VALIDATION_ERROR", "startAt is not a valid timestamp.");
      }
      let expectedEnd = input.expectedEndAt ? new Date(input.expectedEndAt) : null;
      if (!expectedEnd) {
        const { data: policyRow } = await supabase
          .from("branch_booking_policies")
          .select("default_duration_minutes")
          .eq("branch_id", input.branchId)
          .eq("status", "ACTIVE")
          .maybeSingle();
        const duration = (policyRow?.default_duration_minutes as number | undefined) ?? 90;
        expectedEnd = new Date(startAt.getTime() + duration * 60_000);
      }

      const reservationPayload = {
        guest_name: input.guestName,
        guest_phone: input.guestPhone ?? null,
        guest_email: input.guestEmail ?? null,
        customer_id: input.customerId ?? null,
        start_at: startAt.toISOString(),
        expected_end_at: expectedEnd.toISOString(),
        reservation_date: businessDateInTimezone(startAt, timezone),
        party_size: input.partySize,
        adults: input.adults ?? null,
        children: input.children ?? null,
        high_chair_count: input.highChairCount ?? 0,
        accessibility_required: input.accessibilityRequired ?? false,
        preferred_floor_id: input.preferredFloorId ?? null,
        preferred_area_id: input.preferredAreaId ?? null,
        booking_channel: input.bookingChannel ?? "staff",
        reservation_status: input.reservationStatus ?? "pending",
        special_requests: input.specialRequests ?? null,
        internal_notes: input.internalNotes ?? null,
      };

      const requestHash = hashPayload({
        branchId: input.branchId,
        reservation: reservationPayload,
        tableIds: input.tableIds ?? [],
      });

      const { data, error } = await supabase.rpc("create_reservation_atomic", {
        p_idempotency_key: input.idempotencyKey.trim(),
        p_request_hash: requestHash,
        p_branch_id: input.branchId,
        p_reservation: reservationPayload,
        p_table_ids: input.tableIds ?? [],
        p_actor_user_id: scope.userId,
        p_override_capacity: input.overrideCapacity ?? false,
      });
      if (error) mapD3RpcError(error);
      const row = data as {
        id: string;
        reservationNumber: string;
        status: string;
        idempotentReplay: boolean;
      };
      return {
        ...row,
        timezone,
        startAt: startAt.toISOString(),
      };
    },

    async listReservations(scope, filters) {
      assertBranchInScope(scope, filters.branchId);
      let query = getClient()
        .from("reservations")
        .select("*", { count: "exact" })
        .eq("branch_id", filters.branchId);
      if (filters.date) {
        query = query.eq("reservation_date", filters.date);
      }
      if (filters.status) {
        query = query.eq("reservation_status", filters.status);
      }
      query = query
        .order("start_at", { ascending: true })
        .range(filters.offset, filters.offset + filters.limit - 1);
      const { data, error, count } = await query;
      if (error) throw new ApiError(500, "RESERVATION_LIST_FAILED", error.message);

      const rows = (data ?? []) as ReservationRow[];
      const ids = rows.map((r) => r.id as string);
      const assignmentsByReservation = new Map<string, string[]>();
      if (ids.length > 0) {
        const { data: assignments } = await getClient()
          .from("reservation_table_assignments")
          .select("reservation_id, table_id")
          .in("reservation_id", ids)
          .is("released_at", null);
        for (const a of (assignments ?? []) as { reservation_id: string; table_id: string }[]) {
          const list = assignmentsByReservation.get(a.reservation_id) ?? [];
          list.push(a.table_id);
          assignmentsByReservation.set(a.reservation_id, list);
        }
      }
      return {
        reservations: rows.map((r) => toReservation(r, assignmentsByReservation.get(r.id as string) ?? [])),
        total: count ?? rows.length,
      };
    },

    async getReservation(scope, id) {
      const row = await loadReservationRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      return toReservation(row, await activeTableIds(id));
    },

    async updateReservation(scope, id, patch) {
      const row = await loadReservationRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      if (["completed", "cancelled", "no_show", "declined"].includes(row.reservation_status as string)) {
        throw new ApiError(409, "RESERVATION_NOT_EDITABLE", "Reservation is finalised.");
      }
      const update: Record<string, unknown> = { updated_by: scope.userId };
      if (patch.guestName !== undefined) update.guest_name = patch.guestName.trim();
      if (patch.guestPhone !== undefined) update.guest_phone = patch.guestPhone;
      if (patch.guestEmail !== undefined) update.guest_email = patch.guestEmail;
      if (patch.partySize !== undefined) update.party_size = patch.partySize;
      if (patch.specialRequests !== undefined) update.special_requests = patch.specialRequests;
      if (patch.internalNotes !== undefined) update.internal_notes = patch.internalNotes;
      if (patch.highChairCount !== undefined) update.high_chair_count = patch.highChairCount;
      if (patch.accessibilityRequired !== undefined) update.accessibility_required = patch.accessibilityRequired;
      const { data, error } = await getClient()
        .from("reservations")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "RESERVATION_UPDATE_FAILED", error.message);
      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "reservation",
        resourceId: id,
        action: "reservation_updated",
        before: { partySize: row.party_size, guestName: row.guest_name },
        after: patch,
      });
      return toReservation(data as ReservationRow, await activeTableIds(id));
    },

    async transitionReservation(scope, id, action, options) {
      const row = await loadReservationRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      const from = row.reservation_status as ReservationStatus;
      const target: ReservationStatus =
        action === "confirm"
          ? "confirmed"
          : action === "cancel"
            ? "cancelled"
            : action === "arrive"
              ? "arrived"
              : action === "no_show"
                ? "no_show"
                : action === "decline"
                  ? "declined"
                  : "completed";
      const allowed = RESERVATION_TRANSITIONS[from] ?? [];
      if (!allowed.includes(target)) {
        throw new ApiError(
          409,
          "RESERVATION_TRANSITION_INVALID",
          `Reservation cannot move from ${from} to ${target}.`,
        );
      }

      const nowIso = new Date().toISOString();
      const update: Record<string, unknown> = {
        reservation_status: target,
        updated_by: scope.userId,
      };
      if (target === "confirmed") update.confirmation_status = "confirmed";
      if (target === "arrived") update.arrived_at = nowIso;
      if (target === "cancelled") {
        update.cancelled_at = nowIso;
        update.cancellation_reason = options?.reason ?? null;
      }
      if (target === "no_show") update.no_show_at = nowIso;
      if (target === "completed") update.completed_at = nowIso;

      const { data, error } = await getClient()
        .from("reservations")
        .update(update)
        .eq("id", id)
        .eq("reservation_status", from)
        .select("*")
        .maybeSingle();
      if (error) throw new ApiError(500, "RESERVATION_TRANSITION_FAILED", error.message);
      if (!data) {
        throw new ApiError(409, "RESERVATION_TRANSITION_CONFLICT", "Reservation changed concurrently. Retry.");
      }

      // Terminal states release held tables.
      if (["cancelled", "no_show", "declined"].includes(target)) {
        await getClient()
          .from("reservation_table_assignments")
          .update({ released_at: nowIso, release_reason: target })
          .eq("reservation_id", id)
          .is("released_at", null);
        if (target === "cancelled") {
          await getClient().from("reservation_communications").insert({
            branch_id: row.branch_id,
            reservation_id: id,
            message_type: "cancellation",
            channel: "none",
            status: "provider_unavailable",
            created_by: scope.userId,
          });
        }
      }

      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "reservation",
        resourceId: id,
        action: `reservation_${action}`,
        before: { status: from },
        after: { status: target },
        note: options?.reason ?? null,
      });
      return toReservation(data as ReservationRow, await activeTableIds(id));
    },

    async assignTables(scope, id, tableIds, overrideCapacity) {
      const row = await loadReservationRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      if (!["inquiry", "pending", "confirmed", "arrived"].includes(row.reservation_status as string)) {
        throw new ApiError(409, "RESERVATION_NOT_ASSIGNABLE", "Reservation is not in an assignable state.");
      }
      const uniqueIds = [...new Set(tableIds)];
      if (uniqueIds.length === 0) {
        throw new ApiError(422, "VALIDATION_ERROR", "At least one table is required.");
      }
      const supabase = getClient();
      const { data: tables, error: tErr } = await supabase
        .from("restaurant_tables")
        .select("id, branch_id, is_active, operational_status, capacity, capacity_min, capacity_max")
        .in("id", uniqueIds);
      if (tErr) throw new ApiError(500, "RESERVATION_ASSIGN_FAILED", tErr.message);
      if ((tables ?? []).length !== uniqueIds.length) {
        throw new ApiError(404, "TABLE_NOT_FOUND", "One or more tables were not found.");
      }
      for (const t of tables ?? []) {
        if (t.branch_id !== row.branch_id) {
          throw new ApiError(409, "TABLE_BRANCH_MISMATCH", "Table belongs to another branch.");
        }
        if (!t.is_active || ["blocked", "out_of_service"].includes(t.operational_status as string)) {
          throw new ApiError(409, "TABLE_NOT_ASSIGNABLE", "Table is blocked or out of service.");
        }
      }
      const capacity = (tables ?? []).reduce(
        (sum, t) =>
          sum + ((t.capacity_max as number | null) ?? (t.capacity as number | null) ?? (t.capacity_min as number) ?? 0),
        0,
      );
      if (capacity < (row.party_size as number) && !overrideCapacity) {
        throw new ApiError(409, "RESERVATION_CAPACITY_EXCEEDED", "Selected tables cannot fit the party.");
      }

      const nowIso = new Date().toISOString();
      const previous = await activeTableIds(id);
      await supabase
        .from("reservation_table_assignments")
        .update({ released_at: nowIso, release_reason: "reassigned" })
        .eq("reservation_id", id)
        .is("released_at", null);

      const range = `[${row.start_at as string},${row.expected_end_at as string})`;
      const { error: aErr } = await supabase.from("reservation_table_assignments").insert(
        uniqueIds.map((tableId) => ({
          reservation_id: id,
          table_id: tableId,
          reserved_range: range,
          assigned_by: scope.userId,
        })),
      );
      if (aErr) {
        if (aErr.code === "23P01") {
          throw new ApiError(
            409,
            "RESERVATION_TABLE_CONFLICT",
            "A table is already reserved for an overlapping time window.",
          );
        }
        throw new ApiError(500, "RESERVATION_ASSIGN_FAILED", aErr.message);
      }
      await supabase
        .from("reservations")
        .update({ assigned_table_id: uniqueIds[0], updated_by: scope.userId })
        .eq("id", id);

      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "reservation",
        resourceId: id,
        action: "reservation_tables_assigned",
        before: { tableIds: previous },
        after: { tableIds: uniqueIds, capacityOverride: overrideCapacity },
      });
      return toReservation(await loadReservationRow(id), uniqueIds);
    },

    async seatReservation(scope, id, input) {
      const row = await loadReservationRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      return seatViaRpc(scope, {
        branchId: row.branch_id as string,
        source: "reservation",
        reservationId: id,
        tableIds: input.tableIds,
        serverUserId: input.serverUserId ?? null,
        overrideCapacity: input.overrideCapacity ?? false,
      });
    },

    async addWaitlistEntry(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const estimated =
        input.quotedWaitMinutes != null
          ? new Date(Date.now() + input.quotedWaitMinutes * 60_000).toISOString()
          : null;
      const { data, error } = await getClient()
        .from("waitlist_entries")
        .insert({
          branch_id: input.branchId,
          guest_name: input.guestName.trim(),
          guest_phone: input.guestPhone ?? null,
          party_size: input.partySize,
          requested_area_id: input.requestedAreaId ?? null,
          accessibility_required: input.accessibilityRequired ?? false,
          high_chair_count: input.highChairCount ?? 0,
          quoted_wait_minutes: input.quotedWaitMinutes ?? null,
          estimated_seat_at: estimated,
          notes: input.notes ?? null,
          created_by: scope.userId,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "WAITLIST_CREATE_FAILED", error.message);
      await audit({
        branchId: input.branchId,
        actorUserId: scope.userId,
        resourceType: "waitlist",
        resourceId: data.id as string,
        action: "waitlist_added",
        after: { partySize: input.partySize },
      });
      return toWaitlist(data as Record<string, unknown>);
    },

    async listWaitlist(scope, filters) {
      assertBranchInScope(scope, filters.branchId);
      let query = getClient()
        .from("waitlist_entries")
        .select("*", { count: "exact" })
        .eq("branch_id", filters.branchId);
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      query = query
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .range(filters.offset, filters.offset + filters.limit - 1);
      const { data, error, count } = await query;
      if (error) throw new ApiError(500, "WAITLIST_LIST_FAILED", error.message);
      const rows = (data ?? []) as Record<string, unknown>[];
      return { entries: rows.map(toWaitlist), total: count ?? rows.length };
    },

    async updateWaitlistEntry(scope, id, patch) {
      const row = await loadWaitlistRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      if (!["waiting", "notified", "arrived"].includes(row.status as string)) {
        throw new ApiError(409, "WAITLIST_NOT_EDITABLE", "Waitlist entry is finalised.");
      }
      const update: Record<string, unknown> = {};
      if (patch.quotedWaitMinutes !== undefined) {
        update.quoted_wait_minutes = patch.quotedWaitMinutes;
        update.estimated_seat_at =
          patch.quotedWaitMinutes != null
            ? new Date(Date.now() + patch.quotedWaitMinutes * 60_000).toISOString()
            : null;
      }
      if (patch.notes !== undefined) update.notes = patch.notes;
      if (patch.partySize !== undefined) update.party_size = patch.partySize;
      const { data, error } = await getClient()
        .from("waitlist_entries")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "WAITLIST_UPDATE_FAILED", error.message);
      return toWaitlist(data as Record<string, unknown>);
    },

    async transitionWaitlistEntry(scope, id, action) {
      const row = await loadWaitlistRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      const from = row.status as WaitlistStatus;
      const target: WaitlistStatus =
        action === "notify"
          ? "notified"
          : action === "arrive"
            ? "arrived"
            : action === "cancel"
              ? "cancelled"
              : action === "left"
                ? "left"
                : "expired";
      const allowed = WAITLIST_TRANSITIONS[from] ?? [];
      if (!allowed.includes(target)) {
        throw new ApiError(409, "WAITLIST_TRANSITION_INVALID", `Waitlist cannot move from ${from} to ${target}.`);
      }
      const nowIso = new Date().toISOString();
      const update: Record<string, unknown> = { status: target };
      if (target === "notified") update.notified_at = nowIso;
      if (target === "arrived") update.arrived_at = nowIso;
      if (["cancelled", "left", "expired"].includes(target)) update.cancelled_at = nowIso;
      const { data, error } = await getClient()
        .from("waitlist_entries")
        .update(update)
        .eq("id", id)
        .eq("status", from)
        .select("*")
        .maybeSingle();
      if (error) throw new ApiError(500, "WAITLIST_TRANSITION_FAILED", error.message);
      if (!data) {
        throw new ApiError(409, "WAITLIST_TRANSITION_CONFLICT", "Waitlist entry changed concurrently. Retry.");
      }

      if (target === "notified") {
        // Honest outbox record — no messaging provider is configured.
        await getClient().from("reservation_communications").insert({
          branch_id: row.branch_id,
          waitlist_id: id,
          message_type: "waitlist_ready",
          channel: "none",
          status: "provider_unavailable",
          created_by: scope.userId,
        });
      }

      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "waitlist",
        resourceId: id,
        action: `waitlist_${action}`,
        before: { status: from },
        after: { status: target },
      });
      return toWaitlist(data as Record<string, unknown>);
    },

    async seatWaitlistEntry(scope, id, input) {
      const row = await loadWaitlistRow(id);
      assertBranchInScope(scope, row.branch_id as string);
      return seatViaRpc(scope, {
        branchId: row.branch_id as string,
        source: "waitlist",
        waitlistId: id,
        tableIds: input.tableIds,
        serverUserId: input.serverUserId ?? null,
        overrideCapacity: input.overrideCapacity ?? false,
      });
    },

    async getDailyReport(scope, branchId, date) {
      assertBranchInScope(scope, branchId);
      const supabase = getClient();

      const { data: branchRow, error: branchErr } = await supabase
        .from("branches")
        .select("timezone")
        .eq("id", branchId)
        .maybeSingle();
      if (branchErr) throw new ApiError(500, "RESERVATION_REPORT_FAILED", branchErr.message);
      if (!branchRow) throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found.");
      const timezone = assertValidIanaTimezone(
        typeof branchRow.timezone === "string" && branchRow.timezone.trim()
          ? branchRow.timezone
          : "Asia/Karachi",
      );

      const { data, error } = await supabase
        .from("reservations")
        .select("reservation_status, booking_channel, party_size")
        .eq("branch_id", branchId)
        .eq("reservation_date", date);
      if (error) throw new ApiError(500, "RESERVATION_REPORT_FAILED", error.message);
      const rows = (data ?? []) as { reservation_status: string; booking_channel: string; party_size: number }[];

      const byStatus: Record<string, number> = {};
      const byChannel: Record<string, number> = {};
      let covers = 0;
      let seatedCovers = 0;
      for (const r of rows) {
        byStatus[r.reservation_status] = (byStatus[r.reservation_status] ?? 0) + 1;
        byChannel[r.booking_channel] = (byChannel[r.booking_channel] ?? 0) + 1;
        covers += r.party_size;
        if (["seated", "completed"].includes(r.reservation_status)) seatedCovers += r.party_size;
      }

      const { startUtc, endUtc } = businessDayUtcBounds(date, timezone);
      const { data: walkIns } = await supabase
        .from("dine_in_sessions")
        .select("id, party_size, reservation_id")
        .eq("branch_id", branchId)
        .gte("opened_at", startUtc)
        .lt("opened_at", endUtc);
      const sessions = (walkIns ?? []) as { id: string; party_size: number | null; reservation_id: string | null }[];
      const walkInSessions = sessions.filter((s) => !s.reservation_id);

      return {
        date,
        branchId,
        timezone,
        totalReservations: rows.length,
        byStatus,
        byChannel,
        covers,
        seatedCovers,
        noShows: byStatus["no_show"] ?? 0,
        cancellations: byStatus["cancelled"] ?? 0,
        diningSessions: sessions.length,
        walkInSessions: walkInSessions.length,
        reservationSessions: sessions.length - walkInSessions.length,
      };
    },
  };
}
