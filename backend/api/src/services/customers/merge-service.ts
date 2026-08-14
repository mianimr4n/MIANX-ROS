/**
 * Customer merge service (ADR-006).
 *
 * Wraps the `merge_customers_atomic` and `reverse_customer_merge` SQL RPCs.
 * Provides TypeScript-side validation + helpful 422 errors before hitting
 * the DB.
 *
 * Authorization: super-admin only (enforced at the route layer via
 * `requireAnyPermission(["customer.merge"])`).
 *
 * Authority: ADR-006 §1 (super-admin only), §2 (source→target direction),
 *           §3 (atomic FK transfer), §5 (30-day reversal window)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeResult {
  ok: boolean;
  idempotent: boolean;
  mergeLogId: string | null;
  sourceCustomerId: string;
  targetCustomerId: string;
  transferred: Record<string, number>;
  conflicts: Array<{ identityType: string; value: string }>;
}

export interface MergeLogRow {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  actorUserId: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  mergeWindowExpiresAt: string;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
  createdAt: string;
}

export interface ReversalResult {
  ok: boolean;
  mergeLogId: string;
  reversed: Record<string, number>;
}

export interface CustomerMergeService {
  /**
   * Merge source customer into target customer. Calls the SQL RPC
   * `merge_customers_atomic`. Idempotent: if source is already merged
   * into this target, returns the existing merge log entry.
   */
  mergeCustomers(input: {
    sourceCustomerId: string;
    targetCustomerId: string;
    actorUserId: string;
    reason: string;
  }): Promise<MergeResult>;

  /**
   * Reverse a merge within the 30-day window. Calls the SQL RPC
   * `reverse_customer_merge`.
   */
  reverseMerge(input: {
    mergeLogId: string;
    actorUserId: string;
    reason: string;
  }): Promise<ReversalResult>;

  /**
   * List merge log entries (most recent first). Branch-scoped:
   * super-admin sees all; otherwise filtered by actor scope (though
   * merge is super-admin only, list is read-accessible to customer.read).
   */
  listMergeLog(input: {
    limit?: number;
    offset?: number;
    sourceCustomerId?: string;
    targetCustomerId?: string;
    unreversedOnly?: boolean;
  }): Promise<{ rows: MergeLogRow[]; total: number }>;

  /**
   * Get a single merge log entry by id.
   */
  getMergeLogEntry(input: { mergeLogId: string }): Promise<MergeLogRow | null>;
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

function mapMergeLogRow(row: Record<string, unknown>): MergeLogRow {
  return {
    id: String(row.id),
    sourceCustomerId: String(row.source_customer_id),
    targetCustomerId: String(row.target_customer_id),
    actorUserId: (row.actor_user_id as string | null) ?? null,
    reason: String(row.reason ?? ""),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    mergeWindowExpiresAt: String(row.merge_window_expires_at),
    reversedAt: (row.reversed_at as string | null) ?? null,
    reversedBy: (row.reversed_by as string | null) ?? null,
    reversalReason: (row.reversal_reason as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function createCustomerMergeService(envStatus: EnvironmentStatus): CustomerMergeService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async mergeCustomers({ sourceCustomerId, targetCustomerId, actorUserId, reason }) {
      if (!sourceCustomerId) throw new ApiError(400, "INVALID_MERGE", "sourceCustomerId is required.");
      if (!targetCustomerId) throw new ApiError(400, "INVALID_MERGE", "targetCustomerId is required.");
      if (sourceCustomerId === targetCustomerId) {
        throw new ApiError(400, "INVALID_MERGE", "sourceCustomerId and targetCustomerId must be different.");
      }
      if (!reason || reason.trim().length === 0) {
        throw new ApiError(400, "INVALID_MERGE", "reason is required.");
      }
      if (reason.length > 1000) {
        throw new ApiError(400, "INVALID_MERGE", "reason must be at most 1000 characters.");
      }

      const client = supabase();
      const { data, error } = await client.rpc("merge_customers_atomic", {
        p_source_customer_id: sourceCustomerId,
        p_target_customer_id: targetCustomerId,
        p_actor_user_id: actorUserId,
        p_reason: reason.trim(),
      });

      if (error) {
        // Map known error codes to 422s
        const msg = error.message || "";
        if (msg.includes("SOURCE_AND_TARGET_IDENTICAL")) {
          throw new ApiError(400, "INVALID_MERGE", "Source and target are the same customer.");
        }
        if (msg.includes("REASON_REQUIRED")) {
          throw new ApiError(400, "INVALID_MERGE", "Reason is required.");
        }
        if (msg.includes("SOURCE_NOT_FOUND")) {
          throw new ApiError(404, "SOURCE_NOT_FOUND", "Source customer not found.");
        }
        if (msg.includes("TARGET_NOT_FOUND")) {
          throw new ApiError(404, "TARGET_NOT_FOUND", "Target customer not found.");
        }
        if (msg.includes("SOURCE_ALREADY_MERGED")) {
          throw new ApiError(409, "SOURCE_ALREADY_MERGED", "Source is already merged into a different target.");
        }
        if (msg.includes("TARGET_IS_MERGED")) {
          throw new ApiError(409, "TARGET_IS_MERGED", "Cannot merge into a customer that is itself merged.");
        }
        throwMappedDbError("MERGE_FAILED", error);
      }

      const result = (data ?? {}) as Record<string, unknown>;
      const transferred = (result.transferred ?? {}) as Record<string, number>;
      const conflicts = (result.conflicts ?? []) as Array<{ identity_type: string; value: string }>;

      return {
        ok: Boolean(result.ok ?? true),
        idempotent: Boolean(result.idempotent ?? false),
        mergeLogId: (result.merge_log_id as string | null) ?? null,
        sourceCustomerId,
        targetCustomerId,
        transferred: Object.fromEntries(
          Object.entries(transferred).map(([k, v]) => [k, Number(v)]),
        ),
        conflicts: conflicts.map((c) => ({
          identityType: c.identity_type,
          value: c.value,
        })),
      };
    },

    async reverseMerge({ mergeLogId, actorUserId, reason }) {
      if (!mergeLogId) throw new ApiError(400, "INVALID_REVERSAL", "mergeLogId is required.");
      if (!reason || reason.trim().length === 0) {
        throw new ApiError(400, "INVALID_REVERSAL", "reason is required.");
      }
      if (reason.length > 1000) {
        throw new ApiError(400, "INVALID_REVERSAL", "reason must be at most 1000 characters.");
      }

      const client = supabase();
      const { data, error } = await client.rpc("reverse_customer_merge", {
        p_merge_log_id: mergeLogId,
        p_actor_user_id: actorUserId,
        p_reason: reason.trim(),
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("REASON_REQUIRED")) {
          throw new ApiError(400, "INVALID_REVERSAL", "Reason is required.");
        }
        if (msg.includes("MERGE_LOG_NOT_FOUND")) {
          throw new ApiError(404, "MERGE_LOG_NOT_FOUND", "Merge log entry not found.");
        }
        if (msg.includes("MERGE_ALREADY_REVERSED")) {
          throw new ApiError(409, "MERGE_ALREADY_REVERSED", "This merge has already been reversed.");
        }
        if (msg.includes("MERGE_WINDOW_EXPIRED")) {
          throw new ApiError(409, "MERGE_WINDOW_EXPIRED", "Cannot reverse merge after 30-day window.");
        }
        throwMappedDbError("MERGE_REVERSAL_FAILED", error);
      }

      const result = (data ?? {}) as Record<string, unknown>;
      const reversed = (result.reversed ?? {}) as Record<string, number>;
      return {
        ok: Boolean(result.ok ?? true),
        mergeLogId,
        reversed: Object.fromEntries(
          Object.entries(reversed).map(([k, v]) => [k, Number(v)]),
        ),
      };
    },

    async listMergeLog(input) {
      const cap = Math.min(Math.max(input.limit ?? 50, 1), 200);
      const offset = Math.max(input.offset ?? 0, 0);
      const client = supabase();

      let q = client
        .from("customer_merge_log")
        .select("*", { count: "exact" });

      if (input.sourceCustomerId) q = q.eq("source_customer_id", input.sourceCustomerId);
      if (input.targetCustomerId) q = q.eq("target_customer_id", input.targetCustomerId);
      if (input.unreversedOnly) q = q.is("reversed_at", null);

      q = q
        .order("created_at", { ascending: false })
        .range(offset, offset + cap - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("MERGE_LOG_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapMergeLogRow),
        total: count ?? 0,
      };
    },

    async getMergeLogEntry({ mergeLogId }) {
      const client = supabase();
      const { data, error } = await client
        .from("customer_merge_log")
        .select("*")
        .eq("id", mergeLogId)
        .maybeSingle();
      if (error) throwMappedDbError("MERGE_LOG_READ_FAILED", error);
      if (!data) return null;
      return mapMergeLogRow(data as Record<string, unknown>);
    },
  };
}
