import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";
import { mapD3RpcError } from "../reservations/management.js";

/**
 * D3 Corrective — payment settlement + deterministic bill splits.
 * Cash change is always computed server-side. Cross-branch denied.
 */

export const PAYMENT_METHODS = ["cash", "card_terminal", "bank_manual", "complimentary"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "completed",
  "failed",
  "voided",
  "partially_refunded",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SPLIT_STRATEGIES = ["equal", "by_item", "by_quantity", "by_amount"] as const;
export type SplitStrategy = (typeof SPLIT_STRATEGIES)[number];

/** Pure equal-split with deterministic cent rounding. Sum always equals total. */
export function splitEqual(total: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new ApiError(400, "SPLIT_PARTS_INVALID", "parts must be a positive integer.");
  }
  if (!Number.isFinite(total) || total < 0) {
    throw new ApiError(400, "SPLIT_TOTAL_INVALID", "total must be a non-negative number.");
  }
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  const out: number[] = [];
  for (let i = 0; i < parts; i += 1) {
    out.push((base + (i < remainder ? 1 : 0)) / 100);
  }
  return out;
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
    throw new ApiError(403, "PAYMENT_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

function normalizeStatus(status: string): PaymentStatus | string {
  return status === "paid" ? "completed" : status;
}

export interface PaymentRecord {
  id: string;
  branchId: string | null;
  orderId: string | null;
  diningSessionId: string | null;
  restaurantBillId: string | null;
  method: string;
  amount: number;
  currency: string;
  status: string;
  cashTendered: number | null;
  cashChange: number | null;
  idempotencyKey: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface BillBalance {
  billId: string;
  branchId: string;
  grandTotal: number;
  paidTotal: number;
  remaining: number;
  status: string;
  payments: PaymentRecord[];
}

export interface PaymentSettlementService {
  settleBillPayment(
    scope: BranchActorScope,
    input: {
      branchId: string;
      restaurantBillId: string;
      amount: number;
      method: PaymentMethod;
      idempotencyKey: string;
      cashTendered?: number | null;
      externalReference?: string | null;
      terminalDeviceRef?: string | null;
      note?: string | null;
      currency?: string;
    },
  ): Promise<Record<string, unknown>>;
  getBillBalance(scope: BranchActorScope, billId: string): Promise<BillBalance>;
  splitBill(
    scope: BranchActorScope,
    input: {
      billId: string;
      strategy: SplitStrategy;
      partyCount?: number;
      amounts?: number[];
      itemGroups?: { label?: string; orderItemIds: string[]; amount?: number }[];
    },
  ): Promise<{ splitId: string; allocations: { index: number; amount: number; label: string | null }[] }>;
  voidPayment(scope: BranchActorScope, paymentId: string, reason: string): Promise<PaymentRecord>;
  listSessionPayments(scope: BranchActorScope, sessionId: string): Promise<PaymentRecord[]>;
}

function toPayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    branchId: (row.branch_id as string) ?? null,
    orderId: (row.order_id as string) ?? null,
    diningSessionId: (row.dining_session_id as string) ?? null,
    restaurantBillId: (row.restaurant_bill_id as string) ?? null,
    method: String(row.payment_method),
    amount: Number(row.amount),
    currency: String(row.currency ?? "PKR"),
    status: normalizeStatus(String(row.status)),
    cashTendered: row.cash_tendered == null ? null : Number(row.cash_tendered),
    cashChange: row.cash_change == null ? null : Number(row.cash_change),
    idempotencyKey: (row.idempotency_key as string) ?? null,
    completedAt: (row.completed_at as string) ?? (row.paid_at as string) ?? null,
    createdAt: String(row.created_at),
  };
}

export function createPaymentSettlementService(envStatus: EnvironmentStatus): PaymentSettlementService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async settleBillPayment(scope, input) {
      assertBranchInScope(scope, input.branchId);
      if (!PAYMENT_METHODS.includes(input.method)) {
        throw new ApiError(400, "PAYMENT_METHOD_INVALID", "Unsupported payment method.");
      }
      const { data, error } = await getClient().rpc("settle_bill_payment_atomic", {
        p_idempotency_key: input.idempotencyKey,
        p_branch_id: input.branchId,
        p_restaurant_bill_id: input.restaurantBillId,
        p_amount: input.amount,
        p_method: input.method,
        p_actor_user_id: scope.userId,
        p_cash_tendered: input.cashTendered ?? null,
        p_external_reference: input.externalReference ?? null,
        p_terminal_device_ref: input.terminalDeviceRef ?? null,
        p_note: input.note ?? null,
        p_currency: input.currency ?? "PKR",
      });
      if (error) mapD3RpcError(error);
      return data as Record<string, unknown>;
    },

    async getBillBalance(scope, billId) {
      const { data: bill, error } = await getClient()
        .from("restaurant_bills")
        .select("*")
        .eq("id", billId)
        .maybeSingle();
      if (error) throw new ApiError(500, "BILL_LOOKUP_FAILED", error.message);
      if (!bill) throw new ApiError(404, "BILL_NOT_FOUND", "Bill not found.");
      assertBranchInScope(scope, bill.branch_id as string);

      const { data: payments } = await getClient()
        .from("payments")
        .select("*")
        .eq("restaurant_bill_id", billId)
        .order("created_at", { ascending: true });

      const rows = (payments ?? []) as Record<string, unknown>[];
      const paidTotal = rows
        .filter((p) => ["completed", "paid"].includes(String(p.status)))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const grandTotal = Number(bill.grand_total);
      return {
        billId,
        branchId: bill.branch_id as string,
        grandTotal,
        paidTotal,
        remaining: Math.max(grandTotal - paidTotal, 0),
        status: String(bill.status),
        payments: rows.map(toPayment),
      };
    },

    async splitBill(scope, input) {
      const balance = await this.getBillBalance(scope, input.billId);
      if (balance.status === "voided") {
        throw new ApiError(409, "BILL_NOT_SPLITTABLE", "Voided bills cannot be split.");
      }
      const total = balance.grandTotal;
      let amounts: number[] = [];
      let labels: (string | null)[] = [];
      let itemGroups: string[][] = [];

      if (input.strategy === "equal") {
        const parts = input.partyCount ?? 2;
        amounts = splitEqual(total, parts);
        labels = amounts.map((_, i) => `Guest ${i + 1}`);
        itemGroups = amounts.map(() => []);
      } else if (input.strategy === "by_amount") {
        if (!input.amounts?.length) {
          throw new ApiError(400, "SPLIT_AMOUNTS_REQUIRED", "amounts required for by_amount strategy.");
        }
        amounts = input.amounts.map((a) => Math.round(a * 100) / 100);
        const sum = amounts.reduce((s, a) => s + a, 0);
        if (Math.round(sum * 100) !== Math.round(total * 100)) {
          throw new ApiError(409, "SPLIT_RECONCILE_FAILED", "Custom amounts must sum to bill total.");
        }
        labels = amounts.map((_, i) => `Share ${i + 1}`);
        itemGroups = amounts.map(() => []);
      } else if (input.strategy === "by_item" || input.strategy === "by_quantity") {
        if (!input.itemGroups?.length) {
          throw new ApiError(400, "SPLIT_ITEMS_REQUIRED", "itemGroups required for item/quantity split.");
        }
        // Amounts must be provided with each group (derived from persisted line prices by caller).
        amounts = input.itemGroups.map((g) => {
          if (g.amount == null) {
            throw new ApiError(400, "SPLIT_ITEM_AMOUNT_REQUIRED", "Each item group needs an amount.");
          }
          return Math.round(g.amount * 100) / 100;
        });
        const sum = amounts.reduce((s, a) => s + a, 0);
        if (Math.round(sum * 100) !== Math.round(total * 100)) {
          throw new ApiError(409, "SPLIT_RECONCILE_FAILED", "Item group amounts must sum to bill total.");
        }
        labels = input.itemGroups.map((g, i) => g.label ?? `Group ${i + 1}`);
        itemGroups = input.itemGroups.map((g) => g.orderItemIds);
      } else {
        throw new ApiError(400, "SPLIT_STRATEGY_INVALID", "Unknown split strategy.");
      }

      const allocationSum = Math.round(amounts.reduce((s, a) => s + a, 0) * 100) / 100;
      if (Math.round(allocationSum * 100) !== Math.round(total * 100)) {
        throw new ApiError(409, "SPLIT_RECONCILE_FAILED", "Allocations must equal original total.");
      }

      const { data: split, error } = await getClient()
        .from("bill_splits")
        .insert({
          restaurant_bill_id: input.billId,
          branch_id: balance.branchId,
          strategy: input.strategy,
          party_count: amounts.length,
          original_total: total,
          allocation_sum: allocationSum,
          created_by: scope.userId,
        })
        .select("id")
        .single();
      if (error) throw new ApiError(500, "SPLIT_CREATE_FAILED", error.message);

      const rows = amounts.map((amount, index) => ({
        bill_split_id: split.id,
        allocation_index: index,
        label: labels[index],
        amount,
        remaining_amount: amount,
        order_item_ids: itemGroups[index],
      }));
      const { error: aErr } = await getClient().from("bill_split_allocations").insert(rows);
      if (aErr) throw new ApiError(500, "SPLIT_ALLOC_FAILED", aErr.message);

      await getClient().from("table_service_audit").insert({
        branch_id: balance.branchId,
        actor_user_id: scope.userId,
        actor_type: "staff",
        resource_type: "bill",
        resource_id: input.billId,
        action: "bill_split",
        after_data: { splitId: split.id, strategy: input.strategy, amounts },
      });

      return {
        splitId: split.id as string,
        allocations: amounts.map((amount, index) => ({
          index,
          amount,
          label: labels[index],
        })),
      };
    },

    async voidPayment(scope, paymentId, reason) {
      if (!reason?.trim()) {
        throw new ApiError(400, "VOID_REASON_REQUIRED", "Void reason is required.");
      }
      const { data, error } = await getClient().from("payments").select("*").eq("id", paymentId).maybeSingle();
      if (error) throw new ApiError(500, "PAYMENT_LOOKUP_FAILED", error.message);
      if (!data) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
      assertBranchInScope(scope, data.branch_id as string);
      if (["voided", "refunded"].includes(String(data.status))) {
        throw new ApiError(409, "PAYMENT_ALREADY_VOIDED", "Payment is already voided/refunded.");
      }
      const { data: updated, error: uErr } = await getClient()
        .from("payments")
        .update({
          status: "voided",
          voided_at: new Date().toISOString(),
          failure_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .select("*")
        .single();
      if (uErr) throw new ApiError(500, "PAYMENT_VOID_FAILED", uErr.message);

      await getClient().from("table_service_audit").insert({
        branch_id: data.branch_id,
        actor_user_id: scope.userId,
        actor_type: "staff",
        resource_type: "payment",
        resource_id: paymentId,
        action: "payment_voided",
        before_data: { status: data.status, amount: data.amount },
        after_data: { status: "voided" },
        note: reason.trim(),
      });
      return toPayment(updated as Record<string, unknown>);
    },

    async listSessionPayments(scope, sessionId) {
      const { data: session, error } = await getClient()
        .from("dine_in_sessions")
        .select("id, branch_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw new ApiError(500, "SESSION_LOOKUP_FAILED", error.message);
      if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Session not found.");
      assertBranchInScope(scope, session.branch_id as string);
      const { data } = await getClient()
        .from("payments")
        .select("*")
        .eq("dining_session_id", sessionId)
        .order("created_at", { ascending: true });
      return ((data ?? []) as Record<string, unknown>[]).map(toPayment);
    },
  };
}
