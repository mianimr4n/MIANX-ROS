import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { attachConfirmedDineInOrderToBill } from "../bills/restaurant-bills.js";
import {
  cancelKitchenTicketForOrder,
  createKitchenTicketForConfirmedOrder,
} from "../kitchen/tickets.js";
import { parseNumber } from "./pricing.js";
import {
  planTransition,
  type BranchOrderAction,
} from "./transitions.js";

/** Branch-scope + role snapshot derived only from the DB-backed AuthPrincipal. */
export interface BranchActorScope {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
}

export interface BranchOrderListFilters {
  branchId?: string;
  status?: string;
  orderType?: string;
  orderSource?: string;
  /** Exact or partial order number match (case-insensitive). */
  orderNumber?: string;
  limit: number;
  offset: number;
}

export const ORDER_SOURCES = ["website", "whatsapp", "mobile", "pos", "admin"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export type AdminOperationalAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
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
  recentOrders: SafeBranchOrderListItem[];
  branchPerformance: Array<{
    branchId: string;
    branchCode: string | null;
    todayOrders: number;
    todayGrossSales: number;
    activeOrders: number;
  }> | null;
  alerts: AdminOperationalAlert[];
  insights: string[];
};

export interface SafeBranchOrderListItem {
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
}

export interface SafeBranchOrderListResult {
  orders: SafeBranchOrderListItem[];
  pagination: { limit: number; offset: number; total: number; returned: number };
}

export interface SafeStatusLogEntry {
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  actorUserId: string | null;
  reasonCode: string | null;
  note: string | null;
  createdAt: string;
}

export interface SafeBranchOrderDetail extends SafeBranchOrderListItem {
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
  statusHistory: SafeStatusLogEntry[];
}

export interface TransitionResultView {
  orderId: string;
  orderNumber: string;
  status: string;
  action: BranchOrderAction;
  reasonCode: string | null;
  idempotentReplay: boolean;
}

export interface BranchOrderManagementDataSource {
  listBranchOrders(
    scope: BranchActorScope,
    filters: BranchOrderListFilters,
  ): Promise<SafeBranchOrderListResult>;
  getBranchOrderDetail(scope: BranchActorScope, orderId: string): Promise<SafeBranchOrderDetail>;
  getOperationsDashboard(
    scope: BranchActorScope,
    filters: { branchId?: string },
  ): Promise<AdminOperationsDashboard>;
  transitionOrder(params: {
    scope: BranchActorScope;
    orderId: string;
    action: BranchOrderAction;
    reasonCode?: string | null;
    note?: string | null;
  }): Promise<TransitionResultView>;
}

const LIST_COLUMNS =
  "id, order_number, status, order_type, order_source, branch_id, contact_name, contact_phone, payment_status, total_amount, created_at, updated_at, branch:branches(branch_code), items:order_items(count)";

export class BranchOrderManagementConfigurationError extends Error {}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new BranchOrderManagementConfigurationError("Supabase service role configuration is missing.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** first embedded aggregate row's count, e.g. items:order_items(count). */
function embeddedCount(value: unknown): number {
  if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
    return Number((value[0] as { count?: number }).count ?? 0);
  }
  return 0;
}

function branchCodeOf(value: unknown): string | null {
  if (Array.isArray(value)) {
    return (value[0] as { branch_code?: string } | undefined)?.branch_code ?? null;
  }
  if (value && typeof value === "object") {
    return (value as { branch_code?: string }).branch_code ?? null;
  }
  return null;
}

function assertBranchInScope(scope: BranchActorScope, branchId: string): void {
  if (scope.isSuperAdmin) {
    return;
  }
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "ORDER_ACCESS_DENIED", "Order belongs to another branch.");
  }
}

/** Calendar day start in Pakistan Standard Time (UTC+5), as ISO-8601. */
export function startOfTodayKarachiIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Unable to resolve Asia/Karachi calendar day.");
  }
  return `${year}-${month}-${day}T00:00:00+05:00`;
}

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "ready", "dispatched"]);
const PENDING_ALERT_MS = 15 * 60 * 1000;
const PREPARING_ALERT_MS = 30 * 60 * 1000;
const READY_ALERT_MS = 10 * 60 * 1000;

function resolveScopedBranchIds(scope: BranchActorScope, branchId?: string): string[] | "all" | "none" {
  if (scope.isSuperAdmin) {
    if (branchId) return [branchId];
    return "all";
  }
  if (scope.branchIds.length === 0) return "none";
  if (branchId) {
    assertBranchInScope(scope, branchId);
    return [branchId];
  }
  return scope.branchIds;
}

function buildDashboardFromRows(
  rows: Array<Record<string, unknown>>,
  options: { branchId: string | null; includeBranchPerformance: boolean; now: Date },
): AdminOperationsDashboard {
  const dayStart = startOfTodayKarachiIso(options.now);
  const dayStartMs = new Date(dayStart).getTime();
  const nowMs = options.now.getTime();

  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    dispatched: 0,
    completed: 0,
    cancelled: 0,
  };
  const sourceMap = new Map<string, number>();
  const branchMap = new Map<
    string,
    { branchId: string; branchCode: string | null; todayOrders: number; todayGrossSales: number; activeOrders: number }
  >();

  let todayOrders = 0;
  let todayGrossSales = 0;
  let todayNonCancelled = 0;
  let activeOrders = 0;
  let kitchenWaiting = 0;
  let activeDeliveries = 0;
  const alerts: AdminOperationalAlert[] = [];

  for (const row of rows) {
    const status = String(row.status ?? "");
    const createdAt = String(row.created_at ?? "");
    const createdMs = new Date(createdAt).getTime();
    const totalAmount = parseNumber(row.total_amount as number | string);
    const branchId = String(row.branch_id ?? "");
    const branchCode = branchCodeOf(row.branch);
    const orderNumber = String(row.order_number ?? "");
    const orderId = String(row.id ?? "");
    const source = String(row.order_source ?? "unknown");

    if (status in statusCounts) {
      statusCounts[status] += 1;
    }

    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);

    if (!branchId) {
      alerts.push({
        id: `missing-branch-${orderId}`,
        severity: "warning",
        code: "MISSING_BRANCH_LINK",
        message: `Order ${orderNumber || orderId} is missing branch linkage.`,
        orderId,
        orderNumber: orderNumber || undefined,
      });
    }

    const isToday = Number.isFinite(createdMs) && createdMs >= dayStartMs;
    if (isToday) {
      todayOrders += 1;
      if (status !== "cancelled") {
        todayGrossSales += totalAmount;
        todayNonCancelled += 1;
      }
    }

    if (ACTIVE_STATUSES.has(status)) {
      activeOrders += 1;
    }
    if (status === "confirmed" || status === "preparing") {
      kitchenWaiting += 1;
    }
    if (status === "dispatched") {
      activeDeliveries += 1;
    }

    if (options.includeBranchPerformance && branchId) {
      const entry = branchMap.get(branchId) ?? {
        branchId,
        branchCode,
        todayOrders: 0,
        todayGrossSales: 0,
        activeOrders: 0,
      };
      if (isToday) {
        entry.todayOrders += 1;
        if (status !== "cancelled") {
          entry.todayGrossSales += totalAmount;
        }
      }
      if (ACTIVE_STATUSES.has(status)) {
        entry.activeOrders += 1;
      }
      branchMap.set(branchId, entry);
    }

    if (Number.isFinite(createdMs)) {
      const age = nowMs - createdMs;
      if (status === "pending" && age >= PENDING_ALERT_MS) {
        alerts.push({
          id: `pending-${orderId}`,
          severity: age >= PENDING_ALERT_MS * 2 ? "critical" : "warning",
          code: "PENDING_TOO_LONG",
          message: `Order ${orderNumber} has been pending for more than 15 minutes.`,
          orderId,
          orderNumber,
        });
      }
      if (status === "preparing" && age >= PREPARING_ALERT_MS) {
        alerts.push({
          id: `preparing-${orderId}`,
          severity: "warning",
          code: "PREPARING_TOO_LONG",
          message: `Order ${orderNumber} has been preparing for more than 30 minutes.`,
          orderId,
          orderNumber,
        });
      }
      if (status === "ready" && age >= READY_ALERT_MS) {
        alerts.push({
          id: `ready-${orderId}`,
          severity: "warning",
          code: "READY_AWAITING_DISPATCH",
          message: `Order ${orderNumber} is ready and waiting for dispatch.`,
          orderId,
          orderNumber,
        });
      }
    }
  }

  const recentOrders = [...rows]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 10)
    .map(toListItem);

  const insights: string[] = [];
  const pendingCount = statusCounts.pending ?? 0;
  if (pendingCount > 0) {
    insights.push(`${pendingCount} pending order${pendingCount === 1 ? "" : "s"} require attention.`);
  }
  if (alerts.length === 0 && activeOrders === 0) {
    insights.push("No active operational alerts in the current branch scope.");
  } else if (alerts.length > 0) {
    insights.push(`${alerts.length} operational alert${alerts.length === 1 ? "" : "s"} need review.`);
  }

  if (options.includeBranchPerformance && branchMap.size > 0) {
    const top = [...branchMap.values()].sort((a, b) => b.activeOrders - a.activeOrders)[0];
    if (top && top.activeOrders > 0) {
      const label = top.branchCode ?? top.branchId;
      insights.push(`${label} has the highest active order volume.`);
    }
  }

  if (todayOrders === 0) {
    insights.push("No orders recorded since the start of the Pakistan business day.");
  }

  return {
    generatedAt: options.now.toISOString(),
    timezone: "Asia/Karachi",
    dayStart,
    branchId: options.branchId,
    kpis: {
      todayOrders,
      todayGrossSales,
      activeOrders,
      averageOrderValue: todayNonCancelled > 0 ? todayGrossSales / todayNonCancelled : null,
      kitchenWaiting,
      activeDeliveries,
    },
    statusCounts,
    sourceBreakdown: [...sourceMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    recentOrders,
    branchPerformance: options.includeBranchPerformance
      ? [...branchMap.values()].sort((a, b) => b.todayOrders - a.todayOrders)
      : null,
    alerts: alerts.slice(0, 25),
    insights: insights.slice(0, 5),
  };
}

/**
 * Sprint 4.6 — keep deliveries lane aligned with admin dispatch/complete.
 * Errors are checked and propagated so callers can retry; idempotent replays also heal.
 * Full multi-row atomicity would require an RPC (deferred — no migration in this sprint).
 */
async function syncDeliveryLaneForOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  toStatus: string,
  now: string,
): Promise<void> {
  if (toStatus === "dispatched") {
    const { error } = await supabase
      .from("deliveries")
      .update({ status: "picked-up", picked_up_at: now, updated_at: now })
      .eq("order_id", orderId)
      .in("status", ["pending", "assigned"]);
    if (error) {
      throw new ApiError(500, "DELIVERY_SYNC_FAILED", error.message);
    }
    return;
  }
  if (toStatus === "completed") {
    const { error } = await supabase
      .from("deliveries")
      .update({ status: "delivered", delivered_at: now, updated_at: now })
      .eq("order_id", orderId)
      .in("status", ["pending", "assigned", "picked-up"]);
    if (error) {
      throw new ApiError(500, "DELIVERY_SYNC_FAILED", error.message);
    }
  }
}

function toListItem(row: Record<string, unknown>): SafeBranchOrderListItem {
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    status: row.status as string,
    orderType: row.order_type as string,
    orderSource: row.order_source as string,
    branchId: row.branch_id as string,
    branchCode: branchCodeOf(row.branch),
    contactName: row.contact_name as string,
    contactPhone: row.contact_phone as string,
    paymentStatus: row.payment_status as string,
    totalAmount: parseNumber(row.total_amount as number | string),
    itemCount: embeddedCount(row.items),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createSupabaseBranchOrderManagementDataSource(
  envStatus: EnvironmentStatus,
): BranchOrderManagementDataSource {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadOrderScope(supabase: SupabaseClient, orderId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, branch_id")
      .eq("id", orderId)
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
    }
    if (!data) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    return data as { id: string; order_number: string; status: string; branch_id: string };
  }

  return {
    async listBranchOrders(scope, filters) {
      const supabase = getClient();
      const branchScope = resolveScopedBranchIds(scope, filters.branchId);
      if (branchScope === "none") {
        return { orders: [], pagination: { limit: filters.limit, offset: filters.offset, total: 0, returned: 0 } };
      }

      let query = supabase.from("orders").select(LIST_COLUMNS, { count: "exact" });
      if (branchScope !== "all") {
        query = branchScope.length === 1 ? query.eq("branch_id", branchScope[0]!) : query.in("branch_id", branchScope);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.orderType) {
        query = query.eq("order_type", filters.orderType);
      }
      if (filters.orderSource) {
        query = query.eq("order_source", filters.orderSource);
      }
      if (filters.orderNumber) {
        const term = filters.orderNumber.trim();
        if (term) {
          query = query.ilike("order_number", `%${term}%`);
        }
      }

      query = query
        .order("created_at", { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error, count } = await query;
      if (error) {
        throw new ApiError(500, "ORDER_LIST_FAILED", error.message);
      }

      const orders = ((data ?? []) as Array<Record<string, unknown>>).map(toListItem);
      return {
        orders,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: count ?? orders.length,
          returned: orders.length,
        },
      };
    },

    async getOperationsDashboard(scope, filters) {
      const supabase = getClient();
      const now = new Date();
      const branchScope = resolveScopedBranchIds(scope, filters.branchId);
      if (branchScope === "none") {
        return buildDashboardFromRows([], {
          branchId: filters.branchId ?? null,
          includeBranchPerformance: Boolean(scope.isSuperAdmin && !filters.branchId),
          now,
        });
      }

      let query = supabase
        .from("orders")
        .select(
          "id, order_number, status, order_type, order_source, branch_id, contact_name, contact_phone, payment_status, total_amount, created_at, updated_at, branch:branches(branch_code), items:order_items(count)",
        );
      if (branchScope !== "all") {
        query = branchScope.length === 1 ? query.eq("branch_id", branchScope[0]!) : query.in("branch_id", branchScope);
      }

      // S1 bound: recent window covers active ops + today's volume without N+1 queries.
      query = query.order("created_at", { ascending: false }).limit(500);

      const { data, error } = await query;
      if (error) {
        throw new ApiError(500, "DASHBOARD_LOAD_FAILED", error.message);
      }

      const dayStartMs = new Date(startOfTodayKarachiIso(now)).getTime();
      const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => {
        const status = String(row.status ?? "");
        if (ACTIVE_STATUSES.has(status)) return true;
        const createdMs = new Date(String(row.created_at ?? "")).getTime();
        return Number.isFinite(createdMs) && createdMs >= dayStartMs;
      });

      return buildDashboardFromRows(rows, {
        branchId: filters.branchId ?? null,
        includeBranchPerformance: Boolean(scope.isSuperAdmin && !filters.branchId),
        now,
      });
    },

    async getBranchOrderDetail(scope, orderId) {
      const supabase = getClient();

      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `id, order_number, status, order_type, order_source, branch_id, contact_name, contact_phone,
           payment_status, subtotal, discount_amount, tax_amount, delivery_fee, total_amount,
           delivery_address, notes, cancel_reason_code, created_at, updated_at,
           branch:branches(branch_code),
           items:order_items(product_name, variant_name, quantity, unit_price, total_price, instructions, extras_snapshot),
           deliveries(status, delivery_address, assigned_at, picked_up_at, delivered_at),
           status_logs:order_status_logs(from_status, to_status, actor_type, actor_user_id, reason_code, note, created_at)`,
        )
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
      }
      if (!order) {
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      }

      assertBranchInScope(scope, order.branch_id as string);

      const deliveryRow = Array.isArray(order.deliveries) ? order.deliveries[0] : order.deliveries;
      const history = ((order.status_logs ?? []) as Array<Record<string, unknown>>)
        .map<SafeStatusLogEntry>((log) => ({
          fromStatus: (log.from_status as string | null) ?? null,
          toStatus: log.to_status as string,
          actorType: log.actor_type as string,
          actorUserId: (log.actor_user_id as string | null) ?? null,
          reasonCode: (log.reason_code as string | null) ?? null,
          note: (log.note as string | null) ?? null,
          createdAt: log.created_at as string,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      return {
        ...toListItem(order as Record<string, unknown>),
        subtotal: parseNumber(order.subtotal as number | string),
        discountAmount: parseNumber(order.discount_amount as number | string),
        taxAmount: parseNumber(order.tax_amount as number | string),
        deliveryFee: parseNumber(order.delivery_fee as number | string),
        deliveryAddress: (order.delivery_address as string | null) ?? null,
        notes: (order.notes as string | null) ?? null,
        cancelReasonCode: (order.cancel_reason_code as string | null) ?? null,
        items: ((order.items ?? []) as Array<Record<string, unknown>>).map((item) => ({
          productName: item.product_name as string,
          variantName: (item.variant_name as string | null) ?? null,
          quantity: item.quantity as number,
          unitPrice: parseNumber(item.unit_price as number | string),
          totalPrice: parseNumber(item.total_price as number | string),
          instructions: (item.instructions as string | null) ?? null,
          extras: (item.extras_snapshot as Array<{ slug: string; label: string; price: number }>) ?? [],
        })),
        delivery: deliveryRow
          ? {
              status: (deliveryRow as Record<string, unknown>).status as string,
              deliveryAddress: ((deliveryRow as Record<string, unknown>).delivery_address as string | null) ?? null,
              assignedAt: ((deliveryRow as Record<string, unknown>).assigned_at as string | null) ?? null,
              pickedUpAt: ((deliveryRow as Record<string, unknown>).picked_up_at as string | null) ?? null,
              deliveredAt: ((deliveryRow as Record<string, unknown>).delivered_at as string | null) ?? null,
            }
          : null,
        statusHistory: history,
      };
    },

    async transitionOrder({ scope, orderId, action, reasonCode, note }) {
      const supabase = getClient();
      const order = await loadOrderScope(supabase, orderId);

      assertBranchInScope(scope, order.branch_id);

      const plan = planTransition({
        action,
        currentStatus: order.status,
        actor: { isSuperAdmin: scope.isSuperAdmin, roles: scope.roles },
        reasonCode,
        note,
      });

      // Idempotent no-op: already at target status. No update, no new log — still heal delivery lane.
      if (plan.idempotentNoop) {
        if (plan.toStatus === "dispatched" || plan.toStatus === "completed") {
          await syncDeliveryLaneForOrderStatus(supabase, order.id, plan.toStatus, new Date().toISOString());
        }
        return {
          orderId: order.id,
          orderNumber: order.order_number,
          status: plan.toStatus,
          action,
          reasonCode: null,
          idempotentReplay: true,
        };
      }

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status: plan.toStatus, updated_at: now };
      if (plan.toStatus === "cancelled") {
        patch.cancel_reason_code = plan.reasonCode;
        patch.cancel_note = plan.note;
      }

      // Optimistic lock: only transition if status is still one of the allowed source states.
      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", order.id)
        .in("status", plan.allowedFromStatuses)
        .select("order_number, status")
        .maybeSingle();

      if (updateError) {
        throw new ApiError(500, "ORDER_TRANSITION_FAILED", updateError.message);
      }

      if (!updated) {
        // Another actor changed the order between read and write. Re-read to classify.
        const { data: fresh } = await supabase
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .maybeSingle();
        if (fresh && (fresh as { status: string }).status === plan.toStatus) {
          // Concurrent identical transition already applied it — treat as idempotent, no duplicate log.
          if (plan.toStatus === "dispatched" || plan.toStatus === "completed") {
            await syncDeliveryLaneForOrderStatus(supabase, order.id, plan.toStatus, now);
          }
          return {
            orderId: order.id,
            orderNumber: order.order_number,
            status: plan.toStatus,
            action,
            reasonCode: null,
            idempotentReplay: true,
          };
        }
        throw new ApiError(
          409,
          "ORDER_STATE_CONFLICT",
          "Order status changed concurrently. Reload and retry.",
        );
      }

      // Append immutable audit log ONLY after a real state change.
      const { error: logError } = await supabase.from("order_status_logs").insert({
        order_id: order.id,
        from_status: plan.fromStatus,
        to_status: plan.toStatus,
        actor_type: "staff",
        actor_user_id: scope.userId,
        reason_code: plan.reasonCode,
        note: plan.note,
      });
      if (logError) {
        throw new ApiError(500, "ORDER_AUDIT_LOG_FAILED", logError.message);
      }

      // DB-R5 Option B: create kitchen ticket when order becomes confirmed (idempotent).
      // DB-R6 Option B: attach dine-in order to session open bill (idempotent; skips delivery/pickup).
      if (plan.toStatus === "confirmed") {
        await createKitchenTicketForConfirmedOrder(supabase, order.id);
        await attachConfirmedDineInOrderToBill(supabase, order.id);
      }

      if (plan.toStatus === "cancelled") {
        await supabase
          .from("deliveries")
          .update({ status: "cancelled", updated_at: now })
          .eq("order_id", order.id)
          .neq("status", "delivered");
        await cancelKitchenTicketForOrder(supabase, order.id);
      }

      // Sprint 4.6 — staff dispatch/complete keeps deliveries lane aligned when present.
      if (plan.toStatus === "dispatched" || plan.toStatus === "completed") {
        await syncDeliveryLaneForOrderStatus(supabase, order.id, plan.toStatus, now);
      }

      return {
        orderId: order.id,
        orderNumber: (updated as { order_number: string }).order_number,
        status: plan.toStatus,
        action,
        reasonCode: plan.reasonCode,
        idempotentReplay: false,
      };
    },
  };
}

function unavailable(): never {
  throw new ApiError(
    503,
    "ORDERS_UNAVAILABLE",
    "Branch order management API is not configured. Configure Supabase service role.",
  );
}

export function createUnavailableBranchOrderManagementDataSource(): BranchOrderManagementDataSource {
  return {
    async listBranchOrders() {
      return unavailable();
    },
    async getBranchOrderDetail() {
      return unavailable();
    },
    async getOperationsDashboard() {
      return unavailable();
    },
    async transitionOrder() {
      return unavailable();
    },
  };
}

export function createBranchOrderManagementDataSource(
  envStatus: EnvironmentStatus,
): BranchOrderManagementDataSource {
  if (!envStatus.isReady) {
    return createUnavailableBranchOrderManagementDataSource();
  }
  try {
    return createSupabaseBranchOrderManagementDataSource(envStatus);
  } catch {
    return createUnavailableBranchOrderManagementDataSource();
  }
}
