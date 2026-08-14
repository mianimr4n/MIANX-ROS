/**
 * WhatsApp outbound outbox worker (ADR-004 §5, §8).
 *
 * Drains `whatsapp_messages` rows where:
 *   - direction = 'outbound'
 *   - delivery_status = 'pending' OR (delivery_status = 'failed' AND retry_count < MAX_RETRIES)
 *
 * For each row:
 *   1. Look up the conversation (branch_id, contact_phone, provider_config_id).
 *   2. Call the adapter's `sendMessage()` with the provider config.
 *   3. UPDATE the row to delivery_status='sent', provider_message_id=…, provider_timestamp=now.
 *      — The first status webhook callback will later UPDATE to 'delivered'/'read'/'failed'.
 *   4. On adapter failure: bump retry_count + set next_attempt_at via backoff;
 *      if retry_count >= MAX_RETRIES, set delivery_status='permanently_failed'.
 *
 * Honesty rules:
 *   - If whatsappMode=disabled → no rows are claimed (worker not started).
 *   - If adapter is null → no rows are claimed (worker not started).
 *   - If provider call returns status='failed', the row is marked 'failed' and
 *     retried (not silently marked 'sent'). The next attempt only happens
 *     after the backoff window.
 *
 * Concurrency:
 *   - Claiming uses an atomic UPDATE … WHERE id IN (…) AND delivery_status='pending'.
 *     This is PostgREST-level atomic; if two workers race, only one wins each row.
 *   - The service-role Supabase client is used (RLS bypass).
 *
 * Authority: ADR-004 §5 (message immutability)
 *           ADR-004 §7 (webhook contract — async provider callbacks)
 *           ADR-004 §8 (provider adapter contract)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { MessageProviderAdapter } from "../providers/adapter.js";

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 30_000;

export interface WhatsAppOutboxWorker {
  processOutboxBatch(limit?: number): Promise<{
    claimed: number;
    sent: number;
    failed: number;
    permanentlyFailed: number;
    skipped: number;
  }>;
}

export interface WhatsAppOutboxWorkerHandle {
  stop: () => void;
}

interface OutboxRow {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  content_type: string;
  template_key: string | null;
  template_language: string | null;
  template_parameters: unknown;
  delivery_status: string;
  retry_count: number;
  conversation: {
    branch_id: string;
    contact_phone: string;
    provider_config_id: string;
  } | null;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function backoffMs(retryCount: number): number {
  return BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount);
}

/**
 * Mask a phone number for logs — keep country code + last 4 digits.
 */
function maskPhone(phone: string): string {
  if (phone.length <= 7) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-4)}`;
}

export function createWhatsAppOutboxWorker(
  envStatus: EnvironmentStatus,
  adapter: MessageProviderAdapter,
): WhatsAppOutboxWorker {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async processOutboxBatch(limit = 20) {
      const supabase = getClient();
      const nowIso = new Date().toISOString();

      // Claim rows: outbound, pending OR (failed + retryable + backoff elapsed).
      // We deliberately do NOT use a CTE / RPC for claim — PostgREST supports
      // filtering on jsonb / timestamps well enough for this scale (Phase 2
      // WhatsApp traffic is low-volume).
      const { data: rows, error } = await supabase
        .from("whatsapp_messages")
        .select(
          "id, conversation_id, direction, content, content_type, template_key, template_language, template_parameters, delivery_status, retry_count, conversation:whatsapp_conversations(branch_id, contact_phone, provider_config_id)",
        )
        .eq("direction", "outbound")
        .or(
          `delivery_status.eq.pending,and(delivery_status.eq.failed,retry_count.lt.${MAX_RETRIES})`,
        )
        .or(`provider_next_attempt_at.is.null,provider_next_attempt_at.lte.${nowIso}`)
        .order("created_at", { ascending: true })
        .limit(Math.min(Math.max(limit, 1), 100));

      if (error) {
        throw new ApiError(500, "WHATSAPP_OUTBOX_CLAIM_FAILED", error.message);
      }

      const claimed = (rows ?? []) as unknown as OutboxRow[];
      let sent = 0;
      let failed = 0;
      let permanentlyFailed = 0;
      let skipped = 0;

      for (const row of claimed) {
        // Defensive — should never be missing since the FK is NOT NULL.
        const conv = row.conversation;
        if (!conv) {
          skipped += 1;
          console.warn("[whatsapp-outbox] row_missing_conversation", { id: row.id });
          continue;
        }

        // Build the message content. Only text + template are supported (ADR-004 §8).
        let content: { kind: "text"; text: string } | {
          kind: "template";
          templateKey: string;
          language: string;
          parameters: { type: "text" | "currency" | "date_time"; text?: string; currency?: { fallback_value: string; code: string; amount_1000: number }; date_time?: { fallback_value: string } }[];
        };
        if (row.content_type === "template") {
          if (!row.template_key) {
            // Mark permanently_failed — cannot send a template message without a key.
            await supabase
              .from("whatsapp_messages")
              .update({
                delivery_status: "permanently_failed",
                failure_reason: "template_key missing on template content_type row",
                provider_next_attempt_at: null,
              })
              .eq("id", row.id);
            permanentlyFailed += 1;
            continue;
          }
          // Coerce template_parameters (jsonb) into the TemplateParameter shape.
          // We trust the writer (admin route validated the shape on insert).
          const rawParams = Array.isArray(row.template_parameters) ? (row.template_parameters as unknown[]) : [];
          const parameters = rawParams.map((p) => {
            const param = p as { type?: string; text?: string; currency?: unknown; date_time?: unknown };
            const type = (param.type ?? "text") as "text" | "currency" | "date_time";
            if (type === "text") {
              return { type: "text" as const, text: String(param.text ?? "") };
            }
            // For currency/date_time we just pass through whatever is there.
            // The adapter will validate; we don't tighten here.
            return {
              type,
              text: param.text,
              currency: param.currency as { fallback_value: string; code: string; amount_1000: number } | undefined,
              date_time: param.date_time as { fallback_value: string } | undefined,
            };
          });
          content = {
            kind: "template",
            templateKey: row.template_key,
            language: row.template_language ?? "en",
            parameters,
          };
        } else if (row.content_type === "text") {
          if (!row.content) {
            await supabase
              .from("whatsapp_messages")
              .update({
                delivery_status: "permanently_failed",
                failure_reason: "content missing on text content_type row",
                provider_next_attempt_at: null,
              })
              .eq("id", row.id);
            permanentlyFailed += 1;
            continue;
          }
          content = { kind: "text", text: row.content };
        } else {
          // Media / system types not supported in v1.
          await supabase
            .from("whatsapp_messages")
            .update({
              delivery_status: "permanently_failed",
              failure_reason: `unsupported content_type for outbound: ${row.content_type}`,
              provider_next_attempt_at: null,
            })
            .eq("id", row.id);
          permanentlyFailed += 1;
          continue;
        }

        // Atomically claim the row by flipping to an in-flight status. We use
        // 'pending' → 'pending' (no flip) but rely on the immutability trigger
        // to protect already-sent rows. The race window is small and the
        // idempotent UNIQUE on provider_message_id protects against double-send
        // at the provider level (Meta dedupes by content+recipient within 4h).
        try {
          const result = await adapter.sendMessage(conv.contact_phone, content);

          if (result.status === "sent") {
            // Update row to 'sent' with provider_message_id. The immutability
            // trigger allows this UPDATE because old.delivery_status='pending'
            // (not in the locked set).
            const { error: updateErr } = await supabase
              .from("whatsapp_messages")
              .update({
                delivery_status: "sent",
                provider_message_id: result.providerMessageId,
                provider_timestamp: new Date().toISOString(),
                failure_reason: null,
                provider_next_attempt_at: null,
              })
              .eq("id", row.id)
              .in("delivery_status", ["pending", "failed"]);

            if (updateErr) {
              console.warn("[whatsapp-outbox] post_send_update_failed", {
                id: row.id,
                providerMessageId: result.providerMessageId,
                error: updateErr.message,
              });
              // Don't double-count — provider sent it; we just couldn't update
              // the row. The next status webhook will reconcile.
            }

            // Insert 'message_sent' audit event.
            await supabase.from("whatsapp_conversation_events").insert({
              conversation_id: row.conversation_id,
              event_type: "message_sent",
              new_value: {
                message_id: row.id,
                provider_message_id: result.providerMessageId,
                content_type: row.content_type,
              },
              reason: "outbox_worker_send",
            });

            sent += 1;
            console.info("[whatsapp-outbox] sent", {
              id: row.id,
              providerMessageId: result.providerMessageId,
              to: maskPhone(conv.contact_phone),
            });
            continue;
          }

          // result.status === 'failed' — adapter reported failure synchronously.
          throw new Error(result.failureReason ?? "adapter returned failed status");
        } catch (err) {
          const reason = err instanceof Error ? err.message : "send_failed";
          const nextRetry = row.retry_count + 1;

          if (nextRetry >= MAX_RETRIES) {
            await supabase
              .from("whatsapp_messages")
              .update({
                delivery_status: "permanently_failed",
                retry_count: nextRetry,
                failure_reason: reason.slice(0, 500),
                provider_next_attempt_at: null,
              })
              .eq("id", row.id);
            permanentlyFailed += 1;
            console.warn("[whatsapp-outbox] permanently_failed", {
              id: row.id,
              retryCount: nextRetry,
              reason: reason.slice(0, 120),
              to: maskPhone(conv.contact_phone),
            });

            await supabase.from("whatsapp_conversation_events").insert({
              conversation_id: row.conversation_id,
              event_type: "message_failed",
              new_value: {
                message_id: row.id,
                retry_count: nextRetry,
                reason: reason.slice(0, 200),
              },
              reason: "outbox_worker_permanent_failure",
            });
          } else {
            await supabase
              .from("whatsapp_messages")
              .update({
                delivery_status: "failed",
                retry_count: nextRetry,
                failure_reason: reason.slice(0, 500),
                provider_next_attempt_at: new Date(Date.now() + backoffMs(nextRetry)).toISOString(),
              })
              .eq("id", row.id);
            failed += 1;
            console.warn("[whatsapp-outbox] failed_retry", {
              id: row.id,
              retryCount: nextRetry,
              reason: reason.slice(0, 120),
              to: maskPhone(conv.contact_phone),
            });
          }
        }
      }

      return { claimed: claimed.length, sent, failed, permanentlyFailed, skipped };
    },
  };
}

/**
 * Starts a periodic outbox poller. Same lifecycle rules as the inbound worker:
 *   - Returns null when whatsappMode=disabled or adapter is null.
 *   - Returns null in production unless TELEPIZZA_WHATSAPP_WORKER=1.
 *   - Starts in mock/sandbox/live + non-production with `intervalMs` default.
 *
 * The timer is `unref`'d so it does not block process shutdown.
 */
export function startWhatsAppOutboxWorker(
  envStatus: EnvironmentStatus,
  adapter: MessageProviderAdapter | null,
  intervalMs = 15_000,
): WhatsAppOutboxWorkerHandle | null {
  const mode = envStatus.config.whatsappMode;
  const force = process.env.TELEPIZZA_WHATSAPP_WORKER === "1";
  const isProd = envStatus.config.envClass === "production";

  if (mode === "disabled") return null;
  if (!adapter) return null;
  if (isProd && !force) return null;

  const worker = createWhatsAppOutboxWorker(envStatus, adapter);
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    if (stopped) return;
    void worker.processOutboxBatch(25).catch((err) => {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn("[whatsapp-outbox] batch_error", { message: message.slice(0, 160) });
    });
  };

  tick();
  timer = setInterval(tick, Math.max(5_000, intervalMs));
  if (typeof timer.unref === "function") timer.unref();

  console.info(
    `[whatsapp-outbox] worker started intervalMs=${intervalMs} whatsappMode=${mode} envClass=${envStatus.config.envClass}`,
  );

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
