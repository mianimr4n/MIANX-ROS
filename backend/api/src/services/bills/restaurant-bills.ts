import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { FINAL_STATUSES } from "../orders/transitions.js";

/** Actor scope for admin bill APIs — cashier / branch-manager / super-admin only. */
export interface BillActorScope {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
}

export const BILL_STATUSES = ["open", "billed", "paid", "voided"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const BILL_CLOSE_STATUSES = ["paid", "voided"] as const;
export type BillCloseStatus = (typeof BILL_CLOSE_STATUSES)[number];

export interface SafeBillOrder {
  id: string;
  orderId: string;
  addedAt: string;
}

export interface SafeRestaurantBill {
  id: string;
  dineInSessionId: string;
  branchId: string;
  billNumber: string;
  status: BillStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  openedByUserId: string | null;
  closedByUserId: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  orders: SafeBillOrder[];
}

export interface BillCloseResult {
  billId: string;
  status: BillCloseStatus;
  closedAt: string;
  closedByUserId: string;
  idempotentReplay: boolean;
}

export interface RestaurantBillsService {
  listBillsBySession(scope: BillActorScope, sessionId: string): Promise<SafeRestaurantBill[]>;
  closeBill(params: {
    scope: BillActorScope;
    billId: string;
    status: BillCloseStatus;
  }): Promise<BillCloseResult>;
}

export class RestaurantBillsConfigurationError extends Error {}

const BILL_ACCESS_ROLES = new Set(["cashier", "branch-manager"]);

export function assertBillActor(scope: BillActorScope): void {
  if (scope.isSuperAdmin) {
    return;
  }
  if (!scope.roles.some((r) => BILL_ACCESS_ROLES.has(r))) {
    throw new ApiError(
      403,
      "BILL_ACCESS_DENIED",
      "Only cashiers, branch managers, or super-admins may access restaurant bills.",
    );
  }
}

function assertBranchInScope(scope: BillActorScope, branchId: string): void {
  if (scope.isSuperAdmin) {
    return;
  }
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "BILL_ACCESS_DENIED", "Bill belongs to another branch.");
  }
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new RestaurantBillsConfigurationError("Supabase service role configuration is missing.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapBill(row: Record<string, unknown>): SafeRestaurantBill {
  const orderRows = (row.orders ?? []) as Array<Record<string, unknown>>;
  return {
    id: row.id as string,
    dineInSessionId: row.dine_in_session_id as string,
    branchId: row.branch_id as string,
    billNumber: row.bill_number as string,
    status: row.status as BillStatus,
    subtotal: Number(row.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    openedByUserId: (row.opened_by_user_id as string | null) ?? null,
    closedByUserId: (row.closed_by_user_id as string | null) ?? null,
    openedAt: row.opened_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    orders: orderRows.map((o) => ({
      id: o.id as string,
      orderId: o.order_id as string,
      addedAt: o.added_at as string,
    })),
  };
}

const BILL_SELECT =
  "id, dine_in_session_id, branch_id, bill_number, status, subtotal, tax_amount, discount_amount, grand_total, opened_by_user_id, closed_by_user_id, opened_at, closed_at, created_at, updated_at, orders:bill_orders(id, order_id, added_at)";

/**
 * Idempotent attach of a confirmed dine-in order to the session's open bill.
 * Creates an open bill when none exists. No-op for delivery/pickup / missing session.
 */
export async function attachConfirmedDineInOrderToBill(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ billId: string | null; linked: boolean; createdBill: boolean }> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, order_type, branch_id, dine_in_session_id, total_amount")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new ApiError(500, "BILL_ATTACH_FAILED", orderError.message);
  }
  if (!order) {
    return { billId: null, linked: false, createdBill: false };
  }

  const row = order as {
    id: string;
    status: string;
    order_type: string;
    branch_id: string;
    dine_in_session_id: string | null;
    total_amount: number | string | null;
  };

  // Delivery / pickup / legacy dine-in without session: never bill-link.
  if (row.order_type !== "dine-in" || !row.dine_in_session_id) {
    return { billId: null, linked: false, createdBill: false };
  }
  if (row.status !== "confirmed") {
    return { billId: null, linked: false, createdBill: false };
  }

  // Already linked (idempotent).
  const { data: existingLink } = await supabase
    .from("bill_orders")
    .select("id, restaurant_bill_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existingLink) {
    return {
      billId: (existingLink as { restaurant_bill_id: string }).restaurant_bill_id,
      linked: true,
      createdBill: false,
    };
  }

  let createdBill = false;
  let billId: string | null = null;

  const { data: openBill } = await supabase
    .from("restaurant_bills")
    .select("id, subtotal, grand_total")
    .eq("dine_in_session_id", row.dine_in_session_id)
    .eq("status", "open")
    .maybeSingle();

  if (openBill) {
    billId = (openBill as { id: string }).id;
  } else {
    const { data: billNumber, error: numError } = await supabase.rpc("next_restaurant_bill_number", {
      p_branch_id: row.branch_id,
    });
    if (numError || typeof billNumber !== "string") {
      throw new ApiError(
        500,
        "BILL_NUMBER_FAILED",
        numError?.message ?? "Failed to allocate bill number.",
      );
    }

    const { data: created, error: createError } = await supabase
      .from("restaurant_bills")
      .insert({
        dine_in_session_id: row.dine_in_session_id,
        branch_id: row.branch_id,
        bill_number: billNumber,
        status: "open",
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 0,
      })
      .select("id")
      .single();

    if (createError) {
      // Race: another writer created the open bill — re-read.
      const { data: raced } = await supabase
        .from("restaurant_bills")
        .select("id")
        .eq("dine_in_session_id", row.dine_in_session_id)
        .eq("status", "open")
        .maybeSingle();
      if (!raced) {
        throw new ApiError(500, "BILL_CREATE_FAILED", createError.message);
      }
      billId = (raced as { id: string }).id;
    } else {
      billId = (created as { id: string }).id;
      createdBill = true;
    }
  }

  const { error: linkError } = await supabase.from("bill_orders").insert({
    restaurant_bill_id: billId,
    order_id: orderId,
  });

  if (linkError) {
    // Unique violation on order_id → concurrent attach won; treat as success.
    if (String(linkError.code) === "23505" || /duplicate|unique/i.test(linkError.message)) {
      const { data: again } = await supabase
        .from("bill_orders")
        .select("restaurant_bill_id")
        .eq("order_id", orderId)
        .maybeSingle();
      return {
        billId: (again as { restaurant_bill_id: string } | null)?.restaurant_bill_id ?? billId,
        linked: true,
        createdBill: false,
      };
    }
    throw new ApiError(500, "BILL_LINK_FAILED", linkError.message);
  }

  // Best-effort roll totals from linked order amount (minimal; not tax engine).
  const amount = Number(row.total_amount ?? 0);
  if (Number.isFinite(amount) && amount > 0) {
    const { data: billRow } = await supabase
      .from("restaurant_bills")
      .select("subtotal, grand_total, status")
      .eq("id", billId)
      .maybeSingle();
    if (billRow && (billRow as { status: string }).status === "open") {
      const nextSub = Number((billRow as { subtotal: number }).subtotal ?? 0) + amount;
      await supabase
        .from("restaurant_bills")
        .update({ subtotal: nextSub, grand_total: nextSub })
        .eq("id", billId)
        .eq("status", "open");
    }
  }

  return { billId, linked: true, createdBill };
}

function createSupabaseRestaurantBillsService(envStatus: EnvironmentStatus): RestaurantBillsService {
  const supabase = createServiceClient(envStatus);

  return {
    async listBillsBySession(scope, sessionId) {
      assertBillActor(scope);

      const { data: session, error: sessionError } = await supabase
        .from("dine_in_sessions")
        .select("id, branch_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) {
        throw new ApiError(500, "BILL_LIST_FAILED", sessionError.message);
      }
      if (!session) {
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }
      assertBranchInScope(scope, (session as { branch_id: string }).branch_id);

      const { data, error } = await supabase
        .from("restaurant_bills")
        .select(BILL_SELECT)
        .eq("dine_in_session_id", sessionId)
        .order("opened_at", { ascending: true });
      if (error) {
        throw new ApiError(500, "BILL_LIST_FAILED", error.message);
      }

      return ((data ?? []) as Array<Record<string, unknown>>).map(mapBill);
    },

    async closeBill({ scope, billId, status }) {
      assertBillActor(scope);

      const { data: bill, error: billError } = await supabase
        .from("restaurant_bills")
        .select("id, branch_id, status, closed_at, closed_by_user_id")
        .eq("id", billId)
        .maybeSingle();
      if (billError) {
        throw new ApiError(500, "BILL_CLOSE_FAILED", billError.message);
      }
      if (!bill) {
        throw new ApiError(404, "BILL_NOT_FOUND", "Restaurant bill not found.");
      }

      const current = bill as {
        id: string;
        branch_id: string;
        status: string;
        closed_at: string | null;
        closed_by_user_id: string | null;
      };
      assertBranchInScope(scope, current.branch_id);

      // Idempotent replay when already closed to the requested status.
      if (current.status === status) {
        return {
          billId: current.id,
          status,
          closedAt: current.closed_at ?? new Date().toISOString(),
          closedByUserId: current.closed_by_user_id ?? scope.userId,
          idempotentReplay: true,
        };
      }

      if (current.status === "paid" || current.status === "voided") {
        throw new ApiError(
          409,
          "BILL_IMMUTABLE",
          `Bill is already ${current.status} and cannot be changed.`,
        );
      }

      const { data: links, error: linksError } = await supabase
        .from("bill_orders")
        .select("order_id, orders:orders(id, status)")
        .eq("restaurant_bill_id", billId);
      if (linksError) {
        throw new ApiError(500, "BILL_CLOSE_FAILED", linksError.message);
      }

      const members = (links ?? []) as Array<{
        order_id: string;
        orders: { id: string; status: string } | { id: string; status: string }[] | null;
      }>;

      for (const member of members) {
        const order = Array.isArray(member.orders) ? member.orders[0] : member.orders;
        const orderStatus = order?.status;
        if (!orderStatus || !FINAL_STATUSES.has(orderStatus)) {
          throw new ApiError(
            409,
            "BILL_ORDERS_NOT_FINAL",
            "All linked orders must be completed or cancelled before closing the bill.",
            { orderId: member.order_id, status: orderStatus ?? null },
          );
        }
      }

      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from("restaurant_bills")
        .update({
          status,
          closed_at: now,
          closed_by_user_id: scope.userId,
        })
        .eq("id", billId)
        .in("status", ["open", "billed"])
        .select("id, status, closed_at, closed_by_user_id")
        .maybeSingle();

      if (updateError) {
        throw new ApiError(500, "BILL_CLOSE_FAILED", updateError.message);
      }
      if (!updated) {
        throw new ApiError(
          409,
          "BILL_STATE_CONFLICT",
          "Bill status changed concurrently. Reload and retry.",
        );
      }

      const row = updated as {
        id: string;
        status: BillCloseStatus;
        closed_at: string;
        closed_by_user_id: string;
      };
      return {
        billId: row.id,
        status: row.status,
        closedAt: row.closed_at,
        closedByUserId: row.closed_by_user_id,
        idempotentReplay: false,
      };
    },
  };
}

function unavailable(): never {
  throw new ApiError(
    503,
    "BILLS_UNAVAILABLE",
    "Restaurant bills API is not configured. Configure Supabase service role.",
  );
}

export function createUnavailableRestaurantBillsService(): RestaurantBillsService {
  return {
    async listBillsBySession() {
      return unavailable();
    },
    async closeBill() {
      return unavailable();
    },
  };
}

export function createRestaurantBillsService(envStatus: EnvironmentStatus): RestaurantBillsService {
  if (!envStatus.isReady) {
    return createUnavailableRestaurantBillsService();
  }
  try {
    return createSupabaseRestaurantBillsService(envStatus);
  } catch {
    return createUnavailableRestaurantBillsService();
  }
}
