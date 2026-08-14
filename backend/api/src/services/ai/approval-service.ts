/**
 * AI approval service (ADR-014).
 *
 * Wraps the `ai_approvals` table. AI-suggested state-mutating actions
 * are advisory only — they require explicit human approval before
 * execution.
 *
 * State machine:
 *   pending → approved → executed
 *   pending → rejected (terminal)
 *   pending → expired (terminal, auto after 7 days)
 *   approved → failed (execution failed; can retry → back to approved)
 *
 * Authority: ADR-014 §1 (advisory only), §3 (state machine),
 *           §4 (ai.approve permission), §6 (atomic + idempotent execution)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiApprovalActionType =
  | "order.cancel"
  | "order.refund"
  | "order.update_status"
  | "customer.merge"
  | "customer.adjust_loyalty"
  | "inventory.adjust_stock"
  | "inventory.create_po"
  | "hr.adjust_schedule"
  | "marketing.send_campaign";

export const AI_APPROVAL_ACTION_TYPES: AiApprovalActionType[] = [
  "order.cancel",
  "order.refund",
  "order.update_status",
  "customer.merge",
  "customer.adjust_loyalty",
  "inventory.adjust_stock",
  "inventory.create_po",
  "hr.adjust_schedule",
  "marketing.send_campaign",
];

export type AiApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "failed"
  | "expired";

export const AI_APPROVAL_STATUSES: AiApprovalStatus[] = [
  "pending", "approved", "rejected", "executed", "failed", "expired",
];

export interface AiApprovalRow {
  id: string;
  aiCallLogId: number | null;
  actionType: AiApprovalActionType;
  actionPayload: Record<string, unknown>;
  status: AiApprovalStatus;
  requestedBy: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  executedAt: string | null;
  executionResult: Record<string, unknown> | null;
  executionRetryCount: number;
  expiresAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalInput {
  aiCallLogId?: number | null;
  actionType: AiApprovalActionType;
  actionPayload: Record<string, unknown>;
  requestedBy: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AiApprovalService {
  /**
   * Create a new pending approval. Called by the AI proxy when an
   * AI suggestion includes a state-mutating action.
   */
  createApproval(input: CreateApprovalInput): Promise<AiApprovalRow>;

  /**
   * Approve a pending suggestion. Only ai.approve holders can call.
   * Returns the updated row.
   */
  approve(input: {
    approvalId: string;
    actorUserId: string;
    reason?: string | null;
  }): Promise<AiApprovalRow>;

  /**
   * Reject a pending suggestion. Only ai.approve holders can call.
   */
  reject(input: {
    approvalId: string;
    actorUserId: string;
    reason: string;
  }): Promise<AiApprovalRow>;

  /**
   * Mark an approved suggestion as executed (called by the execution worker).
   */
  markExecuted(input: {
    approvalId: string;
    executionResult: Record<string, unknown>;
  }): Promise<AiApprovalRow>;

  /**
   * Mark an approved suggestion as failed (called by the execution worker
   * after 3 retries).
   */
  markFailed(input: {
    approvalId: string;
    failureReason: string;
  }): Promise<AiApprovalRow>;

  /**
   * Get a single approval by id.
   */
  getApproval(input: { approvalId: string }): Promise<AiApprovalRow | null>;

  /**
   * List approvals with filters. Most recent first.
   */
  listApprovals(input: {
    status?: AiApprovalStatus;
    requestedBy?: string;
    decidedBy?: string;
    actionType?: AiApprovalActionType;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AiApprovalRow[]; total: number }>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: Record<string, unknown>): AiApprovalRow {
  return {
    id: String(row.id),
    aiCallLogId: row.ai_call_log_id !== null && row.ai_call_log_id !== undefined ? Number(row.ai_call_log_id) : null,
    actionType: row.action_type as AiApprovalActionType,
    actionPayload: (row.action_payload as Record<string, unknown>) ?? {},
    status: row.status as AiApprovalStatus,
    requestedBy: (row.requested_by as string | null) ?? null,
    requestedAt: String(row.requested_at),
    decidedBy: (row.decided_by as string | null) ?? null,
    decidedAt: (row.decided_at as string | null) ?? null,
    decisionReason: (row.decision_reason as string | null) ?? null,
    executedAt: (row.executed_at as string | null) ?? null,
    executionResult: (row.execution_result as Record<string, unknown> | null) ?? null,
    executionRetryCount: Number(row.execution_retry_count ?? 0),
    expiresAt: String(row.expires_at),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createAiApprovalService(envStatus: EnvironmentStatus): AiApprovalService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async createApproval(input) {
      if (!input.actionType || !AI_APPROVAL_ACTION_TYPES.includes(input.actionType)) {
        throw new ApiError(
          400,
          "INVALID_APPROVAL",
          `actionType must be one of: ${AI_APPROVAL_ACTION_TYPES.join(", ")}.`,
        );
      }
      if (!input.actionPayload || typeof input.actionPayload !== "object") {
        throw new ApiError(400, "INVALID_APPROVAL", "actionPayload must be a JSON object.");
      }

      const client = supabase();
      const { data, error } = await client
        .from("ai_approvals")
        .insert({
          ai_call_log_id: input.aiCallLogId ?? null,
          action_type: input.actionType,
          action_payload: input.actionPayload,
          status: "pending",
          requested_by: input.requestedBy,
          metadata: input.metadata ?? {},
        })
        .select("*")
        .single();

      if (error) throwMappedDbError("AI_APPROVAL_INSERT_FAILED", error);
      return mapRow(data as Record<string, unknown>);
    },

    async approve({ approvalId, actorUserId, reason }) {
      if (!approvalId) throw new ApiError(400, "INVALID_APPROVAL", "approvalId is required.");
      if (!actorUserId) throw new ApiError(400, "INVALID_APPROVAL", "actorUserId is required.");
      if (reason && reason.length > 1000) {
        throw new ApiError(400, "INVALID_APPROVAL", "reason must be at most 1000 characters.");
      }

      const client = supabase();

      // Load existing to validate state
      const { data: existing, error: loadError } = await client
        .from("ai_approvals")
        .select("*")
        .eq("id", approvalId)
        .maybeSingle();
      if (loadError) throwMappedDbError("AI_APPROVAL_READ_FAILED", loadError);
      if (!existing) {
        throw new ApiError(404, "APPROVAL_NOT_FOUND", "Approval not found.");
      }
      const existingRow = mapRow(existing as Record<string, unknown>);
      if (existingRow.status !== "pending") {
        throw new ApiError(
          409,
          "APPROVAL_NOT_PENDING",
          `Cannot approve an approval in status "${existingRow.status}". Only pending approvals can be approved.`,
        );
      }

      // Check expiry
      if (new Date(existingRow.expiresAt) < new Date()) {
        await client
          .from("ai_approvals")
          .update({ status: "expired" })
          .eq("id", approvalId);
        throw new ApiError(409, "APPROVAL_EXPIRED", "Approval has expired (past 7-day window).");
      }

      const { data, error } = await client
        .from("ai_approvals")
        .update({
          status: "approved",
          decided_by: actorUserId,
          decided_at: new Date().toISOString(),
          decision_reason: reason ?? null,
        })
        .eq("id", approvalId)
        .eq("status", "pending")
        .select("*")
        .single();

      if (error) throwMappedDbError("AI_APPROVAL_APPROVE_FAILED", error);
      if (!data) {
        throw new ApiError(409, "APPROVAL_STATE_CONFLICT", "Approval status changed concurrently. Reload and retry.");
      }
      return mapRow(data as Record<string, unknown>);
    },

    async reject({ approvalId, actorUserId, reason }) {
      if (!approvalId) throw new ApiError(400, "INVALID_APPROVAL", "approvalId is required.");
      if (!actorUserId) throw new ApiError(400, "INVALID_APPROVAL", "actorUserId is required.");
      if (!reason || reason.trim().length === 0) {
        throw new ApiError(400, "INVALID_APPROVAL", "reason is required for rejection.");
      }
      if (reason.length > 1000) {
        throw new ApiError(400, "INVALID_APPROVAL", "reason must be at most 1000 characters.");
      }

      const client = supabase();
      const { data: existing, error: loadError } = await client
        .from("ai_approvals")
        .select("status, expires_at")
        .eq("id", approvalId)
        .maybeSingle();
      if (loadError) throwMappedDbError("AI_APPROVAL_READ_FAILED", loadError);
      if (!existing) {
        throw new ApiError(404, "APPROVAL_NOT_FOUND", "Approval not found.");
      }
      const existingStatus = (existing as { status: string }).status;
      if (existingStatus !== "pending") {
        throw new ApiError(
          409,
          "APPROVAL_NOT_PENDING",
          `Cannot reject an approval in status "${existingStatus}". Only pending approvals can be rejected.`,
        );
      }

      const { data, error } = await client
        .from("ai_approvals")
        .update({
          status: "rejected",
          decided_by: actorUserId,
          decided_at: new Date().toISOString(),
          decision_reason: reason.trim(),
        })
        .eq("id", approvalId)
        .eq("status", "pending")
        .select("*")
        .single();

      if (error) throwMappedDbError("AI_APPROVAL_REJECT_FAILED", error);
      if (!data) {
        throw new ApiError(409, "APPROVAL_STATE_CONFLICT", "Approval status changed concurrently. Reload and retry.");
      }
      return mapRow(data as Record<string, unknown>);
    },

    async markExecuted({ approvalId, executionResult }) {
      if (!approvalId) throw new ApiError(400, "INVALID_APPROVAL", "approvalId is required.");
      if (!executionResult || typeof executionResult !== "object") {
        throw new ApiError(400, "INVALID_APPROVAL", "executionResult must be a JSON object.");
      }

      const client = supabase();
      const { data, error } = await client
        .from("ai_approvals")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          execution_result: executionResult,
        })
        .eq("id", approvalId)
        .in("status", ["approved", "failed"])
        .select("*")
        .single();

      if (error) throwMappedDbError("AI_APPROVAL_EXECUTE_FAILED", error);
      if (!data) {
        throw new ApiError(409, "APPROVAL_NOT_APPROVED", "Approval must be in 'approved' or 'failed' status to mark as executed.");
      }
      return mapRow(data as Record<string, unknown>);
    },

    async markFailed({ approvalId, failureReason }) {
      if (!approvalId) throw new ApiError(400, "INVALID_APPROVAL", "approvalId is required.");
      if (!failureReason || failureReason.trim().length === 0) {
        throw new ApiError(400, "INVALID_APPROVAL", "failureReason is required.");
      }

      const client = supabase();
      const { data: existing } = await client
        .from("ai_approvals")
        .select("execution_retry_count")
        .eq("id", approvalId)
        .maybeSingle();
      const retryCount = existing ? Number((existing as { execution_retry_count: number }).execution_retry_count) : 0;

      const { data, error } = await client
        .from("ai_approvals")
        .update({
          status: "failed",
          execution_result: { failure_reason: failureReason.trim(), retry_count: retryCount + 1 },
          execution_retry_count: retryCount + 1,
        })
        .eq("id", approvalId)
        .eq("status", "approved")
        .select("*")
        .single();

      if (error) throwMappedDbError("AI_APPROVAL_MARK_FAILED_FAILED", error);
      if (!data) {
        throw new ApiError(409, "APPROVAL_NOT_APPROVED", "Approval must be in 'approved' status to mark as failed.");
      }
      return mapRow(data as Record<string, unknown>);
    },

    async getApproval({ approvalId }) {
      const client = supabase();
      const { data, error } = await client
        .from("ai_approvals")
        .select("*")
        .eq("id", approvalId)
        .maybeSingle();
      if (error) throwMappedDbError("AI_APPROVAL_READ_FAILED", error);
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },

    async listApprovals({ status, requestedBy, decidedBy, actionType, limit, offset }) {
      const cap = Math.min(Math.max(limit ?? 50, 1), 200);
      const off = Math.max(offset ?? 0, 0);
      const client = supabase();

      let q = client.from("ai_approvals").select("*", { count: "exact" });

      if (status) q = q.eq("status", status);
      if (requestedBy) q = q.eq("requested_by", requestedBy);
      if (decidedBy) q = q.eq("decided_by", decidedBy);
      if (actionType) q = q.eq("action_type", actionType);

      q = q.order("requested_at", { ascending: false }).range(off, off + cap - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("AI_APPROVALS_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRow),
        total: count ?? 0,
      };
    },
  };
}
