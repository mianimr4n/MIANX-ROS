import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  KITCHEN_TICKET_STATUSES,
  planKitchenTicketTransition,
  type KitchenTicketStatus,
} from "./transitions.js";

/** Actor scope for kitchen APIs — kitchen / branch-manager / super-admin only. */
export interface KitchenActorScope {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
}

export interface KitchenTicketListFilters {
  branchId?: string;
  status?: KitchenTicketStatus;
  limit: number;
  offset: number;
}

export interface SafeKitchenTicketItem {
  id: string;
  orderItemId: string;
  itemNameSnapshot: string;
  modifiersSnapshot: unknown;
  quantity: number;
  isCompleted: boolean;
}

export interface SafeKitchenTicket {
  id: string;
  orderId: string;
  branchId: string;
  status: KitchenTicketStatus;
  priority: number;
  sequenceNumber: number | null;
  acceptedByUserId: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: SafeKitchenTicketItem[];
}

export interface KitchenTicketTransitionResult {
  ticketId: string;
  status: KitchenTicketStatus;
  orderId: string;
  orderStatus: string | null;
  idempotentReplay: boolean;
}

export interface KitchenTicketsService {
  listTickets(
    scope: KitchenActorScope,
    filters: KitchenTicketListFilters,
  ): Promise<{ tickets: SafeKitchenTicket[]; pagination: { limit: number; offset: number; total: number; returned: number } }>;
  transitionTicket(params: {
    scope: KitchenActorScope;
    ticketId: string;
    toStatus: KitchenTicketStatus;
    note?: string | null;
  }): Promise<KitchenTicketTransitionResult>;
}

export class KitchenTicketsConfigurationError extends Error {}

const KITCHEN_ACCESS_ROLES = new Set(["kitchen", "branch-manager"]);

export function assertKitchenActor(scope: KitchenActorScope): void {
  if (scope.isSuperAdmin) {
    return;
  }
  if (!scope.roles.some((r) => KITCHEN_ACCESS_ROLES.has(r))) {
    throw new ApiError(
      403,
      "KITCHEN_ACCESS_DENIED",
      "Only kitchen staff, branch managers, or super-admins may access kitchen tickets.",
    );
  }
}

function assertBranchInScope(scope: KitchenActorScope, branchId: string): void {
  if (scope.isSuperAdmin) {
    return;
  }
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "KITCHEN_ACCESS_DENIED", "Ticket belongs to another branch.");
  }
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new KitchenTicketsConfigurationError("Supabase service role configuration is missing.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type OrderItemRow = {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  extras_snapshot: unknown;
  modifiers?: Array<{
    group_name: string;
    option_name: string;
    quantity: number;
  }> | null;
};

function buildItemNameSnapshot(item: OrderItemRow): string {
  if (item.variant_name?.trim()) {
    return `${item.product_name} (${item.variant_name.trim()})`;
  }
  return item.product_name;
}

function buildModifiersSnapshot(item: OrderItemRow): unknown[] {
  const fromModifiers = Array.isArray(item.modifiers)
    ? item.modifiers.map((m) => ({
        groupName: m.group_name,
        optionName: m.option_name,
        quantity: m.quantity,
      }))
    : [];
  if (fromModifiers.length > 0) {
    return fromModifiers;
  }
  if (Array.isArray(item.extras_snapshot)) {
    return item.extras_snapshot as unknown[];
  }
  return [];
}

function toSafeItem(row: Record<string, unknown>): SafeKitchenTicketItem {
  return {
    id: row.id as string,
    orderItemId: row.order_item_id as string,
    itemNameSnapshot: row.item_name_snapshot as string,
    modifiersSnapshot: row.modifiers_snapshot ?? [],
    quantity: Number(row.quantity),
    isCompleted: Boolean(row.is_completed),
  };
}

function toSafeTicket(row: Record<string, unknown>): SafeKitchenTicket {
  const itemsRaw = row.items;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as Array<Record<string, unknown>>).map(toSafeItem)
    : [];
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    branchId: row.branch_id as string,
    status: row.status as KitchenTicketStatus,
    priority: Number(row.priority ?? 0),
    sequenceNumber: (row.sequence_number as number | null) ?? null,
    acceptedByUserId: (row.accepted_by_user_id as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    readyAt: (row.ready_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    items,
  };
}

/**
 * Idempotent kitchen ticket + items creation for a confirmed order.
 * Safe to call repeatedly — UNIQUE(order_id) + ignore duplicate.
 * Uses service_role client (Option B — backend service, not DB trigger).
 */
export async function createKitchenTicketForConfirmedOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ created: boolean; ticketId: string | null }> {
  const { data: existing } = await supabase
    .from("kitchen_tickets")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing?.id) {
    return { created: false, ticketId: existing.id as string };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, branch_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new ApiError(500, "KITCHEN_TICKET_CREATE_FAILED", orderError.message);
  }
  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  }
  if ((order as { status: string }).status !== "confirmed") {
    // Only create on confirmed; callers should gate, but stay defensive.
    return { created: false, ticketId: null };
  }

  const branchId = (order as { branch_id: string }).branch_id;

  const { data: ticket, error: insertError } = await supabase
    .from("kitchen_tickets")
    .insert({
      order_id: orderId,
      branch_id: branchId,
      status: "queued",
      priority: 0,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    // Unique violation → concurrent create won; treat as idempotent success.
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("kitchen_tickets")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();
      return { created: false, ticketId: (raced?.id as string) ?? null };
    }
    throw new ApiError(500, "KITCHEN_TICKET_CREATE_FAILED", insertError.message);
  }

  if (!ticket?.id) {
    return { created: false, ticketId: null };
  }

  const ticketId = ticket.id as string;

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "id, product_name, variant_name, quantity, extras_snapshot, modifiers:order_item_modifiers(group_name, option_name, quantity)",
    )
    .eq("order_id", orderId);

  if (itemsError) {
    throw new ApiError(500, "KITCHEN_TICKET_ITEMS_FAILED", itemsError.message);
  }

  const rows = ((orderItems ?? []) as OrderItemRow[]).map((item) => ({
    kitchen_ticket_id: ticketId,
    order_item_id: item.id,
    item_name_snapshot: buildItemNameSnapshot(item),
    modifiers_snapshot: buildModifiersSnapshot(item),
    quantity: item.quantity,
    is_completed: false,
  }));

  if (rows.length > 0) {
    const { error: linesError } = await supabase.from("kitchen_ticket_items").insert(rows);
    if (linesError && linesError.code !== "23505") {
      throw new ApiError(500, "KITCHEN_TICKET_ITEMS_FAILED", linesError.message);
    }
  }

  return { created: true, ticketId };
}

/** Best-effort cancel of an open ticket when the order is cancelled. */
export async function cancelKitchenTicketForOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("kitchen_tickets")
    .update({ status: "cancelled", completed_at: now, updated_at: now })
    .eq("order_id", orderId)
    .in("status", ["queued", "accepted", "preparing", "ready"]);
}

export function createSupabaseKitchenTicketsService(
  envStatus: EnvironmentStatus,
): KitchenTicketsService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async listTickets(scope, filters) {
      assertKitchenActor(scope);
      const supabase = getClient();

      let query = supabase
        .from("kitchen_tickets")
        .select(
          "id, order_id, branch_id, status, priority, sequence_number, accepted_by_user_id, accepted_at, started_at, ready_at, completed_at, created_at, updated_at, items:kitchen_ticket_items(id, order_item_id, item_name_snapshot, modifiers_snapshot, quantity, is_completed)",
          { count: "exact" },
        )
        .order("created_at", { ascending: true });

      if (scope.isSuperAdmin) {
        if (filters.branchId) {
          query = query.eq("branch_id", filters.branchId);
        }
      } else {
        const allowed = scope.branchIds;
        if (filters.branchId) {
          if (!allowed.includes(filters.branchId)) {
            throw new ApiError(403, "KITCHEN_ACCESS_DENIED", "Branch access denied.");
          }
          query = query.eq("branch_id", filters.branchId);
        } else {
          query = query.in("branch_id", allowed.length > 0 ? allowed : ["00000000-0000-0000-0000-000000000000"]);
        }
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error, count } = await query.range(
        filters.offset,
        filters.offset + filters.limit - 1,
      );

      if (error) {
        throw new ApiError(500, "KITCHEN_TICKETS_LIST_FAILED", error.message);
      }

      const tickets = ((data ?? []) as Array<Record<string, unknown>>).map(toSafeTicket);
      return {
        tickets,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: count ?? tickets.length,
          returned: tickets.length,
        },
      };
    },

    async transitionTicket({ scope, ticketId, toStatus, note }) {
      assertKitchenActor(scope);
      const supabase = getClient();

      const { data: ticket, error } = await supabase
        .from("kitchen_tickets")
        .select("id, order_id, branch_id, status")
        .eq("id", ticketId)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "KITCHEN_TICKET_LOOKUP_FAILED", error.message);
      }
      if (!ticket) {
        throw new ApiError(404, "KITCHEN_TICKET_NOT_FOUND", "Kitchen ticket not found.");
      }

      const row = ticket as {
        id: string;
        order_id: string;
        branch_id: string;
        status: string;
      };
      assertBranchInScope(scope, row.branch_id);

      const plan = planKitchenTicketTransition({
        currentStatus: row.status,
        toStatus,
      });

      if (plan.idempotentNoop) {
        return {
          ticketId: row.id,
          status: plan.toStatus,
          orderId: row.order_id,
          orderStatus: null,
          idempotentReplay: true,
        };
      }

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: plan.toStatus,
        updated_at: now,
      };

      if (plan.toStatus === "accepted") {
        patch.accepted_at = now;
        patch.accepted_by_user_id = scope.userId;
      }
      if (plan.toStatus === "preparing") {
        patch.started_at = now;
      }
      if (plan.toStatus === "ready") {
        patch.ready_at = now;
      }
      if (plan.toStatus === "completed" || plan.toStatus === "cancelled") {
        patch.completed_at = now;
      }

      const { data: updated, error: updateError } = await supabase
        .from("kitchen_tickets")
        .update(patch)
        .eq("id", row.id)
        .eq("status", plan.fromStatus)
        .select("id, status")
        .maybeSingle();

      if (updateError) {
        throw new ApiError(500, "KITCHEN_TICKET_UPDATE_FAILED", updateError.message);
      }
      if (!updated) {
        const { data: fresh } = await supabase
          .from("kitchen_tickets")
          .select("status")
          .eq("id", row.id)
          .maybeSingle();
        if (fresh && (fresh as { status: string }).status === plan.toStatus) {
          return {
            ticketId: row.id,
            status: plan.toStatus,
            orderId: row.order_id,
            orderStatus: null,
            idempotentReplay: true,
          };
        }
        throw new ApiError(
          409,
          "TICKET_STATE_CONFLICT",
          "Kitchen ticket status changed concurrently. Reload and retry.",
        );
      }

      let orderStatus: string | null = null;

      if (plan.orderMirrorStatus) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, status")
          .eq("id", row.order_id)
          .maybeSingle();

        const currentOrderStatus = (order as { status: string } | null)?.status;
        if (order && currentOrderStatus && currentOrderStatus !== plan.orderMirrorStatus) {
          // Mirror only when it advances the frozen order machine sensibly.
          const canMirror =
            (plan.orderMirrorStatus === "preparing" && currentOrderStatus === "confirmed") ||
            (plan.orderMirrorStatus === "ready" &&
              (currentOrderStatus === "confirmed" || currentOrderStatus === "preparing")) ||
            (plan.orderMirrorStatus === "cancelled" &&
              ["pending", "confirmed", "preparing", "ready"].includes(currentOrderStatus));

          if (canMirror) {
            const orderPatch: Record<string, unknown> = {
              status: plan.orderMirrorStatus,
              updated_at: now,
            };
            if (plan.orderMirrorStatus === "cancelled") {
              orderPatch.cancel_reason_code = "staff_cancelled";
              orderPatch.cancel_note = note?.trim() || "Cancelled from kitchen ticket";
            }

            const { data: orderUpdated, error: orderErr } = await supabase
              .from("orders")
              .update(orderPatch)
              .eq("id", row.order_id)
              .eq("status", currentOrderStatus)
              .select("status")
              .maybeSingle();

            if (!orderErr && orderUpdated) {
              orderStatus = (orderUpdated as { status: string }).status;
              await supabase.from("order_status_logs").insert({
                order_id: row.order_id,
                from_status: currentOrderStatus,
                to_status: plan.orderMirrorStatus,
                actor_type: "staff",
                actor_user_id: scope.userId,
                reason_code:
                  plan.orderMirrorStatus === "cancelled" ? "staff_cancelled" : null,
                note: note?.trim() || `Kitchen ticket → ${plan.toStatus}`,
              });
            }
          }
        }
      }

      return {
        ticketId: row.id,
        status: plan.toStatus,
        orderId: row.order_id,
        orderStatus,
        idempotentReplay: false,
      };
    },
  };
}

function unavailable(): never {
  throw new ApiError(
    503,
    "KITCHEN_UNAVAILABLE",
    "Kitchen tickets API is not configured. Configure Supabase service role.",
  );
}

export function createUnavailableKitchenTicketsService(): KitchenTicketsService {
  return {
    async listTickets() {
      return unavailable();
    },
    async transitionTicket() {
      return unavailable();
    },
  };
}

export function createKitchenTicketsService(envStatus: EnvironmentStatus): KitchenTicketsService {
  if (!envStatus.isReady) {
    return createUnavailableKitchenTicketsService();
  }
  try {
    return createSupabaseKitchenTicketsService(envStatus);
  } catch {
    return createUnavailableKitchenTicketsService();
  }
}

export { KITCHEN_TICKET_STATUSES };
