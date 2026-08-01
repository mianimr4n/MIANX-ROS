import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

export type LoyaltyTier = "member" | "silver" | "gold" | "platinum";
export const LOYALTY_TXN_TYPES = ["earn", "burn", "adjust", "expire", "reverse"] as const;
export type LoyaltyTxnType = (typeof LOYALTY_TXN_TYPES)[number];

export interface LoyaltyAccountRecord {
  id: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  pointsBalance: number;
  tier: LoyaltyTier;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransactionRecord {
  id: string;
  loyaltyAccountId: string;
  customerId: string | null;
  orderId: string | null;
  points: number;
  type: LoyaltyTxnType;
  note: string | null;
  actorUserId: string | null;
  reversesTransactionId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoyaltyEarnResult {
  orderId: string;
  customerId?: string;
  accountId?: string;
  points: number;
  pointsBalance: number;
  tier?: LoyaltyTier;
  idempotentReplay: boolean;
  transactionId: string | null;
  skipped?: boolean;
  reason?: string;
}

export interface LoyaltyMutationResult {
  transactionId: string | null;
  accountId: string;
  customerId?: string;
  points: number;
  pointsBalance: number;
  type: LoyaltyTxnType;
  idempotentReplay?: boolean;
  skipped?: boolean;
  reversedTransactionId?: string;
}

export interface LoyaltyAttentionSnapshot {
  state: "available" | "unavailable";
  unavailableReason: string | null;
  accountsWithBalance: number;
  earnTransactionsToday: number;
  burnTransactionsToday: number;
  pendingManualReviewAdjustments: number;
  rewardsCatalogueConfigured: boolean;
  rewardsCatalogueMessage: string;
  rewardsAwaitingApproval: number;
  pointsExpiringAttention: string;
}

export interface LoyaltyService {
  listAccounts(limit?: number): Promise<LoyaltyAccountRecord[]>;
  listTransactions(query?: {
    customerId?: string;
    accountId?: string;
    limit?: number;
  }): Promise<LoyaltyTransactionRecord[]>;
  earnForOrder(orderId: string, actorUserId: string | null): Promise<LoyaltyEarnResult>;
  burn(input: {
    customerId: string;
    points: number;
    orderId?: string | null;
    note?: string | null;
    actorUserId: string | null;
    idempotencyKey?: string | null;
  }): Promise<LoyaltyMutationResult>;
  adjust(input: {
    customerId: string;
    points: number;
    note: string;
    actorUserId: string | null;
    idempotencyKey?: string | null;
  }): Promise<LoyaltyMutationResult>;
  expire(input: {
    customerId: string;
    points: number;
    note?: string | null;
    actorUserId: string | null;
  }): Promise<LoyaltyMutationResult>;
  reverse(input: {
    transactionId: string;
    note: string;
    actorUserId: string | null;
  }): Promise<LoyaltyMutationResult>;
  getAttention(): Promise<LoyaltyAttentionSnapshot>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRpcError(error: { message?: string }, fallbackCode: string): never {
  const message = error.message ?? "Loyalty operation failed.";
  if (/CUSTOMER_ID_REQUIRED|POINTS_MUST|NOTE_REQUIRED|ADJUST_NOTE|REVERSE_NOTE|TRANSACTION_ID/i.test(message)) {
    throw new ApiError(400, "VALIDATION_ERROR", message);
  }
  if (/INSUFFICIENT_POINTS/i.test(message)) {
    throw new ApiError(409, "INSUFFICIENT_POINTS", "Insufficient loyalty points for this operation.");
  }
  if (/LOYALTY_ACCOUNT_NOT_FOUND/i.test(message)) {
    throw new ApiError(404, "LOYALTY_ACCOUNT_NOT_FOUND", "Loyalty account not found.");
  }
  if (/LOYALTY_TRANSACTION_NOT_FOUND/i.test(message)) {
    throw new ApiError(404, "LOYALTY_TRANSACTION_NOT_FOUND", "Loyalty transaction not found.");
  }
  if (/ALREADY_REVERSED|CANNOT_REVERSE/i.test(message)) {
    throw new ApiError(409, "LOYALTY_REVERSE_CONFLICT", message);
  }
  if (/ORDER_NOT_FOUND/i.test(message)) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  }
  if (/ORDER_NOT_COMPLETED/i.test(message)) {
    throw new ApiError(409, "ORDER_NOT_COMPLETED", "Points can only be earned on completed orders.");
  }
  if (/ORDER_HAS_NO_CUSTOMER/i.test(message)) {
    throw new ApiError(409, "ORDER_HAS_NO_CUSTOMER", "Order has no linked customer for loyalty earn.");
  }
  throw new ApiError(500, fallbackCode, message);
}

function karachiDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function createLoyaltyService(envStatus: EnvironmentStatus): LoyaltyService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listAccounts(limit = 100) {
      const client = supabase();
      const { data, error } = await client
        .from("loyalty_accounts")
        .select(
          "id, customer_id, points_balance, tier, created_at, updated_at, customer:customers(id, full_name, phone)",
        )
        .order("points_balance", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 500));

      if (error) throwMappedDbError("LOYALTY_ACCOUNTS_READ_FAILED", error);

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const customer = row.customer as { full_name?: string; phone?: string } | null;
        return {
          id: String(row.id),
          customerId: String(row.customer_id),
          customerName: customer?.full_name ?? null,
          customerPhone: customer?.phone ?? null,
          pointsBalance: Number(row.points_balance) || 0,
          tier: row.tier as LoyaltyTier,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      });
    },

    async listTransactions(query) {
      const client = supabase();
      let q = client
        .from("loyalty_transactions")
        .select(
          "id, loyalty_account_id, order_id, points, type, note, actor_user_id, reverses_transaction_id, expires_at, created_at, account:loyalty_accounts(customer_id)",
        )
        .order("created_at", { ascending: false })
        .limit(Math.min(Math.max(query?.limit ?? 100, 1), 500));

      if (query?.accountId) q = q.eq("loyalty_account_id", query.accountId);
      if (query?.customerId) {
        const { data: accounts, error: accError } = await client
          .from("loyalty_accounts")
          .select("id")
          .eq("customer_id", query.customerId);
        if (accError) throwMappedDbError("LOYALTY_ACCOUNTS_READ_FAILED", accError);
        const ids = (accounts ?? []).map((a) => a.id as string);
        if (ids.length === 0) return [];
        q = q.in("loyalty_account_id", ids);
      }

      const { data, error } = await q;
      if (error) throwMappedDbError("LOYALTY_TRANSACTIONS_READ_FAILED", error);

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const account = row.account as { customer_id?: string } | null;
        return {
          id: String(row.id),
          loyaltyAccountId: String(row.loyalty_account_id),
          customerId: account?.customer_id ?? null,
          orderId: (row.order_id as string | null) ?? null,
          points: Number(row.points),
          type: row.type as LoyaltyTxnType,
          note: (row.note as string | null) ?? null,
          actorUserId: (row.actor_user_id as string | null) ?? null,
          reversesTransactionId: (row.reverses_transaction_id as string | null) ?? null,
          expiresAt: (row.expires_at as string | null) ?? null,
          createdAt: String(row.created_at),
        };
      });
    },

    async earnForOrder(orderId, actorUserId) {
      const client = supabase();
      const { data, error } = await client.rpc("loyalty_earn_for_order_atomic", {
        p_order_id: orderId,
        p_actor_user_id: actorUserId,
      });
      if (error) mapRpcError(error, "LOYALTY_EARN_FAILED");
      const payload = data as LoyaltyEarnResult | null;
      if (!payload) throw new ApiError(500, "LOYALTY_EARN_FAILED", "Loyalty earn returned no payload.");
      return payload;
    },

    async burn(input) {
      const { data, error } = await supabase().rpc("loyalty_burn_atomic", {
        p_customer_id: input.customerId,
        p_points: input.points,
        p_order_id: input.orderId ?? null,
        p_note: input.note ?? null,
        p_actor_user_id: input.actorUserId,
        p_idempotency_key: input.idempotencyKey ?? null,
      });
      if (error) mapRpcError(error, "LOYALTY_BURN_FAILED");
      return data as LoyaltyMutationResult;
    },

    async adjust(input) {
      const { data, error } = await supabase().rpc("loyalty_adjust_atomic", {
        p_customer_id: input.customerId,
        p_points: input.points,
        p_note: input.note,
        p_actor_user_id: input.actorUserId,
        p_idempotency_key: input.idempotencyKey ?? null,
      });
      if (error) mapRpcError(error, "LOYALTY_ADJUST_FAILED");
      return data as LoyaltyMutationResult;
    },

    async expire(input) {
      const { data, error } = await supabase().rpc("loyalty_expire_atomic", {
        p_customer_id: input.customerId,
        p_points: input.points,
        p_note: input.note ?? null,
        p_actor_user_id: input.actorUserId,
      });
      if (error) mapRpcError(error, "LOYALTY_EXPIRE_FAILED");
      return data as LoyaltyMutationResult;
    },

    async reverse(input) {
      const { data, error } = await supabase().rpc("loyalty_reverse_atomic", {
        p_transaction_id: input.transactionId,
        p_note: input.note,
        p_actor_user_id: input.actorUserId,
      });
      if (error) mapRpcError(error, "LOYALTY_REVERSE_FAILED");
      return data as LoyaltyMutationResult;
    },

    async getAttention() {
      try {
        const client = supabase();
        const today = karachiDate();
        const dayStart = `${today}T00:00:00+05:00`;
        const dayEnd = `${today}T23:59:59.999+05:00`;

        const [accountsRes, earnRes, burnRes, rewardsRes, awaitingRes] = await Promise.all([
          client.from("loyalty_accounts").select("id", { count: "exact", head: true }).gt("points_balance", 0),
          client
            .from("loyalty_transactions")
            .select("id", { count: "exact", head: true })
            .eq("type", "earn")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd),
          client
            .from("loyalty_transactions")
            .select("id", { count: "exact", head: true })
            .eq("type", "burn")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd),
          client
            .from("loyalty_rewards")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .eq("approval_status", "approved"),
          client
            .from("loyalty_rewards")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "awaiting_approval"),
        ]);

        const catalogueConfigured = (rewardsRes.count ?? 0) > 0;
        return {
          state: "available" as const,
          unavailableReason: null,
          accountsWithBalance: accountsRes.count ?? 0,
          earnTransactionsToday: earnRes.count ?? 0,
          burnTransactionsToday: burnRes.count ?? 0,
          pendingManualReviewAdjustments: 0,
          rewardsCatalogueConfigured: catalogueConfigured,
          rewardsCatalogueMessage: catalogueConfigured
            ? "Approved rewards catalogue is LIVE."
            : "No approved active rewards yet.",
          rewardsAwaitingApproval: awaitingRes.count ?? 0,
          pointsExpiringAttention:
            "Points-expiring attention stays informational until an active expiry policy stamps earn rows.",
        };
      } catch (error) {
        return {
          state: "unavailable" as const,
          unavailableReason: error instanceof Error ? error.message : "Loyalty attention unavailable.",
          accountsWithBalance: 0,
          earnTransactionsToday: 0,
          burnTransactionsToday: 0,
          pendingManualReviewAdjustments: 0,
          rewardsCatalogueConfigured: false,
          rewardsCatalogueMessage: "Rewards catalogue unavailable.",
          rewardsAwaitingApproval: 0,
          pointsExpiringAttention: "Unavailable.",
        };
      }
    },
  };
}
