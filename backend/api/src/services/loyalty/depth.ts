/**
 * RC4-11 Loyalty depth — rewards catalogue, tiers, customer experience,
 * redemption governance, expiry/liability. Reuses loyalty_* ledger RPCs.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { LoyaltyService, LoyaltyTier } from "./management.js";

export const REWARD_TYPES = [
  "fixed_discount",
  "percentage_discount",
  "free_item",
  "category_reward",
  "delivery_fee_waiver",
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_APPROVAL = ["draft", "awaiting_approval", "approved", "rejected"] as const;
export type RewardApprovalStatus = (typeof REWARD_APPROVAL)[number];

export type LoyaltyRewardRecord = {
  id: string;
  branchId: string | null;
  name: string;
  description: string | null;
  rewardType: RewardType;
  pointsCost: number;
  monetaryValue: number | null;
  productRef: string | null;
  categoryRef: string | null;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  perCustomerLimit: number | null;
  globalRedemptionLimit: number | null;
  minOrderAmount: number;
  approvalStatus: RewardApprovalStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyTierDefinition = {
  id: string;
  tierCode: LoyaltyTier;
  name: string;
  qualificationRule: "lifetime_earned_points" | "rolling_earned_points";
  thresholdPoints: number;
  rollingPeriodDays: number | null;
  earningMultiplier: number;
  benefits: Record<string, unknown>;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type CustomerLoyaltyExperience = {
  state:
    | "no_account"
    | "zero_balance"
    | "available"
    | "unavailable";
  unavailableReason: string | null;
  customerId: string;
  accountId: string | null;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  pointsExpiringSoon: number | null;
  pointsExpiringSoonMessage: string | null;
  currentTier: LoyaltyTier | null;
  nextTier: { tierCode: LoyaltyTier; name: string; pointsRemaining: number } | null;
  availableRewards: Array<{
    reward: LoyaltyRewardRecord;
    eligible: boolean;
    ineligibilityReason: string | null;
  }>;
  recentTransactions: Array<{
    id: string;
    points: number;
    type: string;
    note: string | null;
    createdAt: string;
  }>;
  redemptionHistory: Array<{
    id: string;
    rewardId: string;
    pointsBurned: number;
    status: string;
    createdAt: string;
  }>;
  terms: string;
};

export type RedeemRewardResult = {
  redemptionId: string;
  loyaltyTransactionId: string | null;
  pointsBurned: number;
  pointsBalance: number;
  idempotentReplay: boolean;
  status: "applied";
};

export type LiabilitySnapshot = {
  outstandingPointBalance: number;
  pointsExpiringSoon: number | null;
  expiredPoints: number;
  earned: number;
  redeemed: number;
  redemptionRate: number | null;
  liabilityPkr: number | null;
  liabilityMessage: string;
  valuationConfigured: boolean;
};

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapReward(row: Record<string, unknown>): LoyaltyRewardRecord {
  return {
    id: String(row.id),
    branchId: (row.branch_id as string | null) ?? null,
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    rewardType: row.reward_type as RewardType,
    pointsCost: Number(row.points_cost),
    monetaryValue: row.monetary_value == null ? null : Number(row.monetary_value),
    productRef: (row.product_ref as string | null) ?? null,
    categoryRef: (row.category_ref as string | null) ?? null,
    isActive: Boolean(row.is_active),
    validFrom: (row.valid_from as string | null) ?? null,
    validTo: (row.valid_to as string | null) ?? null,
    perCustomerLimit: row.per_customer_limit == null ? null : Number(row.per_customer_limit),
    globalRedemptionLimit: row.global_redemption_limit == null ? null : Number(row.global_redemption_limit),
    minOrderAmount: Number(row.min_order_amount) || 0,
    approvalStatus: row.approval_status as RewardApprovalStatus,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function todayKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Pure eligibility checks (no DB limit counts). Used by redeem + unit tests. */
export function evaluateRewardEligibilityBasics(input: {
  reward: Pick<
    LoyaltyRewardRecord,
    "approvalStatus" | "isActive" | "validFrom" | "validTo" | "branchId" | "pointsCost" | "minOrderAmount"
  >;
  pointsBalance: number;
  branchId?: string | null;
  orderSubtotal?: number;
  today?: string;
}): { eligible: boolean; reason: string | null } {
  const { reward, pointsBalance, branchId, orderSubtotal } = input;
  const today = input.today ?? todayKarachi();
  if (reward.approvalStatus !== "approved" || !reward.isActive) {
    return { eligible: false, reason: "Reward is not approved/active." };
  }
  if (reward.validFrom && today < reward.validFrom) {
    return { eligible: false, reason: "Reward not yet valid." };
  }
  if (reward.validTo && today > reward.validTo) {
    return { eligible: false, reason: "expired reward" };
  }
  if (reward.branchId && branchId && reward.branchId !== branchId) {
    return { eligible: false, reason: "branch-ineligible" };
  }
  if (reward.branchId && !branchId) {
    return { eligible: false, reason: "branch-ineligible" };
  }
  if (pointsBalance < reward.pointsCost) {
    return { eligible: false, reason: "insufficient points" };
  }
  if (orderSubtotal != null && orderSubtotal < reward.minOrderAmount) {
    return { eligible: false, reason: "minimum order not met" };
  }
  return { eligible: true, reason: null };
}

async function writeAudit(
  client: SupabaseClient,
  input: {
    actorUserId: string | null;
    requestId?: string | null;
    branchId?: string | null;
    customerId?: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  },
) {
  await client.from("loyalty_marketing_audit_events").insert({
    actor_user_id: input.actorUserId,
    request_id: input.requestId ?? null,
    branch_id: input.branchId ?? null,
    customer_id: input.customerId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
    reason: input.reason ?? null,
  });
}

export interface LoyaltyDepthService {
  listRewards(query?: { branchId?: string; includeInactive?: boolean }): Promise<LoyaltyRewardRecord[]>;
  createReward(
    actorUserId: string,
    input: {
      branchId?: string | null;
      name: string;
      description?: string | null;
      rewardType: RewardType;
      pointsCost: number;
      monetaryValue?: number | null;
      productRef?: string | null;
      categoryRef?: string | null;
      validFrom?: string | null;
      validTo?: string | null;
      perCustomerLimit?: number | null;
      globalRedemptionLimit?: number | null;
      minOrderAmount?: number;
    },
  ): Promise<LoyaltyRewardRecord>;
  transitionRewardApproval(
    actorUserId: string,
    rewardId: string,
    approvalStatus: RewardApprovalStatus,
    activate?: boolean,
  ): Promise<LoyaltyRewardRecord>;
  listTierDefinitions(): Promise<LoyaltyTierDefinition[]>;
  evaluateAndApplyTier(actorUserId: string | null, customerId: string): Promise<{
    fromTier: LoyaltyTier | null;
    toTier: LoyaltyTier;
    changed: boolean;
  }>;
  manualTierChange(
    actorUserId: string,
    input: { customerId: string; toTier: LoyaltyTier; reason: string },
  ): Promise<{ fromTier: LoyaltyTier; toTier: LoyaltyTier }>;
  getCustomerExperience(customerId: string, branchId?: string | null): Promise<CustomerLoyaltyExperience>;
  redeemReward(input: {
    customerId: string;
    rewardId: string;
    actorUserId: string | null;
    branchId?: string | null;
    orderId?: string | null;
    orderSubtotal?: number;
    idempotencyKey: string;
  }): Promise<RedeemRewardResult>;
  getLiabilitySnapshot(): Promise<LiabilitySnapshot>;
  listExpiryPolicies(): Promise<unknown[]>;
  upsertExpiryPolicy(
    actorUserId: string,
    input: {
      id?: string;
      name: string;
      expireAfterDays: number;
      effectiveFrom: string;
      isActive?: boolean;
      valuationRule?: "none" | "configured_rate" | null;
      pointsToPkrRate?: number | null;
    },
  ): Promise<unknown>;
}

export function createLoyaltyDepthService(
  envStatus: EnvironmentStatus,
  loyalty: LoyaltyService,
): LoyaltyDepthService {
  const supabase = () => createServiceClient(envStatus);

  async function loadReward(client: SupabaseClient, rewardId: string): Promise<LoyaltyRewardRecord> {
    const { data, error } = await client.from("loyalty_rewards").select("*").eq("id", rewardId).maybeSingle();
    if (error) throwMappedDbError("LOYALTY_REWARD_READ_FAILED", error);
    if (!data) throw new ApiError(404, "REWARD_NOT_FOUND", "Reward not found.");
    return mapReward(data as Record<string, unknown>);
  }

  function assertRewardShape(input: {
    rewardType: RewardType;
    monetaryValue?: number | null;
    productRef?: string | null;
    categoryRef?: string | null;
  }) {
    if (input.rewardType === "fixed_discount" || input.rewardType === "percentage_discount") {
      if (input.monetaryValue == null || !(input.monetaryValue > 0)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Discount rewards require monetaryValue.");
      }
      if (input.rewardType === "percentage_discount" && input.monetaryValue > 100) {
        throw new ApiError(400, "VALIDATION_ERROR", "Percentage discount cannot exceed 100.");
      }
    }
    if (input.rewardType === "free_item" && !input.productRef) {
      throw new ApiError(400, "VALIDATION_ERROR", "free_item requires productRef.");
    }
    if (input.rewardType === "category_reward" && !input.categoryRef) {
      throw new ApiError(400, "VALIDATION_ERROR", "category_reward requires categoryRef.");
    }
  }

  async function eligibilityFor(
    client: SupabaseClient,
    reward: LoyaltyRewardRecord,
    customerId: string,
    pointsBalance: number,
    branchId?: string | null,
    orderSubtotal?: number,
  ): Promise<{ eligible: boolean; reason: string | null }> {
    const basics = evaluateRewardEligibilityBasics({
      reward,
      pointsBalance,
      branchId,
      orderSubtotal,
    });
    if (!basics.eligible) return basics;
    if (reward.perCustomerLimit != null) {
      const { count, error } = await client
        .from("loyalty_reward_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("reward_id", reward.id)
        .eq("customer_id", customerId)
        .eq("status", "applied");
      if (error) throwMappedDbError("LOYALTY_REDEMPTION_COUNT_FAILED", error);
      if ((count ?? 0) >= reward.perCustomerLimit) {
        return { eligible: false, reason: "limit reached" };
      }
    }
    if (reward.globalRedemptionLimit != null) {
      const { count, error } = await client
        .from("loyalty_reward_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("reward_id", reward.id)
        .eq("status", "applied");
      if (error) throwMappedDbError("LOYALTY_REDEMPTION_COUNT_FAILED", error);
      if ((count ?? 0) >= reward.globalRedemptionLimit) {
        return { eligible: false, reason: "limit reached" };
      }
    }
    return { eligible: true, reason: null };
  }

  return {
    async listRewards(query) {
      const client = supabase();
      let q = client.from("loyalty_rewards").select("*").order("updated_at", { ascending: false }).limit(100);
      if (query?.branchId) q = q.or(`branch_id.eq.${query.branchId},branch_id.is.null`);
      if (!query?.includeInactive) {
        q = q.eq("is_active", true).eq("approval_status", "approved");
      }
      const { data, error } = await q;
      if (error) throwMappedDbError("LOYALTY_REWARDS_LIST_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapReward);
    },

    async createReward(actorUserId, input) {
      assertRewardShape(input);
      const client = supabase();
      const row = {
        branch_id: input.branchId ?? null,
        name: input.name,
        description: input.description ?? null,
        reward_type: input.rewardType,
        points_cost: input.pointsCost,
        monetary_value: input.monetaryValue ?? null,
        product_ref: input.productRef ?? null,
        category_ref: input.categoryRef ?? null,
        valid_from: input.validFrom ?? null,
        valid_to: input.validTo ?? null,
        per_customer_limit: input.perCustomerLimit ?? null,
        global_redemption_limit: input.globalRedemptionLimit ?? null,
        min_order_amount: input.minOrderAmount ?? 0,
        approval_status: "draft",
        is_active: false,
        created_by: actorUserId,
      };
      const { data, error } = await client.from("loyalty_rewards").insert(row).select("*").single();
      if (error) throwMappedDbError("LOYALTY_REWARD_CREATE_FAILED", error);
      const mapped = mapReward(data as Record<string, unknown>);
      await writeAudit(client, {
        actorUserId,
        entityType: "loyalty_reward",
        entityId: mapped.id,
        action: "create",
        after: mapped,
        branchId: mapped.branchId,
      });
      return mapped;
    },

    async transitionRewardApproval(actorUserId, rewardId, approvalStatus, activate) {
      const client = supabase();
      const before = await loadReward(client, rewardId);
      const patch: Record<string, unknown> = {
        approval_status: approvalStatus,
        updated_at: new Date().toISOString(),
      };
      if (activate != null) patch.is_active = activate && approvalStatus === "approved";
      if (approvalStatus !== "approved") patch.is_active = false;
      const { data, error } = await client
        .from("loyalty_rewards")
        .update(patch)
        .eq("id", rewardId)
        .select("*")
        .single();
      if (error) throwMappedDbError("LOYALTY_REWARD_UPDATE_FAILED", error);
      const mapped = mapReward(data as Record<string, unknown>);
      await writeAudit(client, {
        actorUserId,
        entityType: "loyalty_reward",
        entityId: rewardId,
        action: `approval:${approvalStatus}`,
        before,
        after: mapped,
      });
      return mapped;
    },

    async listTierDefinitions() {
      const client = supabase();
      const { data, error } = await client
        .from("loyalty_tier_definitions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throwMappedDbError("LOYALTY_TIERS_LIST_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        tierCode: row.tier_code as LoyaltyTier,
        name: String(row.name),
        qualificationRule: row.qualification_rule as LoyaltyTierDefinition["qualificationRule"],
        thresholdPoints: Number(row.threshold_points),
        rollingPeriodDays: row.rolling_period_days == null ? null : Number(row.rolling_period_days),
        earningMultiplier: Number(row.earning_multiplier),
        benefits: (row.benefits as Record<string, unknown>) ?? {},
        effectiveFrom: (row.effective_from as string | null) ?? null,
        effectiveTo: (row.effective_to as string | null) ?? null,
        isActive: Boolean(row.is_active),
        sortOrder: Number(row.sort_order) || 0,
      }));
    },

    async evaluateAndApplyTier(actorUserId, customerId) {
      const client = supabase();
      const { data: account, error } = await client
        .from("loyalty_accounts")
        .select("id, tier, customer_id")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (error) throwMappedDbError("LOYALTY_ACCOUNT_READ_FAILED", error);
      if (!account) {
        throw new ApiError(404, "LOYALTY_ACCOUNT_NOT_FOUND", "Loyalty account not found.");
      }
      const { data: earns, error: earnErr } = await client
        .from("loyalty_transactions")
        .select("points, type")
        .eq("loyalty_account_id", account.id)
        .eq("type", "earn");
      if (earnErr) throwMappedDbError("LOYALTY_TXN_READ_FAILED", earnErr);
      const lifetimeEarned = (earns ?? []).reduce((s, r) => s + Number((r as { points: number }).points), 0);

      const tiers = (await this.listTierDefinitions()).filter((t) => t.isActive);
      if (tiers.length === 0) {
        throw new ApiError(409, "TIER_RULES_INCOMPLETE", "No active tier definitions — refuse assignment.");
      }
      const qualified = [...tiers]
        .filter((t) => t.qualificationRule === "lifetime_earned_points" && lifetimeEarned >= t.thresholdPoints)
        .sort((a, b) => b.thresholdPoints - a.thresholdPoints)[0];
      if (!qualified) {
        throw new ApiError(409, "TIER_RULES_INCOMPLETE", "Unable to qualify tier from available rules.");
      }
      const fromTier = account.tier as LoyaltyTier;
      const toTier = qualified.tierCode;
      if (fromTier === toTier) return { fromTier, toTier, changed: false };

      const { error: updErr } = await client
        .from("loyalty_accounts")
        .update({ tier: toTier, updated_at: new Date().toISOString() })
        .eq("id", account.id);
      if (updErr) throwMappedDbError("LOYALTY_TIER_UPDATE_FAILED", updErr);
      await client.from("loyalty_tier_history").insert({
        loyalty_account_id: account.id,
        customer_id: customerId,
        from_tier: fromTier,
        to_tier: toTier,
        reason: `Automatic qualification: lifetime earned ${lifetimeEarned} >= ${qualified.thresholdPoints}`,
        actor_user_id: actorUserId,
        is_manual: false,
      });
      await writeAudit(client, {
        actorUserId,
        customerId,
        entityType: "loyalty_tier",
        entityId: account.id,
        action: "auto_qualify",
        before: { tier: fromTier },
        after: { tier: toTier, lifetimeEarned },
      });
      return { fromTier, toTier, changed: true };
    },

    async manualTierChange(actorUserId, input) {
      if (!input.reason.trim()) {
        throw new ApiError(400, "VALIDATION_ERROR", "Manual tier change requires a reason.");
      }
      const client = supabase();
      const { data: account, error } = await client
        .from("loyalty_accounts")
        .select("id, tier")
        .eq("customer_id", input.customerId)
        .maybeSingle();
      if (error) throwMappedDbError("LOYALTY_ACCOUNT_READ_FAILED", error);
      if (!account) throw new ApiError(404, "LOYALTY_ACCOUNT_NOT_FOUND", "Loyalty account not found.");
      const fromTier = account.tier as LoyaltyTier;
      const { error: updErr } = await client
        .from("loyalty_accounts")
        .update({ tier: input.toTier, updated_at: new Date().toISOString() })
        .eq("id", account.id);
      if (updErr) throwMappedDbError("LOYALTY_TIER_UPDATE_FAILED", updErr);
      await client.from("loyalty_tier_history").insert({
        loyalty_account_id: account.id,
        customer_id: input.customerId,
        from_tier: fromTier,
        to_tier: input.toTier,
        reason: input.reason,
        actor_user_id: actorUserId,
        is_manual: true,
      });
      await writeAudit(client, {
        actorUserId,
        customerId: input.customerId,
        entityType: "loyalty_tier",
        entityId: account.id,
        action: "manual_change",
        before: { tier: fromTier },
        after: { tier: input.toTier },
        reason: input.reason,
      });
      return { fromTier, toTier: input.toTier };
    },

    async getCustomerExperience(customerId, branchId) {
      const client = supabase();
      const { data: account, error } = await client
        .from("loyalty_accounts")
        .select("id, points_balance, tier")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (error) {
        return {
          state: "unavailable",
          unavailableReason: error.message,
          customerId,
          accountId: null,
          pointsBalance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          pointsExpiringSoon: null,
          pointsExpiringSoonMessage: "Expiry aging requires active policy + earn expiry stamps.",
          currentTier: null,
          nextTier: null,
          availableRewards: [],
          recentTransactions: [],
          redemptionHistory: [],
          terms: "Points and rewards subject to Telepizza Pakistan loyalty terms.",
        };
      }
      if (!account) {
        return {
          state: "no_account",
          unavailableReason: null,
          customerId,
          accountId: null,
          pointsBalance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          pointsExpiringSoon: null,
          pointsExpiringSoonMessage: null,
          currentTier: null,
          nextTier: null,
          availableRewards: [],
          recentTransactions: [],
          redemptionHistory: [],
          terms: "Open a loyalty account by completing an eligible order.",
        };
      }

      const { data: txns } = await client
        .from("loyalty_transactions")
        .select("id, points, type, note, created_at")
        .eq("loyalty_account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const lifetimeEarned = (txns ?? [])
        .filter((t) => (t as { type: string }).type === "earn")
        .reduce((s, t) => s + Number((t as { points: number }).points), 0);
      const lifetimeRedeemed = (txns ?? [])
        .filter((t) => (t as { type: string }).type === "burn")
        .reduce((s, t) => s + Number((t as { points: number }).points), 0);

      const rewards = await this.listRewards({ branchId: branchId ?? undefined, includeInactive: false });
      const balance = Number(account.points_balance) || 0;
      const availableRewards = [];
      for (const reward of rewards) {
        const elig = await eligibilityFor(client, reward, customerId, balance, branchId);
        if (elig.eligible) {
          availableRewards.push({ reward, eligible: true, ineligibilityReason: null });
        }
      }

      const tiers = await this.listTierDefinitions();
      const currentTier = account.tier as LoyaltyTier;
      const currentDef = tiers.find((t) => t.tierCode === currentTier);
      const next = [...tiers]
        .filter((t) => t.isActive && t.thresholdPoints > (currentDef?.thresholdPoints ?? 0))
        .sort((a, b) => a.thresholdPoints - b.thresholdPoints)[0];
      const nextTier = next
        ? {
            tierCode: next.tierCode,
            name: next.name,
            pointsRemaining: Math.max(0, next.thresholdPoints - lifetimeEarned),
          }
        : null;

      const { data: redemptions } = await client
        .from("loyalty_reward_redemptions")
        .select("id, reward_id, points_burned, status, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50);

      return {
        state: balance === 0 ? "zero_balance" : "available",
        unavailableReason: null,
        customerId,
        accountId: String(account.id),
        pointsBalance: balance,
        lifetimeEarned,
        lifetimeRedeemed,
        pointsExpiringSoon: null,
        pointsExpiringSoonMessage:
          "Points expiring soon is UNAVAILABLE until an active expiry policy stamps earn rows.",
        currentTier,
        nextTier,
        availableRewards,
        recentTransactions: ((txns ?? []) as Array<Record<string, unknown>>).map((t) => ({
          id: String(t.id),
          points: Number(t.points),
          type: String(t.type),
          note: (t.note as string | null) ?? null,
          createdAt: String(t.created_at),
        })),
        redemptionHistory: ((redemptions ?? []) as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          rewardId: String(r.reward_id),
          pointsBurned: Number(r.points_burned),
          status: String(r.status),
          createdAt: String(r.created_at),
        })),
        terms: "Rewards require approved catalogue items. One coupon per order. Points burns are ledger-backed.",
      };
    },

    async redeemReward(input) {
      if (!input.idempotencyKey?.trim()) {
        throw new ApiError(400, "VALIDATION_ERROR", "idempotencyKey is required for reward redemption.");
      }
      const client = supabase();
      const reward = await loadReward(client, input.rewardId);

      const { data: existing } = await client
        .from("loyalty_reward_redemptions")
        .select("id, loyalty_transaction_id, points_burned, status")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existing && (existing as { status: string }).status === "applied") {
        const accounts = await loyalty.listAccounts(500);
        const acct = accounts.find((a) => a.customerId === input.customerId);
        return {
          redemptionId: String((existing as { id: string }).id),
          loyaltyTransactionId: ((existing as { loyalty_transaction_id: string | null }).loyalty_transaction_id) ?? null,
          pointsBurned: Number((existing as { points_burned: number }).points_burned),
          pointsBalance: acct?.pointsBalance ?? 0,
          idempotentReplay: true,
          status: "applied",
        };
      }

      const accounts = await loyalty.listAccounts(500);
      const acct = accounts.find((a) => a.customerId === input.customerId);
      if (!acct) throw new ApiError(404, "LOYALTY_ACCOUNT_NOT_FOUND", "Loyalty account not found.");

      const elig = await eligibilityFor(
        client,
        reward,
        input.customerId,
        acct.pointsBalance,
        input.branchId,
        input.orderSubtotal,
      );
      if (!elig.eligible) {
        const code =
          elig.reason === "insufficient points"
            ? "INSUFFICIENT_POINTS"
            : elig.reason === "expired reward"
              ? "REWARD_EXPIRED"
              : elig.reason === "limit reached"
                ? "REDEMPTION_LIMIT_REACHED"
                : "REWARD_INELIGIBLE";
        throw new ApiError(409, code, elig.reason ?? "Reward not redeemable.");
      }

      const burn = await loyalty.burn({
        customerId: input.customerId,
        points: reward.pointsCost,
        orderId: input.orderId ?? null,
        note: `Reward redemption: ${reward.name}`,
        actorUserId: input.actorUserId,
        idempotencyKey: `reward:${input.idempotencyKey}`,
      });

      const { data: redemption, error } = await client
        .from("loyalty_reward_redemptions")
        .insert({
          reward_id: reward.id,
          loyalty_account_id: acct.id,
          customer_id: input.customerId,
          branch_id: input.branchId ?? reward.branchId,
          order_id: input.orderId ?? null,
          points_burned: reward.pointsCost,
          loyalty_transaction_id: burn.transactionId,
          status: "applied",
          idempotency_key: input.idempotencyKey,
          actor_user_id: input.actorUserId,
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("LOYALTY_REDEMPTION_CREATE_FAILED", error);

      await writeAudit(client, {
        actorUserId: input.actorUserId,
        customerId: input.customerId,
        branchId: input.branchId ?? null,
        entityType: "loyalty_reward_redemption",
        entityId: String((redemption as { id: string }).id),
        action: "redeem",
        after: redemption,
      });

      return {
        redemptionId: String((redemption as { id: string }).id),
        loyaltyTransactionId: burn.transactionId,
        pointsBurned: reward.pointsCost,
        pointsBalance: burn.pointsBalance,
        idempotentReplay: Boolean(burn.idempotentReplay),
        status: "applied",
      };
    },

    async getLiabilitySnapshot() {
      const client = supabase();
      const accounts = await loyalty.listAccounts(200);
      const outstanding = accounts.reduce((s, a) => s + a.pointsBalance, 0);

      async function sumPointsByType(type: string): Promise<number> {
        const pageSize = 1000;
        const maxPages = 10;
        let sum = 0;
        for (let page = 0; page < maxPages; page += 1) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await client
            .from("loyalty_transactions")
            .select("points")
            .eq("type", type)
            .range(from, to);
          if (error) throwMappedDbError("LOYALTY_LIABILITY_SUM_FAILED", error);
          const rows = data ?? [];
          if (rows.length === 0) break;
          sum += rows.reduce((s, row) => s + Number((row as { points: number }).points), 0);
          if (rows.length < pageSize) break;
        }
        return sum;
      }

      const [earned, redeemed, expired] = await Promise.all([
        sumPointsByType("earn"),
        sumPointsByType("burn"),
        sumPointsByType("expire"),
      ]);

      const { data: policies } = await client
        .from("loyalty_expiry_policies")
        .select("*")
        .eq("is_active", true)
        .limit(1);
      const policy = (policies ?? [])[0] as
        | { valuation_rule?: string; points_to_pkr_rate?: number }
        | undefined;
      const valuationConfigured = policy?.valuation_rule === "configured_rate" && Number(policy.points_to_pkr_rate) > 0;
      return {
        outstandingPointBalance: outstanding,
        pointsExpiringSoon: null,
        expiredPoints: expired,
        earned,
        redeemed,
        redemptionRate: earned > 0 ? Math.round((redeemed / earned) * 10000) / 100 : null,
        liabilityPkr: valuationConfigured
          ? Math.round(outstanding * Number(policy!.points_to_pkr_rate!) * 100) / 100
          : null,
        liabilityMessage: valuationConfigured
          ? "Liability uses configured points→PKR rate."
          : "Liability PKR UNAVAILABLE — no approved valuation rule.",
        valuationConfigured,
      };
    },

    async listExpiryPolicies() {
      const client = supabase();
      const { data, error } = await client.from("loyalty_expiry_policies").select("*").order("created_at", {
        ascending: false,
      });
      if (error) throwMappedDbError("LOYALTY_EXPIRY_POLICY_LIST_FAILED", error);
      return data ?? [];
    },

    async upsertExpiryPolicy(actorUserId, input) {
      const client = supabase();
      const row = {
        name: input.name,
        expire_after_days: input.expireAfterDays,
        effective_from: input.effectiveFrom,
        is_active: input.isActive ?? false,
        valuation_rule: input.valuationRule ?? "none",
        points_to_pkr_rate: input.pointsToPkrRate ?? null,
        created_by: actorUserId,
        updated_at: new Date().toISOString(),
      };
      let data;
      let error;
      if (input.id) {
        ({ data, error } = await client.from("loyalty_expiry_policies").update(row).eq("id", input.id).select("*").single());
      } else {
        ({ data, error } = await client.from("loyalty_expiry_policies").insert(row).select("*").single());
      }
      if (error) throwMappedDbError("LOYALTY_EXPIRY_POLICY_UPSERT_FAILED", error);
      await writeAudit(client, {
        actorUserId,
        entityType: "loyalty_expiry_policy",
        entityId: String((data as { id: string }).id),
        action: input.id ? "update" : "create",
        after: data,
      });
      return data;
    },
  };
}
