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
  limit: number;
  offset: number;
}

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

      let query = supabase.from("orders").select(LIST_COLUMNS, { count: "exact" });

      if (scope.isSuperAdmin) {
        if (filters.branchId) {
          query = query.eq("branch_id", filters.branchId);
        }
      } else {
        if (scope.branchIds.length === 0) {
          return { orders: [], pagination: { limit: filters.limit, offset: filters.offset, total: 0, returned: 0 } };
        }
        if (filters.branchId) {
          assertBranchInScope(scope, filters.branchId);
          query = query.eq("branch_id", filters.branchId);
        } else {
          query = query.in("branch_id", scope.branchIds);
        }
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.orderType) {
        query = query.eq("order_type", filters.orderType);
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

      // Idempotent no-op: already at target status. No update, no new log.
      if (plan.idempotentNoop) {
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
