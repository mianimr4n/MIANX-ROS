/**
 * RC4-11 Marketing depth — segments, templates, campaign workflow, attribution.
 * Extends MarketingService; does not replace coupons/campaigns foundations.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import {
  type CampaignChannel,
  type CampaignStatus,
  type MarketingService,
} from "./coupons.js";
import { getProviderAdapter, type ProviderChannel } from "./providers.js";

export const DEPTH_CAMPAIGN_STATUSES = [
  "draft",
  "awaiting_approval",
  "approved",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
] as const;

/** Pure campaign lifecycle matrix — queue only when approved|scheduled|running. */
export const DEPTH_CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  draft: ["awaiting_approval", "cancelled"],
  awaiting_approval: ["approved", "draft", "cancelled"],
  approved: ["scheduled", "running", "cancelled"],
  scheduled: ["running", "paused", "cancelled"],
  running: ["paused", "completed", "cancelled"],
  paused: ["running", "cancelled", "completed"],
  completed: [],
  cancelled: [],
};

export function isDepthCampaignTransitionAllowed(from: string, to: string): boolean {
  return (DEPTH_CAMPAIGN_TRANSITIONS[from] ?? []).includes(to);
}

export function canQueueCampaignStatus(status: string): boolean {
  return ["approved", "scheduled", "running"].includes(status);
}

export function stripTemplateUnsafeHtml(body: string): string {
  return body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/on\w+=["'][^"']*["']/gi, "");
}

export function extractTemplateVariables(body: string, subject?: string | null): string[] {
  const text = `${subject ?? ""}\n${body}`;
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

export type SegmentRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  formula: string;
  authoritativeSource: string;
  timeWindow: string;
  exclusions: string;
  branchScope: string;
  freshness: string;
  completeness: string;
  isActive: boolean;
};

export type TemplateRecord = {
  id: string;
  name: string;
  channel: CampaignChannel;
  language: string;
  subject: string | null;
  body: string;
  variables: string[];
  providerApprovalState: string;
  isActive: boolean;
  branchId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SegmentPreview = {
  segment: SegmentRecord;
  memberCount: number | null;
  sampleCustomerIds: string[];
  status: "LIVE" | "UNAVAILABLE";
  reason: string | null;
};

export type AttributionSummary = {
  redemptions: number;
  attributableOrders: number;
  attributableRevenue: number;
  conversionRate: number | null;
  note: string;
};

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function audit(
  client: SupabaseClient,
  input: {
    actorUserId: string | null;
    branchId?: string | null;
    customerId?: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
    providerRef?: string | null;
  },
) {
  await client.from("loyalty_marketing_audit_events").insert({
    actor_user_id: input.actorUserId,
    branch_id: input.branchId ?? null,
    customer_id: input.customerId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
    reason: input.reason ?? null,
    provider_ref: input.providerRef ?? null,
  });
}

export interface MarketingDepthService {
  listSegments(): Promise<SegmentRecord[]>;
  previewSegment(code: string, opts?: { inactiveDays?: number; threshold?: number }): Promise<SegmentPreview>;
  listTemplates(channel?: CampaignChannel): Promise<TemplateRecord[]>;
  createTemplate(
    actorUserId: string,
    input: {
      name: string;
      channel: CampaignChannel;
      language?: string;
      subject?: string | null;
      body: string;
      branchId?: string | null;
    },
  ): Promise<TemplateRecord>;
  createDepthCampaign(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      branchId?: string | null;
      name: string;
      channel: CampaignChannel;
      messageTemplate?: string;
      templateId?: string | null;
      segmentId?: string | null;
      couponId?: string | null;
      rewardId?: string | null;
      objective?: string | null;
      scheduledAt?: string | null;
      budgetMetadata?: Record<string, unknown>;
    },
  ): Promise<unknown>;
  transitionDepthCampaign(
    scope: BranchActorScope,
    actorUserId: string,
    campaignId: string,
    status: (typeof DEPTH_CAMPAIGN_STATUSES)[number],
    cancelReason?: string | null,
  ): Promise<unknown>;
  queueWithProviderGate(
    scope: BranchActorScope,
    campaignId: string,
    customerIds: string[],
  ): Promise<{ queued: number; suppressed: number; providerConfigured: false; message: string }>;
  recordAttribution(input: {
    orderId: string;
    sourceType: "coupon" | "campaign" | "reward_redemption" | "provider_ref";
    couponId?: string | null;
    campaignId?: string | null;
    rewardRedemptionId?: string | null;
    providerMessageId?: string | null;
    attributableRevenue?: number | null;
  }): Promise<unknown>;
  getAttributionSummary(campaignId?: string): Promise<AttributionSummary>;
}

export function createMarketingDepthService(
  envStatus: EnvironmentStatus,
  marketing: MarketingService,
): MarketingDepthService {
  const supabase = () => createServiceClient(envStatus);

  function mapSegment(row: Record<string, unknown>): SegmentRecord {
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      description: (row.description as string | null) ?? null,
      formula: String(row.formula),
      authoritativeSource: String(row.authoritative_source),
      timeWindow: String(row.time_window),
      exclusions: String(row.exclusions ?? ""),
      branchScope: String(row.branch_scope),
      freshness: String(row.freshness),
      completeness: String(row.completeness),
      isActive: Boolean(row.is_active),
    };
  }

  function mapTemplate(row: Record<string, unknown>): TemplateRecord {
    const vars = row.variables;
    return {
      id: String(row.id),
      name: String(row.name),
      channel: row.channel as CampaignChannel,
      language: String(row.language ?? "en"),
      subject: (row.subject as string | null) ?? null,
      body: String(row.body),
      variables: Array.isArray(vars) ? (vars as string[]) : [],
      providerApprovalState: String(row.provider_approval_state),
      isActive: Boolean(row.is_active),
      branchId: (row.branch_id as string | null) ?? null,
      createdBy: (row.created_by as string | null) ?? null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  return {
    async listSegments() {
      const client = supabase();
      const { data, error } = await client.from("marketing_segments").select("*").eq("is_active", true).order("code");
      if (error) throwMappedDbError("MARKETING_SEGMENTS_LIST_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapSegment);
    },

    async previewSegment(code, opts) {
      const client = supabase();
      const { data: seg, error } = await client.from("marketing_segments").select("*").eq("code", code).maybeSingle();
      if (error) throwMappedDbError("MARKETING_SEGMENT_READ_FAILED", error);
      if (!seg) throw new ApiError(404, "SEGMENT_NOT_FOUND", "Segment not found.");
      const segment = mapSegment(seg as Record<string, unknown>);

      if (code === "loyalty_members") {
        const { data, error: e } = await client.from("loyalty_accounts").select("customer_id").limit(50);
        if (e) {
          return {
            segment,
            memberCount: null,
            sampleCustomerIds: [],
            status: "UNAVAILABLE",
            reason: e.message,
          };
        }
        const ids = (data ?? []).map((r) => String((r as { customer_id: string }).customer_id));
        const { count } = await client.from("loyalty_accounts").select("id", { count: "exact", head: true });
        return {
          segment,
          memberCount: count ?? ids.length,
          sampleCustomerIds: ids.slice(0, 20),
          status: "LIVE",
          reason: null,
        };
      }

      if (code === "consented_audiences") {
        const { data, error: e } = await client
          .from("customers")
          .select("id, marketing_consent")
          .eq("marketing_consent", true)
          .limit(50);
        if (e) {
          return { segment, memberCount: null, sampleCustomerIds: [], status: "UNAVAILABLE", reason: e.message };
        }
        const { data: suppressions } = await client.from("marketing_suppressions").select("customer_id, channel");
        const suppressed = new Set(
          (suppressions ?? [])
            .filter((s) => ["all", "email", "whatsapp", "sms", "push"].includes(String((s as { channel: string }).channel)))
            .map((s) => String((s as { customer_id: string }).customer_id)),
        );
        const ids = (data ?? [])
          .map((r) => String((r as { id: string }).id))
          .filter((id) => !suppressed.has(id));
        return {
          segment,
          memberCount: ids.length,
          sampleCustomerIds: ids.slice(0, 20),
          status: "LIVE",
          reason: "Suppression overrides inclusion.",
        };
      }

      if (code === "coupon_users") {
        const { data, error: e } = await client
          .from("coupon_redemptions")
          .select("customer_id")
          .eq("status", "applied")
          .not("customer_id", "is", null)
          .limit(200);
        if (e) {
          return { segment, memberCount: null, sampleCustomerIds: [], status: "UNAVAILABLE", reason: e.message };
        }
        const ids = [...new Set((data ?? []).map((r) => String((r as { customer_id: string }).customer_id)))];
        return {
          segment,
          memberCount: ids.length,
          sampleCustomerIds: ids.slice(0, 20),
          status: "LIVE",
          reason: null,
        };
      }

      // Remaining segments documented; preview may be unavailable without heavy scans.
      void opts;
      return {
        segment,
        memberCount: null,
        sampleCustomerIds: [],
        status: "UNAVAILABLE",
        reason: `Preview for ${code} requires bounded window parameters — formula is documented, count not fabricated.`,
      };
    },

    async listTemplates(channel) {
      const client = supabase();
      let q = client.from("marketing_templates").select("*").order("updated_at", { ascending: false }).limit(200);
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) throwMappedDbError("MARKETING_TEMPLATES_LIST_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapTemplate);
    },

    async createTemplate(actorUserId, input) {
      const body = stripTemplateUnsafeHtml(input.body);
      if (/<script/i.test(input.body)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Unsafe script content is not allowed in templates.");
      }
      const variables = extractTemplateVariables(body, input.subject);
      const client = supabase();
      const { data, error } = await client
        .from("marketing_templates")
        .insert({
          name: input.name,
          channel: input.channel,
          language: input.language ?? "en",
          subject: input.subject ?? null,
          body,
          variables,
          provider_approval_state: "not_submitted",
          is_active: true,
          branch_id: input.branchId ?? null,
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("MARKETING_TEMPLATE_CREATE_FAILED", error);
      const mapped = mapTemplate(data as Record<string, unknown>);
      await audit(client, {
        actorUserId,
        entityType: "marketing_template",
        entityId: mapped.id,
        action: "create",
        after: mapped,
        branchId: mapped.branchId,
      });
      return mapped;
    },

    async createDepthCampaign(scope, actorUserId, input) {
      if (input.branchId) assertBranchMembership(scope, input.branchId);
      const client = supabase();
      let messageTemplate = input.messageTemplate ?? "";
      if (input.templateId) {
        const { data: tmpl, error } = await client
          .from("marketing_templates")
          .select("*")
          .eq("id", input.templateId)
          .maybeSingle();
        if (error) throwMappedDbError("MARKETING_TEMPLATE_READ_FAILED", error);
        if (!tmpl) throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found.");
        messageTemplate = String((tmpl as { body: string }).body);
      }
      if (!messageTemplate.trim()) {
        throw new ApiError(400, "VALIDATION_ERROR", "messageTemplate or templateId is required.");
      }
      const { data, error } = await client
        .from("marketing_campaigns")
        .insert({
          branch_id: input.branchId ?? null,
          name: input.name,
          channel: input.channel,
          status: "draft",
          message_template: messageTemplate,
          scheduled_at: input.scheduledAt ?? null,
          created_by: actorUserId,
          objective: input.objective ?? null,
          segment_id: input.segmentId ?? null,
          template_id: input.templateId ?? null,
          coupon_id: input.couponId ?? null,
          reward_id: input.rewardId ?? null,
          budget_metadata: input.budgetMetadata ?? {},
          provider_config: {},
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("MARKETING_CAMPAIGN_CREATE_FAILED", error);
      await audit(client, {
        actorUserId,
        entityType: "marketing_campaign",
        entityId: String((data as { id: string }).id),
        action: "create",
        after: data,
        branchId: input.branchId ?? null,
      });
      return data;
    },

    async transitionDepthCampaign(scope, actorUserId, campaignId, status, cancelReason) {
      const client = supabase();
      const { data: current, error } = await client
        .from("marketing_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throwMappedDbError("MARKETING_CAMPAIGN_READ_FAILED", error);
      if (!current) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
      const branchId = (current as { branch_id: string | null }).branch_id;
      if (branchId) assertBranchMembership(scope, branchId);

      const from = String((current as { status: string }).status);
      if (!isDepthCampaignTransitionAllowed(from, status)) {
        throw new ApiError(409, "INVALID_CAMPAIGN_TRANSITION", `Cannot transition ${from} → ${status}.`);
      }
      if (status === "cancelled" && !cancelReason?.trim()) {
        throw new ApiError(400, "VALIDATION_ERROR", "cancelReason required when cancelling.");
      }

      const patch: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "approved") {
        patch.approved_by = actorUserId;
        patch.approved_at = new Date().toISOString();
      }
      if (status === "running") patch.started_at = new Date().toISOString();
      if (status === "completed" || status === "cancelled") {
        patch.completed_at = new Date().toISOString();
      }
      if (status === "cancelled") patch.cancel_reason = cancelReason;

      const { data, error: updErr } = await client
        .from("marketing_campaigns")
        .update(patch)
        .eq("id", campaignId)
        .select("*")
        .single();
      if (updErr) throwMappedDbError("MARKETING_CAMPAIGN_TRANSITION_FAILED", updErr);
      await audit(client, {
        actorUserId,
        entityType: "marketing_campaign",
        entityId: campaignId,
        action: `transition:${from}->${status}`,
        before: current,
        after: data,
        reason: cancelReason ?? null,
        branchId,
      });
      return data;
    },

    async queueWithProviderGate(scope, campaignId, customerIds) {
      const client = supabase();
      const { data: campaign, error } = await client
        .from("marketing_campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throwMappedDbError("MARKETING_CAMPAIGN_READ_FAILED", error);
      if (!campaign) throw new ApiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");

      const status = String((campaign as { status: string }).status);
      if (!canQueueCampaignStatus(status)) {
        throw new ApiError(
          409,
          "CAMPAIGN_NOT_APPROVED",
          "Unapproved campaigns cannot be submitted. Approve first.",
        );
      }

      const channel = String((campaign as { channel: string }).channel) as CampaignChannel;
      const adapterChannel: ProviderChannel | null =
        channel === "email" || channel === "whatsapp" ? channel : null;
      const validation = adapterChannel
        ? getProviderAdapter(adapterChannel).validateConfig(
            ((campaign as { provider_config?: Record<string, unknown> }).provider_config) ?? {},
          )
        : { ok: true as const, providerConfigured: false as const, message: "Channel adapter not configured." };

      const result = await marketing.queueCampaignSubmissions(scope, campaignId, customerIds);
      return {
        ...result,
        providerConfigured: false as const,
        message: validation.message,
      };
    },

    async recordAttribution(input) {
      if (
        input.sourceType === "coupon" && !input.couponId ||
        input.sourceType === "campaign" && !input.campaignId ||
        input.sourceType === "reward_redemption" && !input.rewardRedemptionId ||
        input.sourceType === "provider_ref" && !input.providerMessageId
      ) {
        throw new ApiError(400, "VALIDATION_ERROR", "Attribution requires the matching traceable reference.");
      }
      const client = supabase();
      const { data, error } = await client
        .from("marketing_attribution_links")
        .insert({
          order_id: input.orderId,
          source_type: input.sourceType,
          coupon_id: input.couponId ?? null,
          campaign_id: input.campaignId ?? null,
          reward_redemption_id: input.rewardRedemptionId ?? null,
          provider_message_id: input.providerMessageId ?? null,
          attributable_revenue: input.attributableRevenue ?? null,
        })
        .select("*")
        .single();
      if (error) throwMappedDbError("MARKETING_ATTRIBUTION_CREATE_FAILED", error);
      return data;
    },

    async getAttributionSummary(campaignId) {
      const client = supabase();
      let q = client.from("marketing_attribution_links").select("order_id, attributable_revenue, campaign_id");
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q.limit(5000);
      if (error) throwMappedDbError("MARKETING_ATTRIBUTION_READ_FAILED", error);
      const rows = data ?? [];
      const orders = new Set(rows.map((r) => String((r as { order_id: string }).order_id)));
      const revenue = rows.reduce(
        (s, r) => s + (Number((r as { attributable_revenue?: number }).attributable_revenue) || 0),
        0,
      );
      let redemptions = 0;
      if (campaignId) {
        const { data: camp } = await client
          .from("marketing_campaigns")
          .select("coupon_id")
          .eq("id", campaignId)
          .maybeSingle();
        const couponId = (camp as { coupon_id?: string | null } | null)?.coupon_id;
        if (couponId) {
          const { count } = await client
            .from("coupon_redemptions")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", couponId)
            .eq("status", "applied");
          redemptions = count ?? 0;
        }
      }
      return {
        redemptions,
        attributableOrders: orders.size,
        attributableRevenue: Math.round(revenue * 100) / 100,
        conversionRate: redemptions > 0 ? Math.round((orders.size / redemptions) * 10000) / 100 : null,
        note: "Attribution is traceable-link only. Timing-based attribution is never inferred. delivered/open/click omitted without provider confirmation.",
      };
    },
  };
}

export type { CampaignStatus };
