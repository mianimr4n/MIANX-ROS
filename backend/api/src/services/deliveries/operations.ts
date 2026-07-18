import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { planTransition } from "../orders/transitions.js";

/**
 * Sprint 4.6 — Delivery / rider lane.
 * Authority: SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md §3.3 + §4.2
 *
 * deliveries.status: pending → assigned → picked-up → delivered
 * Order mirror: picked-up → orders.dispatched · delivered → orders.completed
 */

export const DELIVERY_STATUSES = [
  "pending",
  "assigned",
  "picked-up",
  "delivered",
  "failed",
  "cancelled",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type RiderDeliveryAction = "assigned" | "picked-up" | "delivered";

export interface DeliveryActorScope {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
  permissions: string[];
}

export interface SafeRiderRow {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  status: string;
}

export interface SafeDeliveryAssignment {
  id: string;
  orderId: string;
  orderNumber: string;
  branchId: string;
  status: string;
  deliveryAddress: string;
  riderId: string | null;
  riderName: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  orderStatus: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTransitionResult {
  deliveryId: string;
  status: string;
  orderId: string;
  orderStatus: string;
  idempotentReplay: boolean;
}

export interface DeliveryOperationsDataSource {
  listRiders(scope: DeliveryActorScope, branchId?: string): Promise<SafeRiderRow[]>;
  listAssignments(
    scope: DeliveryActorScope,
    filters: { branchId?: string; status?: DeliveryStatus; limit: number; offset: number },
  ): Promise<{ assignments: SafeDeliveryAssignment[]; pagination: { limit: number; offset: number; total: number; returned: number } }>;
  assignRider(params: {
    scope: DeliveryActorScope;
    deliveryId: string;
    riderId: string;
  }): Promise<DeliveryTransitionResult>;
  transitionDelivery(params: {
    scope: DeliveryActorScope;
    deliveryId: string;
    toStatus: RiderDeliveryAction;
    note?: string | null;
  }): Promise<DeliveryTransitionResult>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "DELIVERIES_UNAVAILABLE", "Supabase service role configuration is missing.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(scope: DeliveryActorScope, branchId: string): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "DELIVERY_ACCESS_DENIED", "Delivery belongs to another branch.");
  }
}

function hasPermission(scope: DeliveryActorScope, code: string): boolean {
  return scope.isSuperAdmin || scope.permissions.includes(code);
}

function isRiderOnly(scope: DeliveryActorScope): boolean {
  return scope.roles.includes("rider") && !scope.isSuperAdmin && !scope.roles.includes("branch-manager");
}

const DELIVERY_TRANSITIONS: Record<RiderDeliveryAction, { from: DeliveryStatus[]; orderAction?: "dispatch" | "complete" }> = {
  assigned: { from: ["pending"] },
  "picked-up": { from: ["assigned"], orderAction: "dispatch" },
  delivered: { from: ["picked-up"], orderAction: "complete" },
};

export function createSupabaseDeliveryOperationsDataSource(
  envStatus: EnvironmentStatus,
): DeliveryOperationsDataSource {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadDelivery(supabase: SupabaseClient, deliveryId: string) {
    const { data, error } = await supabase
      .from("deliveries")
      .select(
        "id, order_id, branch_id, rider_id, status, delivery_address, assigned_at, picked_up_at, delivered_at, created_at, updated_at",
      )
      .eq("id", deliveryId)
      .maybeSingle();
    if (error) throw new ApiError(500, "DELIVERY_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    return data as {
      id: string;
      order_id: string;
      branch_id: string;
      rider_id: string | null;
      status: string;
      delivery_address: string;
      assigned_at: string | null;
      picked_up_at: string | null;
      delivered_at: string | null;
      created_at: string;
      updated_at: string;
    };
  }

  async function mirrorOrderStatus(
    supabase: SupabaseClient,
    scope: DeliveryActorScope,
    orderId: string,
    action: "dispatch" | "complete",
  ): Promise<string> {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, status, branch_id")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found for delivery.");

    const plan = planTransition({
      action,
      currentStatus: (order as { status: string }).status,
      actor: { isSuperAdmin: scope.isSuperAdmin, roles: scope.roles },
    });

    if (plan.idempotentNoop) {
      return plan.toStatus;
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: plan.toStatus, updated_at: now })
      .eq("id", orderId)
      .in("status", plan.allowedFromStatuses)
      .select("status")
      .maybeSingle();

    if (updateError) throw new ApiError(500, "ORDER_TRANSITION_FAILED", updateError.message);
    if (!updated) {
      const { data: fresh } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
      if (fresh && (fresh as { status: string }).status === plan.toStatus) {
        return plan.toStatus;
      }
      throw new ApiError(409, "ORDER_STATE_CONFLICT", "Order status changed concurrently. Reload and retry.");
    }

    const { error: logError } = await supabase.from("order_status_logs").insert({
      order_id: orderId,
      from_status: plan.fromStatus,
      to_status: plan.toStatus,
      actor_type: "staff",
      actor_user_id: scope.userId,
      reason_code: null,
      note: action === "dispatch" ? "Mirrored from delivery picked-up" : "Mirrored from delivery delivered",
    });
    if (logError) throw new ApiError(500, "ORDER_AUDIT_LOG_FAILED", logError.message);

    return plan.toStatus;
  }

  return {
    async listRiders(scope, branchId) {
      if (!hasPermission(scope, "delivery.assign") && !hasPermission(scope, "delivery.read")) {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to list riders.");
      }
      const supabase = getClient();
      let query = supabase
        .from("riders")
        .select("id, branch_id, full_name, phone, vehicle_type, status")
        .neq("status", "inactive")
        .order("full_name", { ascending: true });

      if (scope.isSuperAdmin) {
        if (branchId) query = query.eq("branch_id", branchId);
      } else {
        if (scope.branchIds.length === 0) return [];
        if (branchId) {
          assertBranchInScope(scope, branchId);
          query = query.eq("branch_id", branchId);
        } else {
          query = query.in("branch_id", scope.branchIds);
        }
      }

      const { data, error } = await query;
      if (error) throw new ApiError(500, "RIDER_LIST_FAILED", error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        branchId: row.branch_id as string,
        fullName: row.full_name as string,
        phone: row.phone as string,
        vehicleType: row.vehicle_type as string,
        status: row.status as string,
      }));
    },

    async listAssignments(scope, filters) {
      if (!hasPermission(scope, "delivery.read") && !hasPermission(scope, "order.manage")) {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to list deliveries.");
      }
      const supabase = getClient();

      let query = supabase.from("deliveries").select(
        `id, order_id, branch_id, rider_id, status, delivery_address, assigned_at, picked_up_at, delivered_at, created_at, updated_at,
         order:orders(order_number, status, contact_name, contact_phone),
         rider:riders(full_name)`,
        { count: "exact" },
      );

      if (isRiderOnly(scope)) {
        const { data: riderRows, error: riderError } = await supabase
          .from("riders")
          .select("id")
          .eq("user_id", scope.userId);
        if (riderError) throw new ApiError(500, "RIDER_LOOKUP_FAILED", riderError.message);
        const riderIds = ((riderRows ?? []) as Array<{ id: string }>).map((r) => r.id);
        if (riderIds.length === 0) {
          return {
            assignments: [],
            pagination: { limit: filters.limit, offset: filters.offset, total: 0, returned: 0 },
          };
        }
        query = query.in("rider_id", riderIds);
      } else if (scope.isSuperAdmin) {
        if (filters.branchId) query = query.eq("branch_id", filters.branchId);
      } else {
        if (scope.branchIds.length === 0) {
          return {
            assignments: [],
            pagination: { limit: filters.limit, offset: filters.offset, total: 0, returned: 0 },
          };
        }
        if (filters.branchId) {
          assertBranchInScope(scope, filters.branchId);
          query = query.eq("branch_id", filters.branchId);
        } else {
          query = query.in("branch_id", scope.branchIds);
        }
      }

      if (filters.status) query = query.eq("status", filters.status);

      query = query
        .order("created_at", { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error, count } = await query;
      if (error) throw new ApiError(500, "DELIVERY_LIST_FAILED", error.message);

      const assignments = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const order = Array.isArray(row.order) ? row.order[0] : row.order;
        const rider = Array.isArray(row.rider) ? row.rider[0] : row.rider;
        const orderRec = (order ?? {}) as Record<string, unknown>;
        const riderRec = (rider ?? {}) as Record<string, unknown>;
        return {
          id: row.id as string,
          orderId: row.order_id as string,
          orderNumber: (orderRec.order_number as string) ?? "",
          branchId: row.branch_id as string,
          status: row.status as string,
          deliveryAddress: row.delivery_address as string,
          riderId: (row.rider_id as string | null) ?? null,
          riderName: (riderRec.full_name as string | null) ?? null,
          assignedAt: (row.assigned_at as string | null) ?? null,
          pickedUpAt: (row.picked_up_at as string | null) ?? null,
          deliveredAt: (row.delivered_at as string | null) ?? null,
          orderStatus: (orderRec.status as string) ?? "",
          contactName: (orderRec.contact_name as string) ?? "",
          contactPhone: (orderRec.contact_phone as string) ?? "",
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        } satisfies SafeDeliveryAssignment;
      });

      return {
        assignments,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: count ?? assignments.length,
          returned: assignments.length,
        },
      };
    },

    async assignRider({ scope, deliveryId, riderId }) {
      if (!hasPermission(scope, "delivery.assign") && !hasPermission(scope, "order.manage")) {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to assign riders.");
      }
      const supabase = getClient();
      const delivery = await loadDelivery(supabase, deliveryId);
      assertBranchInScope(scope, delivery.branch_id);

      if (delivery.status === "assigned" && delivery.rider_id === riderId) {
        const { data: order } = await supabase.from("orders").select("status").eq("id", delivery.order_id).maybeSingle();
        return {
          deliveryId: delivery.id,
          status: "assigned",
          orderId: delivery.order_id,
          orderStatus: (order as { status?: string } | null)?.status ?? "",
          idempotentReplay: true,
        };
      }

      if (delivery.status !== "pending" && delivery.status !== "assigned") {
        throw new ApiError(
          409,
          "INVALID_DELIVERY_TRANSITION",
          `Cannot assign a rider when delivery is '${delivery.status}'.`,
        );
      }

      const { data: rider, error: riderError } = await supabase
        .from("riders")
        .select("id, branch_id, status")
        .eq("id", riderId)
        .maybeSingle();
      if (riderError) throw new ApiError(500, "RIDER_LOOKUP_FAILED", riderError.message);
      if (!rider) throw new ApiError(404, "RIDER_NOT_FOUND", "Rider not found.");
      if ((rider as { branch_id: string }).branch_id !== delivery.branch_id) {
        throw new ApiError(400, "VALIDATION_ERROR", "Rider must belong to the same branch as the delivery.");
      }
      if ((rider as { status: string }).status === "inactive") {
        throw new ApiError(409, "RIDER_INACTIVE", "Rider is inactive.");
      }

      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from("deliveries")
        .update({
          rider_id: riderId,
          status: "assigned",
          assigned_at: now,
          updated_at: now,
        })
        .eq("id", delivery.id)
        .in("status", ["pending", "assigned"])
        .select("status")
        .maybeSingle();

      if (updateError) throw new ApiError(500, "DELIVERY_ASSIGN_FAILED", updateError.message);
      if (!updated) {
        throw new ApiError(409, "DELIVERY_STATE_CONFLICT", "Delivery changed concurrently. Reload and retry.");
      }

      const { data: order } = await supabase.from("orders").select("status").eq("id", delivery.order_id).maybeSingle();
      return {
        deliveryId: delivery.id,
        status: "assigned",
        orderId: delivery.order_id,
        orderStatus: (order as { status?: string } | null)?.status ?? "",
        idempotentReplay: false,
      };
    },

    async transitionDelivery({ scope, deliveryId, toStatus, note }) {
      const rule = DELIVERY_TRANSITIONS[toStatus];
      if (!rule) {
        throw new ApiError(400, "VALIDATION_ERROR", "Unsupported delivery status.");
      }

      const needsUpdate = toStatus === "picked-up" || toStatus === "delivered";
      if (needsUpdate && !hasPermission(scope, "delivery.update") && !hasPermission(scope, "order.manage")) {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to update delivery status.");
      }
      if (toStatus === "assigned" && !hasPermission(scope, "delivery.assign") && !hasPermission(scope, "order.manage")) {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to assign delivery.");
      }

      const supabase = getClient();
      const delivery = await loadDelivery(supabase, deliveryId);
      assertBranchInScope(scope, delivery.branch_id);

      if (isRiderOnly(scope)) {
        const { data: riderRows, error: riderError } = await supabase
          .from("riders")
          .select("id")
          .eq("user_id", scope.userId);
        if (riderError) throw new ApiError(500, "RIDER_LOOKUP_FAILED", riderError.message);
        const riderIds = new Set(((riderRows ?? []) as Array<{ id: string }>).map((r) => r.id));
        if (!delivery.rider_id || !riderIds.has(delivery.rider_id)) {
          throw new ApiError(403, "DELIVERY_ACCESS_DENIED", "Delivery is not assigned to this rider.");
        }
      }

      if (delivery.status === toStatus) {
        const { data: order } = await supabase.from("orders").select("status").eq("id", delivery.order_id).maybeSingle();
        return {
          deliveryId: delivery.id,
          status: toStatus,
          orderId: delivery.order_id,
          orderStatus: (order as { status?: string } | null)?.status ?? "",
          idempotentReplay: true,
        };
      }

      if (!rule.from.includes(delivery.status as DeliveryStatus)) {
        throw new ApiError(
          409,
          "INVALID_DELIVERY_TRANSITION",
          `Cannot move delivery from '${delivery.status}' to '${toStatus}'.`,
        );
      }

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status: toStatus, updated_at: now };
      if (toStatus === "picked-up") patch.picked_up_at = now;
      if (toStatus === "delivered") patch.delivered_at = now;

      const { data: updated, error: updateError } = await supabase
        .from("deliveries")
        .update(patch)
        .eq("id", delivery.id)
        .in("status", rule.from)
        .select("status")
        .maybeSingle();

      if (updateError) throw new ApiError(500, "DELIVERY_TRANSITION_FAILED", updateError.message);
      if (!updated) {
        throw new ApiError(409, "DELIVERY_STATE_CONFLICT", "Delivery changed concurrently. Reload and retry.");
      }

      let orderStatus = "";
      if (rule.orderAction) {
        orderStatus = await mirrorOrderStatus(supabase, scope, delivery.order_id, rule.orderAction);
      } else {
        const { data: order } = await supabase.from("orders").select("status").eq("id", delivery.order_id).maybeSingle();
        orderStatus = (order as { status?: string } | null)?.status ?? "";
      }

      void note;
      return {
        deliveryId: delivery.id,
        status: toStatus,
        orderId: delivery.order_id,
        orderStatus,
        idempotentReplay: false,
      };
    },
  };
}

function unavailable(): never {
  throw new ApiError(
    503,
    "DELIVERIES_UNAVAILABLE",
    "Delivery API is not configured. Configure Supabase service role.",
  );
}

export function createUnavailableDeliveryOperationsDataSource(): DeliveryOperationsDataSource {
  return {
    async listRiders() {
      return unavailable();
    },
    async listAssignments() {
      return unavailable();
    },
    async assignRider() {
      return unavailable();
    },
    async transitionDelivery() {
      return unavailable();
    },
  };
}

export function createDeliveryOperationsDataSource(
  envStatus: EnvironmentStatus,
): DeliveryOperationsDataSource {
  if (!envStatus.isReady) {
    return createUnavailableDeliveryOperationsDataSource();
  }
  try {
    return createSupabaseDeliveryOperationsDataSource(envStatus);
  } catch {
    return createUnavailableDeliveryOperationsDataSource();
  }
}
