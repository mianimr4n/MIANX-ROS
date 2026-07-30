import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

export type LoyaltyTier = "member" | "silver" | "gold" | "platinum";

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

export interface LoyaltyService {
  listAccounts(limit?: number): Promise<LoyaltyAccountRecord[]>;
  earnForOrder(orderId: string, actorUserId: string | null): Promise<LoyaltyEarnResult>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

    async earnForOrder(orderId, actorUserId) {
      const client = supabase();
      const { data, error } = await client.rpc("loyalty_earn_for_order_atomic", {
        p_order_id: orderId,
        p_actor_user_id: actorUserId,
      });

      if (error) {
        const message = error.message ?? "Loyalty earn failed.";
        if (/ORDER_NOT_FOUND/i.test(message)) {
          throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
        }
        if (/ORDER_NOT_COMPLETED/i.test(message)) {
          throw new ApiError(409, "ORDER_NOT_COMPLETED", "Points can only be earned on completed orders.");
        }
        if (/ORDER_HAS_NO_CUSTOMER/i.test(message)) {
          throw new ApiError(409, "ORDER_HAS_NO_CUSTOMER", "Order has no linked customer for loyalty earn.");
        }
        throw new ApiError(500, "LOYALTY_EARN_FAILED", message);
      }

      const payload = data as LoyaltyEarnResult | null;
      if (!payload) {
        throw new ApiError(500, "LOYALTY_EARN_FAILED", "Loyalty earn returned no payload.");
      }
      return payload;
    },
  };
}
