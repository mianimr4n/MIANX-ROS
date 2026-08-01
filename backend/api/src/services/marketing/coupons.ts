import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const COUPON_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

export const COUPON_STATUSES = ["active", "inactive", "expired"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const CAMPAIGN_CHANNELS = ["whatsapp", "sms", "email", "push"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "awaiting_approval",
  "approved",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const SUBMISSION_STATUSES = [
  "queued",
  "suppressed",
  "submitted",
  "provider_accepted",
  "provider_rejected",
  "failed",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface CouponRecord {
  id: string;
  branchId: string | null;
  branchCode: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrder: number;
  expiryDate: string | null;
  status: CouponStatus;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  branchId?: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrder?: number;
  expiryDate?: string | null;
  status?: CouponStatus;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
}

export interface PatchCouponInput {
  status?: CouponStatus;
  expiryDate?: string | null;
  minOrder?: number;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  couponId?: string;
  code?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  discountApplied?: number;
  minOrder?: number;
  branchId?: string | null;
}

export interface CouponRedemptionRecord {
  id: string;
  couponId: string;
  orderId: string;
  branchId: string | null;
  customerId: string | null;
  code: string;
  discountApplied: number;
  status: "applied" | "reversed";
  createdAt: string;
}

export interface CampaignRecord {
  id: string;
  branchId: string | null;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  messageTemplate: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  providerDeliveryClaimed: false;
  providerDeliveryMessage: string;
}

export interface CampaignSubmissionRecord {
  id: string;
  campaignId: string;
  customerId: string | null;
  channel: CampaignChannel;
  status: SubmissionStatus;
  providerName: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuppressionRecord {
  id: string;
  customerId: string;
  channel: string;
  reason: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ConsentRecord {
  customerId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  marketingConsent: boolean;
  suppressedChannels: string[];
}

export interface MarketingAttentionSnapshot {
  state: "available" | "unavailable";
  unavailableReason: string | null;
  activeCoupons: number;
  couponsExpiringSoon: number;
  draftCampaigns: number;
  campaignsAwaitingSend: number;
  suppressedCustomers: number;
  consentOptOuts: number;
  providerConfigured: false;
  providerMessage: string;
}

export interface MarketingService {
  listCoupons(scope: BranchActorScope, branchId?: string): Promise<CouponRecord[]>;
  createCoupon(scope: BranchActorScope, input: CreateCouponInput): Promise<CouponRecord>;
  patchCoupon(scope: BranchActorScope, couponId: string, input: PatchCouponInput): Promise<CouponRecord>;
  validateCoupon(input: {
    code: string;
    branchId: string | null;
    subtotal: number;
    customerId?: string | null;
  }): Promise<CouponValidationResult>;
  recordRedemption(input: {
    couponId: string;
    orderId: string;
    branchId: string | null;
    customerId: string | null;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    discountApplied: number;
    orderSubtotal: number;
  }): Promise<CouponRedemptionRecord>;
  listRedemptions(scope: BranchActorScope, branchId?: string): Promise<CouponRedemptionRecord[]>;
  listCampaigns(scope: BranchActorScope, branchId?: string): Promise<CampaignRecord[]>;
  createCampaign(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId?: string | null;
      name: string;
      channel: CampaignChannel;
      messageTemplate: string;
      scheduledAt?: string | null;
    },
  ): Promise<CampaignRecord>;
  transitionCampaign(
    scope: BranchActorScope,
    campaignId: string,
    input: { status: CampaignStatus; cancelReason?: string | null },
  ): Promise<CampaignRecord>;
  listSubmissions(scope: BranchActorScope, campaignId: string): Promise<CampaignSubmissionRecord[]>;
  queueCampaignSubmissions(
    scope: BranchActorScope,
    campaignId: string,
    customerIds: string[],
  ): Promise<{ queued: number; suppressed: number }>;
  listSuppressions(limit?: number): Promise<SuppressionRecord[]>;
  upsertSuppression(
    actorUserId: string,
    input: { customerId: string; channel: string; reason: string },
  ): Promise<SuppressionRecord>;
  listConsent(limit?: number): Promise<ConsentRecord[]>;
  setConsent(customerId: string, marketingConsent: boolean): Promise<ConsentRecord>;
  getAttention(scope: BranchActorScope, branchId?: string): Promise<MarketingAttentionSnapshot>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PROVIDER_MSG =
  "Messaging provider is not configured — submissions remain queued or suppressed only.";

function mapCoupon(row: Record<string, unknown>): CouponRecord {
  const branch = row.branch as { branch_code?: string } | null;
  return {
    id: String(row.id),
    branchId: (row.branch_id as string | null) ?? null,
    branchCode: branch?.branch_code ?? null,
    code: String(row.code),
    discountType: row.discount_type as CouponDiscountType,
    discountValue: Number(row.discount_value),
    minOrder: Number(row.min_order) || 0,
    expiryDate: (row.expiry_date as string | null) ?? null,
    status: row.status as CouponStatus,
    maxRedemptions: row.max_redemptions == null ? null : Number(row.max_redemptions),
    perCustomerLimit: row.per_customer_limit == null ? null : Number(row.per_customer_limit),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCampaign(row: Record<string, unknown>): CampaignRecord {
  return {
    id: String(row.id),
    branchId: (row.branch_id as string | null) ?? null,
    name: String(row.name),
    channel: row.channel as CampaignChannel,
    status: row.status as CampaignStatus,
    messageTemplate: String(row.message_template),
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    cancelReason: (row.cancel_reason as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    providerDeliveryClaimed: false,
    providerDeliveryMessage: PROVIDER_MSG,
  };
}

const COUPON_SELECT =
  "id, branch_id, code, discount_type, discount_value, min_order, expiry_date, status, max_redemptions, per_customer_limit, created_at, updated_at, branch:branches(id, branch_code)";

export function createMarketingService(envStatus: EnvironmentStatus): MarketingService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listCoupons(scope, branchId) {
      if (branchId) assertBranchMembership(scope, branchId);
      const client = supabase();
      let query = client.from("coupons").select(COUPON_SELECT).order("created_at", { ascending: false });

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.or(`branch_id.in.(${scope.branchIds.join(",")}),branch_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throwMappedDbError("COUPONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapCoupon);
    },

    async createCoupon(scope, input) {
      if (input.branchId) {
        assertBranchMembership(scope, input.branchId);
        await loadBranchRow(supabase(), input.branchId);
      }

      const code = input.code.trim().toUpperCase();
      if (!code) throw new ApiError(400, "VALIDATION_ERROR", "Coupon code is required.");
      if (input.discountType === "percent" && input.discountValue > 100) {
        throw new ApiError(400, "VALIDATION_ERROR", "Percent discount cannot exceed 100.");
      }

      const { data, error } = await supabase()
        .from("coupons")
        .insert({
          branch_id: input.branchId || null,
          code,
          discount_type: input.discountType,
          discount_value: input.discountValue,
          min_order: input.minOrder ?? 0,
          expiry_date: input.expiryDate || null,
          status: input.status ?? "active",
          max_redemptions: input.maxRedemptions ?? null,
          per_customer_limit: input.perCustomerLimit ?? null,
        })
        .select(COUPON_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "COUPON_CODE_EXISTS", "A coupon with this code already exists.");
        }
        throwMappedDbError("COUPON_CREATE_FAILED", error);
      }
      return mapCoupon(data as unknown as Record<string, unknown>);
    },

    async patchCoupon(scope, couponId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("coupons")
        .select(COUPON_SELECT)
        .eq("id", couponId)
        .maybeSingle();
      if (readError) throwMappedDbError("COUPONS_READ_FAILED", readError);
      if (!existing) throw new ApiError(404, "COUPON_NOT_FOUND", "Coupon not found.");
      const before = mapCoupon(existing as unknown as Record<string, unknown>);
      if (before.branchId) assertBranchMembership(scope, before.branchId);

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status !== undefined) patch.status = input.status;
      if (input.expiryDate !== undefined) patch.expiry_date = input.expiryDate;
      if (input.minOrder !== undefined) patch.min_order = input.minOrder;
      if (input.maxRedemptions !== undefined) patch.max_redemptions = input.maxRedemptions;
      if (input.perCustomerLimit !== undefined) patch.per_customer_limit = input.perCustomerLimit;

      const { data, error } = await client
        .from("coupons")
        .update(patch)
        .eq("id", couponId)
        .select(COUPON_SELECT)
        .single();
      if (error) throwMappedDbError("COUPON_UPDATE_FAILED", error);
      return mapCoupon(data as unknown as Record<string, unknown>);
    },

    async validateCoupon(input) {
      const { data, error } = await supabase().rpc("coupon_validate_discount", {
        p_code: input.code,
        p_branch_id: input.branchId,
        p_subtotal: input.subtotal,
        p_customer_id: input.customerId ?? null,
      });
      if (error) {
        // Fallback if RPC not yet applied
        if (/coupon_validate_discount|does not exist/i.test(error.message)) {
          return { valid: false, reason: "COUPON_VALIDATION_UNAVAILABLE" };
        }
        throwMappedDbError("COUPON_VALIDATE_FAILED", error);
      }
      const payload = data as CouponValidationResult;
      return payload;
    },

    async recordRedemption(input) {
      const { data, error } = await supabase()
        .from("coupon_redemptions")
        .insert({
          coupon_id: input.couponId,
          order_id: input.orderId,
          branch_id: input.branchId,
          customer_id: input.customerId,
          code: input.code,
          discount_type: input.discountType,
          discount_value: input.discountValue,
          discount_applied: input.discountApplied,
          order_subtotal: input.orderSubtotal,
          status: "applied",
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "COUPON_ALREADY_REDEEMED", "This order already has a coupon redemption.");
        }
        throwMappedDbError("COUPON_REDEMPTION_FAILED", error);
      }
      const row = data as Record<string, unknown>;
      return {
        id: String(row.id),
        couponId: String(row.coupon_id),
        orderId: String(row.order_id),
        branchId: (row.branch_id as string | null) ?? null,
        customerId: (row.customer_id as string | null) ?? null,
        code: String(row.code),
        discountApplied: Number(row.discount_applied),
        status: row.status as "applied" | "reversed",
        createdAt: String(row.created_at),
      };
    },

    async listRedemptions(scope, branchId) {
      if (branchId) assertBranchMembership(scope, branchId);
      const client = supabase();
      let q = client.from("coupon_redemptions").select("*").order("created_at", { ascending: false }).limit(200);
      if (branchId) q = q.eq("branch_id", branchId);
      else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        q = q.in("branch_id", scope.branchIds);
      }
      const { data, error } = await q;
      if (error) throwMappedDbError("COUPON_REDEMPTIONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        couponId: String(row.coupon_id),
        orderId: String(row.order_id),
        branchId: (row.branch_id as string | null) ?? null,
        customerId: (row.customer_id as string | null) ?? null,
        code: String(row.code),
        discountApplied: Number(row.discount_applied),
        status: row.status as "applied" | "reversed",
        createdAt: String(row.created_at),
      }));
    },

    async listCampaigns(scope, branchId) {
      if (branchId) assertBranchMembership(scope, branchId);
      const client = supabase();
      let q = client.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
      if (branchId) q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);
      else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        q = q.or(`branch_id.in.(${scope.branchIds.join(",")}),branch_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throwMappedDbError("CAMPAIGNS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapCampaign);
    },

    async createCampaign(scope, actorUserId, input) {
      if (input.branchId) {
        assertBranchMembership(scope, input.branchId);
        await loadBranchRow(supabase(), input.branchId);
      }
      const name = input.name.trim();
      const template = input.messageTemplate.trim();
      if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Campaign name is required.");
      if (!template) throw new ApiError(400, "VALIDATION_ERROR", "Message template is required.");

      const status: CampaignStatus = input.scheduledAt ? "scheduled" : "draft";
      const { data, error } = await supabase()
        .from("marketing_campaigns")
        .insert({
          branch_id: input.branchId || null,
          name,
          channel: input.channel,
          status,
          message_template: template,
          scheduled_at: input.scheduledAt || null,
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("CAMPAIGN_CREATE_FAILED", error);
      return mapCampaign(data as unknown as Record<string, unknown>);
    },

    async transitionCampaign(scope, campaignId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("marketing_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (readError) throwMappedDbError("CAMPAIGNS_READ_FAILED", readError);
      if (!existing) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
      const before = mapCampaign(existing as unknown as Record<string, unknown>);
      if (before.branchId) assertBranchMembership(scope, before.branchId);

      if (input.status === "cancelled" && !input.cancelReason?.trim()) {
        throw new ApiError(400, "VALIDATION_ERROR", "cancelReason is required when cancelling a campaign.");
      }

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: input.status,
        updated_at: now,
      };
      if (input.status === "running") patch.started_at = before.startedAt ?? now;
      if (input.status === "completed") patch.completed_at = now;
      if (input.status === "cancelled") patch.cancel_reason = input.cancelReason!.trim();

      const { data, error } = await client
        .from("marketing_campaigns")
        .update(patch)
        .eq("id", campaignId)
        .select("*")
        .single();
      if (error) throwMappedDbError("CAMPAIGN_UPDATE_FAILED", error);
      return mapCampaign(data as unknown as Record<string, unknown>);
    },

    async listSubmissions(scope, campaignId) {
      const client = supabase();
      const { data: campaign, error: campError } = await client
        .from("marketing_campaigns")
        .select("id, branch_id")
        .eq("id", campaignId)
        .maybeSingle();
      if (campError) throwMappedDbError("CAMPAIGNS_READ_FAILED", campError);
      if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
      if (campaign.branch_id) assertBranchMembership(scope, campaign.branch_id);

      const { data, error } = await client
        .from("marketing_campaign_submissions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throwMappedDbError("SUBMISSIONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        campaignId: String(row.campaign_id),
        customerId: (row.customer_id as string | null) ?? null,
        channel: row.channel as CampaignChannel,
        status: row.status as SubmissionStatus,
        providerName: (row.provider_name as string | null) ?? null,
        providerMessageId: (row.provider_message_id as string | null) ?? null,
        failureReason: (row.failure_reason as string | null) ?? null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
    },

    async queueCampaignSubmissions(scope, campaignId, customerIds) {
      const client = supabase();
      const { data: campaign, error: campError } = await client
        .from("marketing_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (campError) throwMappedDbError("CAMPAIGNS_READ_FAILED", campError);
      if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
      const camp = mapCampaign(campaign as unknown as Record<string, unknown>);
      if (camp.branchId) assertBranchMembership(scope, camp.branchId);
      if (camp.status !== "running" && camp.status !== "scheduled" && camp.status !== "approved") {
        throw new ApiError(
          409,
          "CAMPAIGN_NOT_SENDABLE",
          "Campaign must be approved, scheduled, or running to queue submissions. Unapproved campaigns are blocked.",
        );
      }

      let queued = 0;
      let suppressed = 0;
      for (const customerId of customerIds) {
        const { data: customer } = await client
          .from("customers")
          .select("id, marketing_consent")
          .eq("id", customerId)
          .maybeSingle();
        if (!customer) continue;

        const { data: supp } = await client
          .from("marketing_suppressions")
          .select("id")
          .eq("customer_id", customerId)
          .or(`channel.eq.${camp.channel},channel.eq.all`)
          .limit(1);

        const isSuppressed = !customer.marketing_consent || (supp ?? []).length > 0;
        const status: SubmissionStatus = isSuppressed ? "suppressed" : "queued";
        if (isSuppressed) suppressed += 1;
        else queued += 1;

        await client.from("marketing_campaign_submissions").insert({
          campaign_id: campaignId,
          customer_id: customerId,
          channel: camp.channel,
          status,
          failure_reason: isSuppressed
            ? customer.marketing_consent
              ? "Suppressed by channel preference"
              : "Customer marketing consent is false"
            : null,
          provider_name: null,
          provider_message_id: null,
        });
      }

      return { queued, suppressed };
    },

    async listSuppressions(limit = 200) {
      const { data, error } = await supabase()
        .from("marketing_suppressions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 500));
      if (error) throwMappedDbError("SUPPRESSIONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        customerId: String(row.customer_id),
        channel: String(row.channel),
        reason: String(row.reason),
        createdBy: (row.created_by as string | null) ?? null,
        createdAt: String(row.created_at),
      }));
    },

    async upsertSuppression(actorUserId, input) {
      const reason = input.reason.trim();
      if (!reason) throw new ApiError(400, "VALIDATION_ERROR", "Suppression reason is required.");
      const { data, error } = await supabase()
        .from("marketing_suppressions")
        .upsert(
          {
            customer_id: input.customerId,
            channel: input.channel,
            reason,
            created_by: actorUserId,
          },
          { onConflict: "customer_id,channel" },
        )
        .select("*")
        .single();
      if (error) throwMappedDbError("SUPPRESSION_UPSERT_FAILED", error);
      const row = data as Record<string, unknown>;
      return {
        id: String(row.id),
        customerId: String(row.customer_id),
        channel: String(row.channel),
        reason: String(row.reason),
        createdBy: (row.created_by as string | null) ?? null,
        createdAt: String(row.created_at),
      };
    },

    async listConsent(limit = 200) {
      const client = supabase();
      const { data, error } = await client
        .from("customers")
        .select("id, full_name, phone, email, marketing_consent")
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 500));
      if (error) throwMappedDbError("CONSENT_READ_FAILED", error);

      const customerIds = (data ?? []).map((c) => c.id as string);
      const { data: supps } = customerIds.length
        ? await client.from("marketing_suppressions").select("customer_id, channel").in("customer_id", customerIds)
        : { data: [] };

      const byCustomer = new Map<string, string[]>();
      for (const s of supps ?? []) {
        const list = byCustomer.get(s.customer_id as string) ?? [];
        list.push(s.channel as string);
        byCustomer.set(s.customer_id as string, list);
      }

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        customerId: String(row.id),
        fullName: (row.full_name as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        email: (row.email as string | null) ?? null,
        marketingConsent: Boolean(row.marketing_consent),
        suppressedChannels: byCustomer.get(String(row.id)) ?? [],
      }));
    },

    async setConsent(customerId, marketingConsent) {
      const client = supabase();
      const { data, error } = await client
        .from("customers")
        .update({ marketing_consent: marketingConsent })
        .eq("id", customerId)
        .select("id, full_name, phone, email, marketing_consent")
        .maybeSingle();
      if (error) throwMappedDbError("CONSENT_UPDATE_FAILED", error);
      if (!data) throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
      return {
        customerId: String(data.id),
        fullName: (data.full_name as string | null) ?? null,
        phone: (data.phone as string | null) ?? null,
        email: (data.email as string | null) ?? null,
        marketingConsent: Boolean(data.marketing_consent),
        suppressedChannels: [],
      };
    },

    async getAttention(scope, branchId) {
      try {
        if (branchId) assertBranchMembership(scope, branchId);
        const client = supabase();
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        const soonDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(soon);

        let couponQ = client.from("coupons").select("id, status, expiry_date");
        let campQ = client.from("marketing_campaigns").select("id, status");
        if (branchId) {
          couponQ = couponQ.or(`branch_id.eq.${branchId},branch_id.is.null`);
          campQ = campQ.or(`branch_id.eq.${branchId},branch_id.is.null`);
        } else if (!scope.isSuperAdmin) {
          if (scope.branchIds.length === 0) {
            return emptyMarketingAttention();
          }
          couponQ = couponQ.or(`branch_id.in.(${scope.branchIds.join(",")}),branch_id.is.null`);
          campQ = campQ.or(`branch_id.in.(${scope.branchIds.join(",")}),branch_id.is.null`);
        }

        const [coupons, camps, supps, consentOff] = await Promise.all([
          couponQ,
          campQ,
          client.from("marketing_suppressions").select("id", { count: "exact", head: true }),
          client
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("marketing_consent", false),
        ]);

        const couponRows = coupons.data ?? [];
        const campRows = camps.data ?? [];

        return {
          state: "available" as const,
          unavailableReason: null,
          activeCoupons: couponRows.filter((c) => c.status === "active").length,
          couponsExpiringSoon: couponRows.filter(
            (c) =>
              c.status === "active" &&
              c.expiry_date &&
              String(c.expiry_date) >= today &&
              String(c.expiry_date) <= soonDate,
          ).length,
          draftCampaigns: campRows.filter((c) => c.status === "draft").length,
          campaignsAwaitingSend: campRows.filter((c) => c.status === "scheduled" || c.status === "running")
            .length,
          suppressedCustomers: supps.count ?? 0,
          consentOptOuts: consentOff.count ?? 0,
          providerConfigured: false as const,
          providerMessage: PROVIDER_MSG,
        };
      } catch (error) {
        return {
          ...emptyMarketingAttention(),
          state: "unavailable" as const,
          unavailableReason: error instanceof Error ? error.message : "Marketing attention unavailable.",
        };
      }
    },
  };
}

function emptyMarketingAttention(): MarketingAttentionSnapshot {
  return {
    state: "available",
    unavailableReason: null,
    activeCoupons: 0,
    couponsExpiringSoon: 0,
    draftCampaigns: 0,
    campaignsAwaitingSend: 0,
    suppressedCustomers: 0,
    consentOptOuts: 0,
    providerConfigured: false,
    providerMessage: PROVIDER_MSG,
  };
}
