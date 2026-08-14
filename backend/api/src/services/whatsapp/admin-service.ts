/**
 * WhatsApp admin service (ADR-004 §1, §2, §4, §5).
 *
 * Service layer for the admin WhatsApp routes. Encapsulates:
 *   - Conversation list / detail / messages / events
 *   - Send outbound message (text or template)
 *   - Assign / unassign agent
 *   - State-machine transitions (open → in_progress → escalated → resolved → closed)
 *   - Template CRUD
 *
 * Uses the service-role Supabase client (RLS bypass). Authorization
 * (branch-scoping) is enforced at the route layer via principal.branchIds.
 *
 * Authority: ADR-004 §4 (conversation state machine)
 *           ADR-004 §5 (message immutability — append-only inbound)
 *           ADR-004 §8 (provider adapter contract)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "closed";

export const CONVERSATION_STATUSES: ConversationStatus[] = [
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
];

export interface WhatsAppConversationListItem {
  id: string;
  branchId: string;
  customerId: string | null;
  contactPhone: string;
  status: ConversationStatus;
  assignedAgentId: string | null;
  linkedOrderId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConversationDetail extends WhatsAppConversationListItem {
  providerConfigId: string;
  providerConversationId: string | null;
  closedAt: string | null;
  piiAnonymizedAt: string | null;
}

export interface WhatsAppMessageRow {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  providerMessageId: string | null;
  fromPhone: string | null;
  toPhone: string | null;
  content: string | null;
  contentType: string;
  templateKey: string | null;
  templateLanguage: string | null;
  templateParameters: unknown;
  deliveryStatus: string;
  providerTimestamp: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
}

export interface WhatsAppConversationEventRow {
  id: number;
  conversationId: string;
  eventType: string;
  actorUserId: string | null;
  actorRole: string | null;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  createdAt: string;
}

export interface WhatsAppTemplateRow {
  id: string;
  templateKey: string;
  providerTemplateId: string;
  language: string;
  category: "marketing" | "utility" | "authentication";
  bodyText: string;
  variables: unknown;
  isActive: boolean;
  providerStatus: "pending" | "approved" | "rejected" | "paused";
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResult {
  messageId: string;
  conversationId: string;
  deliveryStatus: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface WhatsAppAdminService {
  listConversations(input: {
    branchIds: string[];
    isSuperAdmin: boolean;
    status?: ConversationStatus | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: WhatsAppConversationListItem[]; total: number }>;

  getConversation(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
  }): Promise<WhatsAppConversationDetail>;

  listMessages(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
    limit?: number;
  }): Promise<WhatsAppMessageRow[]>;

  listEvents(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
    limit?: number;
  }): Promise<WhatsAppConversationEventRow[]>;

  sendMessage(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
    actorUserId: string | null;
    contentType: "text" | "template";
    text?: string | null;
    templateKey?: string | null;
    templateLanguage?: string | null;
    templateParameters?: unknown[] | null;
  }): Promise<SendMessageResult>;

  assignAgent(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
    actorUserId: string | null;
    agentUserId: string | null;
  }): Promise<{ assignedAgentId: string | null }>;

  transitionStatus(input: {
    conversationId: string;
    branchIds: string[];
    isSuperAdmin: boolean;
    actorUserId: string | null;
    actorRole: string | null;
    toStatus: ConversationStatus;
    reason?: string | null;
  }): Promise<{ status: ConversationStatus }>;

  listTemplates(input: { activeOnly?: boolean }): Promise<WhatsAppTemplateRow[]>;

  createTemplate(input: {
    templateKey: string;
    providerTemplateId: string;
    language: string;
    category: "marketing" | "utility" | "authentication";
    bodyText: string;
    variables?: unknown;
    isActive?: boolean;
    providerStatus?: "pending" | "approved" | "rejected" | "paused";
  }): Promise<WhatsAppTemplateRow>;

  updateTemplate(input: {
    templateId: string;
    isActive?: boolean;
    providerStatus?: "pending" | "approved" | "rejected" | "paused";
    bodyText?: string;
    variables?: unknown;
  }): Promise<WhatsAppTemplateRow>;

  deleteTemplate(input: { templateId: string }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(branchId: string, allowedBranchIds: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return;
  if (!allowedBranchIds.includes(branchId)) {
    throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Conversation is not in your branch scope.");
  }
}

function mapConversationRow(row: Record<string, unknown>): WhatsAppConversationListItem {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    customerId: (row.customer_id as string | null) ?? null,
    contactPhone: String(row.contact_phone ?? ""),
    status: row.status as ConversationStatus,
    assignedAgentId: (row.assigned_agent_id as string | null) ?? null,
    linkedOrderId: (row.linked_order_id as string | null) ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastMessagePreview: (row.last_message_preview as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMessageRow(row: Record<string, unknown>): WhatsAppMessageRow {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    direction: row.direction as "inbound" | "outbound",
    providerMessageId: (row.provider_message_id as string | null) ?? null,
    fromPhone: (row.from_phone as string | null) ?? null,
    toPhone: (row.to_phone as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    contentType: String(row.content_type ?? "text"),
    templateKey: (row.template_key as string | null) ?? null,
    templateLanguage: (row.template_language as string | null) ?? null,
    templateParameters: row.template_parameters ?? [],
    deliveryStatus: String(row.delivery_status ?? "pending"),
    providerTimestamp: (row.provider_timestamp as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
    retryCount: Number(row.retry_count ?? 0),
    createdAt: String(row.created_at),
  };
}

function mapEventRow(row: Record<string, unknown>): WhatsAppConversationEventRow {
  return {
    id: Number(row.id),
    conversationId: String(row.conversation_id),
    eventType: String(row.event_type),
    actorUserId: (row.actor_user_id as string | null) ?? null,
    actorRole: (row.actor_role as string | null) ?? null,
    previousValue: row.previous_value ?? null,
    newValue: row.new_value ?? null,
    reason: (row.reason as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapTemplateRow(row: Record<string, unknown>): WhatsAppTemplateRow {
  return {
    id: String(row.id),
    templateKey: String(row.template_key),
    providerTemplateId: String(row.provider_template_id),
    language: String(row.language ?? "en"),
    category: row.category as "marketing" | "utility" | "authentication",
    bodyText: String(row.body_text ?? ""),
    variables: row.variables ?? [],
    isActive: Boolean(row.is_active),
    providerStatus: row.provider_status as "pending" | "approved" | "rejected" | "paused",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWhatsAppAdminService(envStatus: EnvironmentStatus): WhatsAppAdminService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listConversations(input) {
      const client = supabase();
      const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
      const offset = Math.max(input.offset ?? 0, 0);

      // Super-admin sees all branches; otherwise branchIds must be non-empty.
      if (!input.isSuperAdmin && input.branchIds.length === 0) {
        throw new ApiError(403, "BRANCH_SCOPE_REQUIRED", "Branch scope is required.");
      }

      let q = client
        .from("whatsapp_conversations")
        .select("*", { count: "exact" });

      if (!input.isSuperAdmin) {
        q = q.in("branch_id", input.branchIds);
      }

      if (input.status) q = q.eq("status", input.status);
      if (input.search) {
        q = q.ilike("contact_phone", `%${input.search}%`);
      }

      q = q
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("WHATSAPP_CONVERSATIONS_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapConversationRow),
        total: count ?? 0,
      };
    },

    async getConversation(input) {
      const client = supabase();
      let q = client.from("whatsapp_conversations").select("*").eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        q = q.in("branch_id", input.branchIds);
      }
      const { data, error } = await q.maybeSingle();

      if (error) throwMappedDbError("WHATSAPP_CONVERSATION_READ_FAILED", error);
      if (!data) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      const row = data as Record<string, unknown>;
      return {
        ...mapConversationRow(row),
        providerConfigId: String(row.provider_config_id ?? ""),
        providerConversationId: (row.provider_conversation_id as string | null) ?? null,
        closedAt: (row.closed_at as string | null) ?? null,
        piiAnonymizedAt: (row.pii_anonymized_at as string | null) ?? null,
      };
    },

    async listMessages(input) {
      const client = supabase();
      const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

      // Two-step: verify conversation is in branch scope, then list messages.
      let convQ = client
        .from("whatsapp_conversations")
        .select("id")
        .eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        convQ = convQ.in("branch_id", input.branchIds);
      }
      const { data: conv, error: convErr } = await convQ.maybeSingle();

      if (convErr) throwMappedDbError("WHATSAPP_CONVERSATION_READ_FAILED", convErr);
      if (!conv) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      const { data, error } = await client
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", input.conversationId)
        .order("provider_timestamp", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throwMappedDbError("WHATSAPP_MESSAGES_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapMessageRow);
    },

    async listEvents(input) {
      const client = supabase();
      const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

      let convQ = client
        .from("whatsapp_conversations")
        .select("id")
        .eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        convQ = convQ.in("branch_id", input.branchIds);
      }
      const { data: conv, error: convErr } = await convQ.maybeSingle();

      if (convErr) throwMappedDbError("WHATSAPP_CONVERSATION_READ_FAILED", convErr);
      if (!conv) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      const { data, error } = await client
        .from("whatsapp_conversation_events")
        .select("*")
        .eq("conversation_id", input.conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throwMappedDbError("WHATSAPP_EVENTS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapEventRow);
    },

    async sendMessage(input) {
      const client = supabase();

      // Verify conversation is in branch scope.
      let convQ = client
        .from("whatsapp_conversations")
        .select("id, branch_id, contact_phone, status")
        .eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        convQ = convQ.in("branch_id", input.branchIds);
      }
      const { data: conv, error: convErr } = await convQ.maybeSingle();

      if (convErr) throwMappedDbError("WHATSAPP_CONVERSATION_READ_FAILED", convErr);
      if (!conv) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      const convRow = conv as { id: string; branch_id: string; contact_phone: string; status: string };

      // Closed conversations cannot receive outbound messages.
      if (convRow.status === "closed") {
        throw new ApiError(409, "CONVERSATION_CLOSED", "Cannot send to a closed conversation.");
      }

      // Validate content shape.
      let contentText: string | null = null;
      let contentType: "text" | "template" = input.contentType;
      let templateKey: string | null = null;
      let templateLanguage: string | null = null;
      let templateParameters: unknown[] = [];

      if (input.contentType === "text") {
        if (!input.text || input.text.trim().length === 0) {
          throw new ApiError(400, "VALIDATION_ERROR", "text is required when contentType=text.");
        }
        if (input.text.length > 4096) {
          throw new ApiError(400, "VALIDATION_ERROR", "text exceeds 4096 characters (WhatsApp limit).");
        }
        contentText = input.text;
      } else {
        if (!input.templateKey) {
          throw new ApiError(400, "VALIDATION_ERROR", "templateKey is required when contentType=template.");
        }
        // Verify template exists + is approved + active.
        const { data: tpl, error: tplErr } = await client
          .from("whatsapp_message_templates")
          .select("id, is_active, provider_status")
          .eq("template_key", input.templateKey)
          .eq("language", input.templateLanguage ?? "en")
          .maybeSingle();

        if (tplErr) throwMappedDbError("WHATSAPP_TEMPLATE_READ_FAILED", tplErr);
        if (!tpl || !(tpl as { is_active: boolean }).is_active || (tpl as { provider_status: string }).provider_status !== "approved") {
          throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Approved template not found for the given key/language.");
        }

        templateKey = input.templateKey;
        templateLanguage = input.templateLanguage ?? "en";
        templateParameters = input.templateParameters ?? [];
      }

      // Insert the message row with delivery_status='pending'. The outbox
      // worker will pick it up on the next tick (≤15s in mock/dev).
      const { data: msg, error: msgErr } = await client
        .from("whatsapp_messages")
        .insert({
          conversation_id: input.conversationId,
          direction: "outbound",
          from_phone: null, // WABA number is implicit; resolved by adapter
          to_phone: convRow.contact_phone,
          content: contentText,
          content_type: contentType,
          template_key: templateKey,
          template_language: templateLanguage,
          template_parameters: templateParameters,
          delivery_status: "pending",
          retry_count: 0,
        })
        .select("id, conversation_id, delivery_status")
        .single();

      if (msgErr) throwMappedDbError("WHATSAPP_MESSAGE_INSERT_FAILED", msgErr);

      const msgRow = msg as { id: string; conversation_id: string; delivery_status: string };

      // Bump conversation last_message_at + clear unread_count (agent just sent).
      await client
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: contentText ? contentText.slice(0, 80) : `[template: ${templateKey}]`,
          unread_count: 0,
        })
        .eq("id", input.conversationId);

      // Append 'message_sent' audit event. The DB trigger on
      // whatsapp_conversations captures session variables for actor_user_id,
      // but the Supabase JS client doesn't easily set them — so we insert
      // the event row explicitly here with the actor captured.
      await client.from("whatsapp_conversation_events").insert({
        conversation_id: input.conversationId,
        event_type: "message_sent",
        actor_user_id: input.actorUserId,
        actor_role: "agent",
        new_value: {
          message_id: msgRow.id,
          content_type: contentType,
          template_key: templateKey,
        },
        reason: "agent_composed_message",
      });

      return {
        messageId: msgRow.id,
        conversationId: msgRow.conversation_id,
        deliveryStatus: msgRow.delivery_status,
      };
    },

    async assignAgent(input) {
      const client = supabase();

      let q = client
        .from("whatsapp_conversations")
        .update({ assigned_agent_id: input.agentUserId })
        .eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        q = q.in("branch_id", input.branchIds);
      }
      const { data, error } = await q.select("assigned_agent_id").maybeSingle();

      if (error) throwMappedDbError("WHATSAPP_CONVERSATION_UPDATE_FAILED", error);
      if (!data) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      return {
        assignedAgentId: (data as { assigned_agent_id: string | null }).assigned_agent_id ?? null,
      };
    },

    async transitionStatus(input) {
      const client = supabase();

      // First, fetch current state to validate the transition is allowed
      // (defense-in-depth — the DB trigger enforces it too, but a 400 with a
      // helpful message is better than a 500 from a check_violation).
      let fetchQ = client
        .from("whatsapp_conversations")
        .select("status")
        .eq("id", input.conversationId);
      if (!input.isSuperAdmin) {
        fetchQ = fetchQ.in("branch_id", input.branchIds);
      }
      const { data: current, error: fetchErr } = await fetchQ.maybeSingle();

      if (fetchErr) throwMappedDbError("WHATSAPP_CONVERSATION_READ_FAILED", fetchErr);
      if (!current) {
        throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found in your branch scope.");
      }

      const currentStatus = (current as { status: string }).status as ConversationStatus;
      if (currentStatus === input.toStatus) {
        return { status: currentStatus };
      }

      // The DB trigger `validate_conversation_state_transition` enforces the
      // allowed transitions and inserts the audit row. We just UPDATE.
      const { error: updateErr } = await client
        .from("whatsapp_conversations")
        .update({ status: input.toStatus })
        .eq("id", input.conversationId);

      if (updateErr) {
        const msg = updateErr.message ?? "";
        if (/Invalid conversation state transition/i.test(msg)) {
          throw new ApiError(
            409,
            "INVALID_STATE_TRANSITION",
            `Cannot transition from ${currentStatus} to ${input.toStatus}.`,
          );
        }
        throwMappedDbError("WHATSAPP_CONVERSATION_UPDATE_FAILED", updateErr);
      }

      return { status: input.toStatus };
    },

    async listTemplates(input) {
      const client = supabase();
      let q = client
        .from("whatsapp_message_templates")
        .select("*")
        .order("template_key", { ascending: true })
        .order("language", { ascending: true });

      if (input.activeOnly) {
        q = q.eq("is_active", true).eq("provider_status", "approved");
      }

      const { data, error } = await q;
      if (error) throwMappedDbError("WHATSAPP_TEMPLATES_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapTemplateRow);
    },

    async createTemplate(input) {
      const client = supabase();
      const { data, error } = await client
        .from("whatsapp_message_templates")
        .insert({
          template_key: input.templateKey,
          provider_template_id: input.providerTemplateId,
          language: input.language,
          category: input.category,
          body_text: input.bodyText,
          variables: input.variables ?? [],
          is_active: input.isActive ?? true,
          provider_status: input.providerStatus ?? "pending",
        })
        .select("*")
        .single();

      if (error) {
        const msg = error.message ?? "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          throw new ApiError(409, "TEMPLATE_DUPLICATE", "Template with same key+language+provider_template_id exists.");
        }
        throwMappedDbError("WHATSAPP_TEMPLATE_INSERT_FAILED", error);
      }

      return mapTemplateRow(data as Record<string, unknown>);
    },

    async updateTemplate(input) {
      const client = supabase();
      const patch: Record<string, unknown> = {};
      if (input.isActive !== undefined) patch.is_active = input.isActive;
      if (input.providerStatus !== undefined) patch.provider_status = input.providerStatus;
      if (input.bodyText !== undefined) patch.body_text = input.bodyText;
      if (input.variables !== undefined) patch.variables = input.variables;

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No fields to update.");
      }

      const { data, error } = await client
        .from("whatsapp_message_templates")
        .update(patch)
        .eq("id", input.templateId)
        .select("*")
        .maybeSingle();

      if (error) throwMappedDbError("WHATSAPP_TEMPLATE_UPDATE_FAILED", error);
      if (!data) {
        throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found.");
      }
      return mapTemplateRow(data as Record<string, unknown>);
    },

    async deleteTemplate(input) {
      const client = supabase();
      const { error } = await client
        .from("whatsapp_message_templates")
        .delete()
        .eq("id", input.templateId);
      if (error) throwMappedDbError("WHATSAPP_TEMPLATE_DELETE_FAILED", error);
    },
  };
}

// Re-export for route-layer convenience.
export { assertBranchInScope };
