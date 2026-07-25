import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";
import { mapD3RpcError } from "../reservations/management.js";

/**
 * D3 — dining-session table service: walk-in seating, session lifecycle,
 * atomic table transfer, server assignment, bill request, close, and the
 * aggregated live floor state (single branch-scoped endpoint, no N+1).
 */

export const SESSION_SERVICE_STATUSES = [
  "waiting_to_seat",
  "seated",
  "ordering",
  "dining",
  "bill_requested",
  "payment_pending",
  "completed",
  "cancelled",
  "abandoned",
] as const;
export type SessionServiceStatus = (typeof SESSION_SERVICE_STATUSES)[number];

export interface DiningSessionRecord {
  id: string;
  branchId: string;
  sessionNumber: string | null;
  status: string;
  serviceStatus: SessionServiceStatus;
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
  notes: string | null;
  tableIds: string[];
}

export interface LiveFloorState {
  branchId: string;
  floors: unknown[];
  areas: unknown[];
  tables: unknown[];
  activeSessions: unknown[];
  upcomingReservations: unknown[];
  waitlistCount: number;
  conflicts: { tableId: string; reason: string }[];
  lastUpdatedAt: string;
}

export interface TableServiceOperations {
  seatWalkIn(
    scope: BranchActorScope,
    input: {
      branchId: string;
      tableIds: string[];
      partySize: number;
      guestName: string;
      serverUserId?: string | null;
      overrideCapacity?: boolean;
    },
  ): Promise<{ sessionId: string; sessionNumber: string }>;
  listActiveSessions(scope: BranchActorScope, branchId: string): Promise<DiningSessionRecord[]>;
  getSession(scope: BranchActorScope, sessionId: string): Promise<
    DiningSessionRecord & {
      servers: { userId: string; role: string; assignedAt: string }[];
      orders: { id: string; orderNumber: string; status: string; totalAmount: number }[];
      bills: { id: string; billNumber: string; status: string; grandTotal: number }[];
    }
  >;
  transferTables(
    scope: BranchActorScope,
    sessionId: string,
    input: { addTableIds?: string[]; removeTableIds?: string[]; reason?: string },
  ): Promise<{ sessionId: string; tableIds: string[] }>;
  assignServer(
    scope: BranchActorScope,
    sessionId: string,
    input: { userId: string; role?: "primary" | "support" },
  ): Promise<void>;
  requestBill(scope: BranchActorScope, sessionId: string): Promise<DiningSessionRecord>;
  closeSession(
    scope: BranchActorScope,
    sessionId: string,
    input: { overrideOpenBill?: boolean; note?: string },
  ): Promise<{ sessionId: string; releasedTableIds: string[] }>;
  cancelSession(scope: BranchActorScope, sessionId: string, reason?: string): Promise<void>;
  getLiveFloorState(scope: BranchActorScope, branchId: string): Promise<LiveFloorState>;
}

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
    throw new ApiError(403, "SESSION_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

type SessionRow = Record<string, unknown>;

function toSession(row: SessionRow, tableIds: string[] = []): DiningSessionRecord {
  return {
    id: row.id as string,
    branchId: row.branch_id as string,
    sessionNumber: (row.session_number as string | null) ?? null,
    status: row.status as string,
    serviceStatus: row.service_status as SessionServiceStatus,
    partySize: (row.party_size as number | null) ?? (row.guest_count as number | null) ?? null,
    guestName: (row.guest_name as string | null) ?? null,
    reservationId: (row.reservation_id as string | null) ?? null,
    waitlistId: (row.waitlist_id as string | null) ?? null,
    primaryServerUserId: (row.primary_server_user_id as string | null) ?? null,
    openedAt: row.opened_at as string,
    seatedAt: (row.seated_at as string | null) ?? null,
    firstOrderAt: (row.first_order_at as string | null) ?? null,
    billRequestedAt: (row.bill_requested_at as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    tableIds,
  };
}

const SESSION_SELECT =
  "id, branch_id, restaurant_table_id, status, service_status, session_number, reservation_id, waitlist_id, customer_id, primary_server_user_id, party_size, guest_name, guest_count, opened_at, seated_at, first_order_at, bill_requested_at, closed_at, notes, created_at, updated_at";

export function createTableServiceOperations(envStatus: EnvironmentStatus): TableServiceOperations {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadSession(sessionId: string): Promise<SessionRow> {
    const { data, error } = await getClient()
      .from("dine_in_sessions")
      .select(SESSION_SELECT)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw new ApiError(500, "SESSION_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "SESSION_NOT_FOUND", "Dining session not found.");
    return data as SessionRow;
  }

  async function sessionTableIds(sessionIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (sessionIds.length === 0) return result;
    const { data } = await getClient()
      .from("dining_session_tables")
      .select("dine_in_session_id, table_id")
      .in("dine_in_session_id", sessionIds)
      .is("released_at", null);
    for (const row of (data ?? []) as { dine_in_session_id: string; table_id: string }[]) {
      const list = result.get(row.dine_in_session_id) ?? [];
      list.push(row.table_id);
      result.set(row.dine_in_session_id, list);
    }
    return result;
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

  return {
    async seatWalkIn(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const { data, error } = await getClient().rpc("seat_party_atomic", {
        p_branch_id: input.branchId,
        p_source: "walk_in",
        p_reservation_id: null,
        p_waitlist_id: null,
        p_table_ids: input.tableIds,
        p_party_size: input.partySize,
        p_guest_name: input.guestName,
        p_server_user_id: input.serverUserId ?? null,
        p_actor_user_id: scope.userId,
        p_override_capacity: input.overrideCapacity ?? false,
      });
      if (error) mapD3RpcError(error);
      const row = data as { id: string; sessionNumber: string };
      return { sessionId: row.id, sessionNumber: row.sessionNumber };
    },

    async listActiveSessions(scope, branchId) {
      assertBranchInScope(scope, branchId);
      const { data, error } = await getClient()
        .from("dine_in_sessions")
        .select(SESSION_SELECT)
        .eq("branch_id", branchId)
        .in("service_status", ["seated", "ordering", "dining", "bill_requested", "payment_pending"])
        .order("opened_at", { ascending: true });
      if (error) throw new ApiError(500, "SESSION_LIST_FAILED", error.message);
      const rows = (data ?? []) as SessionRow[];
      const tables = await sessionTableIds(rows.map((r) => r.id as string));
      return rows.map((r) => toSession(r, tables.get(r.id as string) ?? []));
    },

    async getSession(scope, sessionId) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      const supabase = getClient();
      const [tables, serversRes, ordersRes, billsRes] = await Promise.all([
        sessionTableIds([sessionId]),
        supabase
          .from("dining_session_servers")
          .select("user_id, role, assigned_at")
          .eq("dine_in_session_id", sessionId)
          .is("released_at", null),
        supabase
          .from("orders")
          .select("id, order_number, status, total_amount")
          .eq("dine_in_session_id", sessionId)
          .order("created_at", { ascending: true }),
        supabase
          .from("restaurant_bills")
          .select("id, bill_number, status, grand_total")
          .eq("dine_in_session_id", sessionId),
      ]);
      return {
        ...toSession(row, tables.get(sessionId) ?? []),
        servers: ((serversRes.data ?? []) as { user_id: string; role: string; assigned_at: string }[]).map((s) => ({
          userId: s.user_id,
          role: s.role,
          assignedAt: s.assigned_at,
        })),
        orders: ((ordersRes.data ?? []) as {
          id: string;
          order_number: string;
          status: string;
          total_amount: number | string;
        }[]).map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          status: o.status,
          totalAmount: Number(o.total_amount),
        })),
        bills: ((billsRes.data ?? []) as {
          id: string;
          bill_number: string;
          status: string;
          grand_total: number | string;
        }[]).map((b) => ({
          id: b.id,
          billNumber: b.bill_number,
          status: b.status,
          grandTotal: Number(b.grand_total),
        })),
      };
    },

    async transferTables(scope, sessionId, input) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      const { data, error } = await getClient().rpc("transfer_session_tables_atomic", {
        p_session_id: sessionId,
        p_add_table_ids: input.addTableIds ?? [],
        p_remove_table_ids: input.removeTableIds ?? [],
        p_reason: input.reason ?? null,
        p_actor_user_id: scope.userId,
      });
      if (error) mapD3RpcError(error);
      const result = data as { id: string; tableIds: string[] };
      return { sessionId: result.id, tableIds: result.tableIds };
    },

    async assignServer(scope, sessionId, input) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      if (["completed", "cancelled", "abandoned"].includes(row.service_status as string)) {
        throw new ApiError(409, "SESSION_NOT_ACTIVE", "Dining session is not active.");
      }
      const supabase = getClient();
      const role = input.role ?? "primary";

      // The server must hold an active role in the session's branch.
      const { data: membership } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", input.userId)
        .eq("branch_id", row.branch_id as string)
        .limit(1);
      if ((membership ?? []).length === 0) {
        throw new ApiError(409, "SERVER_NOT_IN_BRANCH", "Server has no active role in this branch.");
      }

      const nowIso = new Date().toISOString();
      let previousPrimary: string | null = null;
      if (role === "primary") {
        const { data: existing } = await supabase
          .from("dining_session_servers")
          .select("id, user_id")
          .eq("dine_in_session_id", sessionId)
          .eq("role", "primary")
          .is("released_at", null)
          .maybeSingle();
        if (existing) {
          previousPrimary = existing.user_id as string;
          await supabase
            .from("dining_session_servers")
            .update({ released_at: nowIso })
            .eq("id", existing.id as string);
        }
      }
      const { error } = await supabase.from("dining_session_servers").insert({
        dine_in_session_id: sessionId,
        user_id: input.userId,
        role,
        assigned_by: scope.userId,
      });
      if (error) throw new ApiError(500, "SERVER_ASSIGN_FAILED", error.message);
      if (role === "primary") {
        await supabase
          .from("dine_in_sessions")
          .update({ primary_server_user_id: input.userId, updated_by: scope.userId })
          .eq("id", sessionId);
      }
      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "dining_session",
        resourceId: sessionId,
        action: "server_assigned",
        before: previousPrimary ? { primaryServerUserId: previousPrimary } : null,
        after: { userId: input.userId, role },
      });
    },

    async requestBill(scope, sessionId) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      const from = row.service_status as string;
      if (!["seated", "ordering", "dining"].includes(from)) {
        throw new ApiError(409, "SESSION_BILL_REQUEST_INVALID", `Cannot request bill from ${from}.`);
      }
      const nowIso = new Date().toISOString();
      const supabase = getClient();
      const { data, error } = await supabase
        .from("dine_in_sessions")
        .update({
          service_status: "bill_requested",
          status: "billed",
          bill_requested_at: nowIso,
          updated_by: scope.userId,
        })
        .eq("id", sessionId)
        .eq("service_status", from)
        .select(SESSION_SELECT)
        .maybeSingle();
      if (error) throw new ApiError(500, "SESSION_BILL_REQUEST_FAILED", error.message);
      if (!data) {
        throw new ApiError(409, "SESSION_TRANSITION_CONFLICT", "Session changed concurrently. Retry.");
      }

      const tables = await sessionTableIds([sessionId]);
      const ids = tables.get(sessionId) ?? [];
      if (ids.length > 0) {
        await supabase
          .from("restaurant_tables")
          .update({ operational_status: "bill_requested" })
          .in("id", ids)
          .in("operational_status", ["occupied", "ordering", "served"]);
      }

      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "dining_session",
        resourceId: sessionId,
        action: "bill_requested",
        before: { serviceStatus: from },
        after: { serviceStatus: "bill_requested" },
      });
      return toSession(data as SessionRow, ids);
    },

    async closeSession(scope, sessionId, input) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      if (input.overrideOpenBill && !input.note?.trim()) {
        throw new ApiError(
          400,
          "UNPAID_OVERRIDE_REASON_REQUIRED",
          "Unpaid close override requires an audited reason.",
        );
      }
      const { data, error } = await getClient().rpc("close_dining_session_atomic", {
        p_session_id: sessionId,
        p_actor_user_id: scope.userId,
        p_override: input.overrideOpenBill ?? false,
        p_note: input.note ?? null,
      });
      if (error) mapD3RpcError(error);
      const result = data as { id: string; releasedTableIds: string[] };
      return { sessionId: result.id, releasedTableIds: result.releasedTableIds ?? [] };
    },

    async cancelSession(scope, sessionId, reason) {
      const row = await loadSession(sessionId);
      assertBranchInScope(scope, row.branch_id as string);
      if (["completed", "cancelled", "abandoned"].includes(row.service_status as string)) {
        throw new ApiError(409, "SESSION_ALREADY_CLOSED", "Dining session is already finalised.");
      }
      const supabase = getClient();
      // Cancel is only for sessions without attached orders — use close otherwise.
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("dine_in_session_id", sessionId)
        .limit(1);
      if ((orders ?? []).length > 0) {
        throw new ApiError(409, "SESSION_HAS_ORDERS", "Session has orders — close it instead of cancelling.");
      }
      const nowIso = new Date().toISOString();
      const { data: tables } = await supabase
        .from("dining_session_tables")
        .select("table_id")
        .eq("dine_in_session_id", sessionId)
        .is("released_at", null);
      const ids = ((tables ?? []) as { table_id: string }[]).map((t) => t.table_id);
      await supabase
        .from("dining_session_tables")
        .update({ released_at: nowIso })
        .eq("dine_in_session_id", sessionId)
        .is("released_at", null);
      if (ids.length > 0) {
        await supabase
          .from("restaurant_tables")
          .update({ operational_status: "available", status: "available" })
          .in("id", ids);
      }
      await supabase
        .from("dine_in_sessions")
        .update({
          status: "cancelled",
          service_status: "cancelled",
          closed_at: nowIso,
          updated_by: scope.userId,
        })
        .eq("id", sessionId);
      await audit({
        branchId: row.branch_id as string,
        actorUserId: scope.userId,
        resourceType: "dining_session",
        resourceId: sessionId,
        action: "session_cancelled",
        after: { releasedTableIds: ids },
        note: reason ?? null,
      });
    },

    async getLiveFloorState(scope, branchId) {
      assertBranchInScope(scope, branchId);
      const supabase = getClient();
      const nowIso = new Date().toISOString();
      const horizonIso = new Date(Date.now() + 4 * 60 * 60_000).toISOString();

      const [floorsRes, areasRes, tablesRes, sessionsRes, reservationsRes, waitlistRes] = await Promise.all([
        supabase
          .from("restaurant_floors")
          .select("id, code, display_name, sort_order, is_active")
          .eq("branch_id", branchId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("service_areas")
          .select("id, floor_id, code, display_name, color_token, is_active, sort_order")
          .eq("branch_id", branchId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("restaurant_tables")
          .select(
            "id, floor_id, service_area_id, table_number, display_name, capacity, capacity_min, capacity_max, shape, position_x, position_y, width, height, rotation, is_accessible, high_chair_supported, is_active, operational_status",
          )
          .eq("branch_id", branchId)
          .order("table_number", { ascending: true }),
        supabase
          .from("dine_in_sessions")
          .select(SESSION_SELECT)
          .eq("branch_id", branchId)
          .in("service_status", ["seated", "ordering", "dining", "bill_requested", "payment_pending"]),
        supabase
          .from("reservations")
          .select(
            "id, reservation_number, guest_name, party_size, start_at, expected_end_at, reservation_status, assigned_table_id",
          )
          .eq("branch_id", branchId)
          .in("reservation_status", ["pending", "confirmed", "arrived"])
          .gte("expected_end_at", nowIso)
          .lte("start_at", horizonIso)
          .order("start_at", { ascending: true }),
        supabase
          .from("waitlist_entries")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", branchId)
          .in("status", ["waiting", "notified", "arrived"]),
      ]);
      if (tablesRes.error) throw new ApiError(500, "LIVE_FLOOR_FAILED", tablesRes.error.message);

      const sessions = (sessionsRes.data ?? []) as SessionRow[];
      const sessionTables = await sessionTableIds(sessions.map((s) => s.id as string));

      const tableToSession = new Map<string, SessionRow>();
      for (const s of sessions) {
        for (const tid of sessionTables.get(s.id as string) ?? []) {
          tableToSession.set(tid, s);
        }
      }

      // Server names for active sessions (single query).
      const serverIds = [
        ...new Set(
          sessions
            .map((s) => s.primary_server_user_id as string | null)
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      const serverNames = new Map<string, string>();
      if (serverIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name").in("id", serverIds);
        for (const u of (users ?? []) as { id: string; full_name: string | null }[]) {
          serverNames.set(u.id, u.full_name ?? "");
        }
      }

      const conflicts: { tableId: string; reason: string }[] = [];
      const reservations = (reservationsRes.data ?? []) as Record<string, unknown>[];
      for (const r of reservations) {
        const tableId = r.assigned_table_id as string | null;
        if (!tableId) continue;
        const startsSoon = new Date(r.start_at as string).getTime() - Date.now() < 30 * 60_000;
        if (startsSoon && tableToSession.has(tableId)) {
          conflicts.push({
            tableId,
            reason: `Reservation ${r.reservation_number as string} starts soon but the table is occupied.`,
          });
        }
      }

      return {
        branchId,
        floors: floorsRes.data ?? [],
        areas: areasRes.data ?? [],
        tables: ((tablesRes.data ?? []) as Record<string, unknown>[]).map((t) => {
          const session = tableToSession.get(t.id as string) ?? null;
          return {
            ...t,
            session: session
              ? {
                  id: session.id,
                  sessionNumber: session.session_number,
                  guestName: session.guest_name,
                  partySize: session.party_size ?? session.guest_count,
                  serviceStatus: session.service_status,
                  openedAt: session.opened_at,
                  seatedAt: session.seated_at,
                  billRequestedAt: session.bill_requested_at,
                  primaryServerUserId: session.primary_server_user_id,
                  primaryServerName: session.primary_server_user_id
                    ? (serverNames.get(session.primary_server_user_id as string) ?? null)
                    : null,
                }
              : null,
          };
        }),
        activeSessions: sessions.map((s) => toSession(s, sessionTables.get(s.id as string) ?? [])),
        upcomingReservations: reservations,
        waitlistCount: waitlistRes.count ?? 0,
        conflicts,
        lastUpdatedAt: nowIso,
      };
    },
  };
}
