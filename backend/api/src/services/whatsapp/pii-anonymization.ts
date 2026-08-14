/**
 * WhatsApp 24-month PII anonymization job (ADR-004 §5, §9).
 *
 * Background job that anonymizes PII in whatsapp_conversations + whatsapp_messages
 * older than 24 months. PII fields are set to '[REDACTED]'; the row itself is
 * retained for audit/analytics. A 'pii_anonymized' conversation_event is
 * appended to record the action.
 *
 * Trigger: this module exports `runWhatsAppPiiAnonymization()` which can be
 * invoked by:
 *   - A cron job (recommended — daily or weekly)
 *   - An admin route (super-admin only — not yet wired)
 *   - A standalone script (node --import tsx src/scripts/whatsapp-pii-anonymize.ts)
 *
 * Lifecycle: this is NOT a long-running worker. It runs once and exits. The
 * caller decides cadence. Designed to be idempotent: rows already anonymized
 * (pii_anonymized_at IS NOT NULL) are skipped.
 *
 * Authority: ADR-004 §5 (PII anonymization via app.bypass_message_immutability='on')
 *           ADR-004 §9 (24-month retention policy)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";

/** Anonymize conversations older than this. Default: 24 months. */
const DEFAULT_RETENTION_MONTHS = 24;

/** Batch size — how many conversations to anonymize per pass. */
const DEFAULT_BATCH_SIZE = 100;

export interface PiiAnonymizationResult {
  scannedConversations: number;
  anonymizedConversations: number;
  anonymizedMessages: number;
  skippedAlreadyAnonymized: number;
  errors: string[];
  durationMs: number;
}

interface ConversationRow {
  id: string;
  branch_id: string;
  contact_phone: string;
  pii_anonymized_at: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}

/**
 * Run the PII anonymization pass.
 *
 * Process:
 *   1. Select conversations older than `retentionMonths` where
 *      `pii_anonymized_at IS NULL`. Limit to `batchSize`.
 *   2. For each conversation:
 *      a. Set `app.bypass_message_immutability = 'on'` via PostgREST headers
 *         (the immutability trigger honors this session variable).
 *      b. UPDATE whatsapp_messages SET content='[REDACTED]', from_phone='[REDACTED]',
 *         to_phone='[REDACTED]', media_url='[REDACTED]' WHERE conversation_id = ?.
 *      c. UPDATE whatsapp_conversations SET contact_phone='[REDACTED]',
 *         last_message_preview='[REDACTED]', pii_anonymized_at=now() WHERE id = ?.
 *      d. INSERT INTO whatsapp_conversation_events (event_type='pii_anonymized', ...).
 *
 * Note: PostgREST does NOT support setting session variables via the JS client
 * directly. The `app.bypass_message_immutability` setting must be configured
 * at the database role level or via an RPC. For v1 we use an RPC
 * `whatsapp_anonymize_pii(p_conversation_ids uuid[])` that internally sets the
 * session variable and performs the UPDATEs in a single transaction.
 *
 * If the RPC doesn't exist, we fall back to a no-op + log error (the migration
 * to add the RPC is a separate follow-up).
 */
export async function runWhatsAppPiiAnonymization(
  envStatus: EnvironmentStatus,
  options?: { retentionMonths?: number; batchSize?: number },
): Promise<PiiAnonymizationResult> {
  const retentionMonths = options?.retentionMonths ?? DEFAULT_RETENTION_MONTHS;
  const batchSize = Math.min(Math.max(options?.batchSize ?? DEFAULT_BATCH_SIZE, 1), 1000);
  const client = createServiceClient(envStatus);

  const startedAt = Date.now();
  const cutoffIso = monthsAgoIso(retentionMonths);
  const errors: string[] = [];
  let anonymizedConversations = 0;
  let anonymizedMessages = 0;
  let skippedAlreadyAnonymized = 0;

  // 1. Select candidate conversations.
  const { data: convRows, error: selectErr } = await client
    .from("whatsapp_conversations")
    .select("id, branch_id, contact_phone, pii_anonymized_at, created_at")
    .lt("created_at", cutoffIso)
    .is("pii_anonymized_at", null)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (selectErr) {
    throw new ApiError(500, "PII_ANONYMIZE_SELECT_FAILED", selectErr.message);
  }

  const conversations = (convRows ?? []) as unknown as ConversationRow[];

  // 2. Anonymize each conversation via the RPC. We pass batches of IDs to
  // minimize RPC calls.
  const idBatches: string[][] = [];
  for (let i = 0; i < conversations.length; i += 25) {
    idBatches.push(conversations.slice(i, i + 25).map((c) => c.id));
  }

  for (const batch of idBatches) {
    const { data, error } = await client.rpc("whatsapp_anonymize_pii", {
      p_conversation_ids: batch,
    });

    if (error) {
      const msg = error.message ?? "rpc_failed";
      // If the RPC doesn't exist, surface a clear error so the migration can be added.
      if (/function .* does not exist/i.test(msg)) {
        errors.push(
          "RPC whatsapp_anonymize_pii does not exist. Apply the migration that creates it (supabase/migrations/*_add_whatsapp_anonymize_pii_rpc.sql).",
        );
        // Stop trying — every batch will fail the same way.
        break;
      }
      errors.push(`batch_failed: ${msg.slice(0, 200)}`);
      continue;
    }

    const result = data as { anonymized_conversations?: number; anonymized_messages?: number } | null;
    if (result) {
      anonymizedConversations += Number(result.anonymized_conversations ?? 0);
      anonymizedMessages += Number(result.anonymized_messages ?? 0);
    }
  }

  // 3. Count conversations that were already anonymized (for observability).
  const { count } = await client
    .from("whatsapp_conversations")
    .select("*", { count: "exact", head: true })
    .lt("created_at", cutoffIso)
    .not("pii_anonymized_at", "is", null);

  skippedAlreadyAnonymized = count ?? 0;

  return {
    scannedConversations: conversations.length,
    anonymizedConversations,
    anonymizedMessages,
    skippedAlreadyAnonymized,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Lifecycle wrapper for use as a periodic background job (e.g. cron-triggered).
 * Returns a handle that can be stopped. The job runs once per `intervalMs`
 * (default: 24h). Not auto-started; caller decides whether to invoke.
 *
 * In production this should be invoked by an external cron (Render Cron Job
 * or similar) hitting an admin endpoint, NOT as an in-process worker.
 */
export interface PiiAnonymizationJobHandle {
  stop: () => void;
}

export function startWhatsAppPiiAnonymizationJob(
  envStatus: EnvironmentStatus,
  intervalMs = 24 * 60 * 60 * 1000,
): PiiAnonymizationJobHandle | null {
  // Only run in production when explicitly enabled.
  if (envStatus.config.envClass !== "production") return null;
  if (process.env.TELEPIZZA_WHATSAPP_PII_JOB !== "1") return null;

  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const result = await runWhatsAppPiiAnonymization(envStatus);
      console.info("[whatsapp-pii] anonymization_pass_complete", {
        scannedConversations: result.scannedConversations,
        anonymizedConversations: result.anonymizedConversations,
        anonymizedMessages: result.anonymizedMessages,
        skippedAlreadyAnonymized: result.skippedAlreadyAnonymized,
        errors: result.errors.length,
        durationMs: result.durationMs,
      });
      if (result.errors.length > 0) {
        console.warn("[whatsapp-pii] anonymization_errors", { errors: result.errors });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn("[whatsapp-pii] anonymization_pass_failed", { message: message.slice(0, 200) });
    }
  };

  // Run once at startup, then on the interval.
  void tick();
  timer = setInterval(() => void tick(), Math.max(60 * 60 * 1000, intervalMs));
  if (typeof timer.unref === "function") timer.unref();

  console.info(
    `[whatsapp-pii] anonymization job started intervalMs=${intervalMs} envClass=${envStatus.config.envClass}`,
  );

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
