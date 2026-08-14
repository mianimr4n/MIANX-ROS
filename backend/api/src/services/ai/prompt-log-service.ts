/**
 * AI prompt log service (ADR-015).
 *
 * Wraps the `ai_call_logs` + `ai_prompt_logs` tables. Provides:
 *   - logCall() — records per-call audit (sha256 hash, NOT raw prompt)
 *   - upsertPromptLog() — upserts prompt hash metadata for trend analytics
 *   - listCallLogs() — queryable audit log
 *   - listPromptLogs() — trend analytics
 *
 * Authority: ADR-015 §1 (raw prompts NEVER stored), §3 (hashed metadata),
 *           §4 (hash computed after redaction)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiCallLogRow {
  id: number;
  actorUserId: string | null;
  branchId: string | null;
  provider: string;
  model: string;
  promptSha256: string;
  promptTokenCount: number | null;
  promptCharCount: number | null;
  promptLanguage: string | null;
  completionTokenCount: number | null;
  latencyMs: number | null;
  costUsd: number | null;
  success: boolean;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  calledAt: string;
}

export interface AiPromptLogRow {
  id: number;
  promptSha256: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  promptLanguage: string | null;
  metadata: Record<string, unknown>;
}

export interface LogCallInput {
  actorUserId: string | null;
  branchId?: string | null;
  provider: string;
  model: string;
  redactedPrompt: string;
  promptTokenCount?: number | null;
  promptLanguage?: string | null;
  completionTokenCount?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
  success: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AiPromptLogService {
  /**
   * Compute SHA-256 hash of the (already redacted) prompt. ADR-015 §4.
   */
  hashPrompt(redactedPrompt: string): string;

  /**
   * Log an AI call. Computes hash, inserts into ai_call_logs, and
   * upserts ai_prompt_logs metadata. Returns the call log id.
   */
  logCall(input: LogCallInput): Promise<number>;

  /**
   * List call logs (most recent first). Branch-scoped.
   */
  listCallLogs(input: {
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    provider?: string;
    actorUserId?: string;
    fromCalledAt?: string;
    toCalledAt?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AiCallLogRow[]; total: number }>;

  /**
   * List prompt logs (trend analytics). Read access requires ai.read.
   */
  listPromptLogs(input: {
    promptLanguage?: string;
    minOccurrenceCount?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AiPromptLogRow[]; total: number }>;
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

function mapCallLogRow(row: Record<string, unknown>): AiCallLogRow {
  return {
    id: Number(row.id),
    actorUserId: (row.actor_user_id as string | null) ?? null,
    branchId: (row.branch_id as string | null) ?? null,
    provider: String(row.provider ?? ""),
    model: String(row.model ?? ""),
    promptSha256: String(row.prompt_sha256 ?? ""),
    promptTokenCount: row.prompt_token_count !== null && row.prompt_token_count !== undefined ? Number(row.prompt_token_count) : null,
    promptCharCount: row.prompt_char_count !== null && row.prompt_char_count !== undefined ? Number(row.prompt_char_count) : null,
    promptLanguage: (row.prompt_language as string | null) ?? null,
    completionTokenCount: row.completion_token_count !== null && row.completion_token_count !== undefined ? Number(row.completion_token_count) : null,
    latencyMs: row.latency_ms !== null && row.latency_ms !== undefined ? Number(row.latency_ms) : null,
    costUsd: row.cost_usd !== null && row.cost_usd !== undefined ? Number(row.cost_usd) : null,
    success: Boolean(row.success),
    errorMessage: (row.error_message as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    calledAt: String(row.called_at),
  };
}

function mapPromptLogRow(row: Record<string, unknown>): AiPromptLogRow {
  return {
    id: Number(row.id),
    promptSha256: String(row.prompt_sha256 ?? ""),
    firstSeenAt: String(row.first_seen_at),
    lastSeenAt: String(row.last_seen_at),
    occurrenceCount: Number(row.occurrence_count ?? 1),
    avgLatencyMs: Number(row.avg_latency_ms ?? 0),
    avgCostUsd: Number(row.avg_cost_usd ?? 0),
    promptLanguage: (row.prompt_language as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export function createAiPromptLogService(envStatus: EnvironmentStatus): AiPromptLogService {
  const supabase = () => createServiceClient(envStatus);

  return {
    hashPrompt(redactedPrompt) {
      if (typeof redactedPrompt !== "string") {
        throw new ApiError(400, "INVALID_PROMPT", "Prompt must be a string.");
      }
      return createHash("sha256").update(redactedPrompt, "utf8").digest("hex");
    },

    async logCall(input) {
      if (!input.provider) throw new ApiError(400, "INVALID_CALL_LOG", "provider is required.");
      if (!input.model) throw new ApiError(400, "INVALID_CALL_LOG", "model is required.");
      if (typeof input.redactedPrompt !== "string") {
        throw new ApiError(400, "INVALID_CALL_LOG", "redactedPrompt is required (must be already redacted per ADR-013).");
      }

      const promptSha256 = this.hashPrompt(input.redactedPrompt);
      const promptCharCount = input.redactedPrompt.length;

      const client = supabase();

      // Insert call log
      const { data, error } = await client
        .from("ai_call_logs")
        .insert({
          actor_user_id: input.actorUserId ?? null,
          branch_id: input.branchId ?? null,
          provider: input.provider,
          model: input.model,
          prompt_sha256: promptSha256,
          prompt_token_count: input.promptTokenCount ?? null,
          prompt_char_count: promptCharCount,
          prompt_language: input.promptLanguage ?? null,
          completion_token_count: input.completionTokenCount ?? null,
          latency_ms: input.latencyMs ?? null,
          cost_usd: input.costUsd ?? null,
          success: input.success,
          error_message: input.errorMessage ?? null,
          metadata: input.metadata ?? {},
        })
        .select("id")
        .single();

      if (error) throwMappedDbError("AI_CALL_LOG_INSERT_FAILED", error);
      const callLogId = Number((data as { id: number }).id);

      // Upsert prompt log metadata (best-effort; failure does not block the call log)
      try {
        await client.rpc("upsert_ai_prompt_log", {
          p_prompt_sha256: promptSha256,
          p_latency_ms: input.latencyMs ?? 0,
          p_cost_usd: input.costUsd ?? 0,
          p_prompt_language: input.promptLanguage ?? null,
          p_metadata: { topic: (input.metadata as { topic?: string } | null)?.topic ?? null },
        });
      } catch {
        // Best-effort: prompt log failure should not fail the call log
      }

      return callLogId;
    },

    async listCallLogs({ actorBranchIds, isSuperAdmin, provider, actorUserId, fromCalledAt, toCalledAt, limit, offset }) {
      const cap = Math.min(Math.max(limit ?? 50, 1), 500);
      const off = Math.max(offset ?? 0, 0);
      const client = supabase();

      let q = client.from("ai_call_logs").select("*", { count: "exact" });

      if (!isSuperAdmin) {
        if (actorBranchIds.length === 0) {
          q = q.is("branch_id", null);
        } else {
          q = q.or(`branch_id.is.null,branch_id.in.(${actorBranchIds.join(",")})`);
        }
      }

      if (provider) q = q.eq("provider", provider);
      if (actorUserId) q = q.eq("actor_user_id", actorUserId);
      if (fromCalledAt) q = q.gte("called_at", fromCalledAt);
      if (toCalledAt) q = q.lte("called_at", toCalledAt);

      q = q.order("called_at", { ascending: false }).range(off, off + cap - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("AI_CALL_LOGS_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapCallLogRow),
        total: count ?? 0,
      };
    },

    async listPromptLogs({ promptLanguage, minOccurrenceCount, limit, offset }) {
      const cap = Math.min(Math.max(limit ?? 50, 1), 500);
      const off = Math.max(offset ?? 0, 0);
      const client = supabase();

      let q = client.from("ai_prompt_logs").select("*", { count: "exact" });

      if (promptLanguage) q = q.eq("prompt_language", promptLanguage);
      if (minOccurrenceCount) q = q.gte("occurrence_count", minOccurrenceCount);

      q = q.order("last_seen_at", { ascending: false }).range(off, off + cap - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("AI_PROMPT_LOGS_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapPromptLogRow),
        total: count ?? 0,
      };
    },
  };
}
