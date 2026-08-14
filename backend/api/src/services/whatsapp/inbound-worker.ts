/**
 * WhatsApp inbound worker (ADR-004 §7)
 *
 * Drains the `whatsapp_inbound_events` queue:
 *   1. SELECT a batch of unprocessed events (processed_at IS NULL)
 *   2. For each event:
 *      a. Use the provider adapter to `normalizeWebhookEvent()` →
 *         one or more NormalizedWebhookEvent (message | status).
 *      b. For each normalized event:
 *         - "message": resolve/create conversation + provisional customer,
 *           idempotent-upsert to `whatsapp_messages` (UNIQUE on provider_message_id),
 *           update conversation last_message_at / last_message_preview / unread_count.
 *         - "status": UPDATE the matching `whatsapp_messages.delivery_status`.
 *      c. Mark the inbound event row as processed (set processed_at, clear/record error).
 *
 * Idempotency: every normalized message has a `provider_message_id` (Meta wamid)
 * with a UNIQUE constraint. Duplicate webhook deliveries hit
 * `ON CONFLICT (provider_message_id) DO NOTHING` and return without error.
 *
 * Failure handling: if normalization or DB write fails, the inbound event row
 * is still marked processed (with `processing_error` set + `retry_count` incremented).
 * This prevents the queue from growing unbounded on malformed payloads. A
 * separate re-queue function can be added later to retry rows with
 * `processing_error IS NOT NULL AND retry_count < MAX`.
 *
 * Authority: ADR-004 §7 (Webhook contract: verify → 200 OK → async process)
 *           ADR-004 §3 (Provisional customer identity for unknown phones)
 *           ADR-004 §5 (Idempotent webhook upsert via wamid UNIQUE)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type {
  MessageProviderAdapter,
  NormalizedInboundEvent,
  NormalizedStatusEvent,
} from "../providers/adapter.js";

/** Max events processed per batch. Bounded to keep each tick fast. */
const BATCH_SIZE_DEFAULT = 25;

/** Hard cap on retry_count before we stop retrying a row. */
const MAX_RETRY_COUNT = 5;

export interface InboundWorkerStats {
  claimed: number;
  processed: number;
  messagesInserted: number;
  statusUpdates: number;
  failed: number;
}

export interface InboundWorker {
  processInboundBatch(limit?: number): Promise<InboundWorkerStats>;
}

export interface InboundWorkerHandle {
  stop: () => void;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Mask a phone number for logging. Keep the last 4 digits; mask the rest.
 * e.g. "+923001234567" → "*******4567"
 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "(none)";
  return "*".repeat(Math.max(1, phone.length - 4)) + phone.slice(-4);
}

/**
 * Resolve or create a conversation for an inbound message.
 *
 * Rules (ADR-004 §1, §3):
 *   1. Look for an existing OPEN conversation (status != 'closed') for this
 *      contact_phone. If found, use it.
 *   2. If not found, resolve the branch_id:
 *      a. Default provider config's `default_branch_id` (if configured).
 *      b. Fallback: any active branch (defense in depth).
 *   3. Resolve or create the customer record:
 *      a. Look up by phone in `customers`.
 *      b. If not found, create a provisional customer (status='provisional').
 *   4. INSERT the new conversation. The conversation_created trigger
 *      automatically appends a 'created' event to whatsapp_conversation_events.
 *
 * @returns The conversation UUID.
 */
async function resolveConversation(
  supabase: SupabaseClient,
  event: NormalizedInboundEvent,
): Promise<string> {
  const contactPhone = event.fromPhone;

  // 1. Look for an existing open conversation for this phone.
  const { data: existing, error: findErr } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("contact_phone", contactPhone)
    .neq("status", "closed")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    throw new Error(`Failed to query conversations: ${findErr.message}`);
  }
  if (existing?.id) {
    return existing.id;
  }

  // 2. Resolve branch_id — try default provider config first, fallback to first branch.
  let branchId: string | null = null;
  const { data: providerConfig } = await supabase
    .from("whatsapp_provider_configs")
    .select("default_branch_id")
    .eq("is_active", true)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (providerConfig?.default_branch_id) {
    branchId = providerConfig.default_branch_id as string;
  } else {
    // Fallback: pick the first active branch. This is a safety net — in a
    // properly configured deployment, default_branch_id SHOULD be set.
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (branch?.id) {
      branchId = branch.id as string;
    }
  }

  if (!branchId) {
    throw new Error(
      "Cannot resolve branch_id for new conversation. No default_branch_id configured and no branches exist.",
    );
  }

  // 3. Resolve or create the customer record.
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", contactPhone)
    .limit(1)
    .maybeSingle();

  if (existingCustomer?.id) {
    customerId = existingCustomer.id as string;
  } else {
    // Create a provisional customer.
    const lastFour = contactPhone.slice(-4);
    const placeholderName = `WhatsApp ${lastFour}`;
    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({
        phone: contactPhone,
        full_name: placeholderName,
        status: "provisional",
      })
      .select("id")
      .maybeSingle();

    if (custErr || !newCustomer?.id) {
      // Race condition: another worker may have created the customer concurrently.
      // Re-query and use that row instead.
      const { data: retryCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", contactPhone)
        .limit(1)
        .maybeSingle();
      if (retryCustomer?.id) {
        customerId = retryCustomer.id as string;
      } else {
        throw new Error(`Failed to create provisional customer: ${custErr?.message ?? "unknown"}`);
      }
    } else {
      customerId = newCustomer.id as string;
    }
  }

  // 4. Resolve provider_config_id (required FK on whatsapp_conversations).
  const { data: providerConfigIdRow } = await supabase
    .from("whatsapp_provider_configs")
    .select("id")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!providerConfigIdRow?.id) {
    throw new Error("No active whatsapp_provider_configs row found.");
  }
  const providerConfigId = providerConfigIdRow.id as string;

  // 5. INSERT the new conversation. The trg_whatsapp_conversation_created
  //    trigger will append a 'created' event automatically.
  const preview = (event.text ?? "").slice(0, 80);
  const { data: newConv, error: convErr } = await supabase
    .from("whatsapp_conversations")
    .insert({
      branch_id: branchId,
      customer_id: customerId,
      provider_config_id: providerConfigId,
      contact_phone: contactPhone,
      status: "open",
      last_message_at: new Date(event.providerTimestamp).toISOString(),
      last_message_preview: preview,
    })
    .select("id")
    .maybeSingle();

  if (convErr || !newConv?.id) {
    // Race: another worker may have created the conversation concurrently.
    // Re-query for an open conversation.
    const { data: retryConv } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("contact_phone", contactPhone)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (retryConv?.id) {
      return retryConv.id as string;
    }
    throw new Error(`Failed to create conversation: ${convErr?.message ?? "unknown"}`);
  }

  return newConv.id as string;
}

/**
 * Idempotent insert of an inbound message.
 *
 * Uses ON CONFLICT (provider_message_id) DO NOTHING via Supabase's
 * `ignoreDuplicates: true` option. Returns true if a new row was inserted,
 * false if it was a duplicate (already processed in a prior batch).
 */
async function insertInboundMessage(
  supabase: SupabaseClient,
  conversationId: string,
  event: NormalizedInboundEvent,
): Promise<boolean> {
  const isoTimestamp = new Date(event.providerTimestamp).toISOString();

  const { data, error, count } = await supabase
    .from("whatsapp_messages")
    .upsert(
      {
        conversation_id: conversationId,
        direction: "inbound",
        provider_message_id: event.providerMessageId,
        from_phone: event.fromPhone,
        to_phone: event.toPhone,
        content: event.text,
        content_type: event.contentType,
        delivery_status: "delivered",
        provider_timestamp: isoTimestamp,
      },
      { onConflict: "provider_message_id", ignoreDuplicates: true, count: "exact" },
    )
    .select("id");

  if (error) {
    // Code 23505 is the unique violation error code — should be suppressed
    // by ignoreDuplicates, but handle defensively.
    if ((error as { code?: string }).code === "23505") {
      return false;
    }
    throw new Error(`Failed to insert message: ${error.message}`);
  }

  // If no rows returned, it was a duplicate (already existed).
  return (data?.length ?? (count ?? 0)) > 0;
}

/**
 * Update the conversation's last_message_at, last_message_preview, and
 * unread_count after a new inbound message is inserted.
 *
 * Only updates if the new message is more recent than the current
 * last_message_at (defense against out-of-order delivery).
 */
async function updateConversationAfterMessage(
  supabase: SupabaseClient,
  conversationId: string,
  event: NormalizedInboundEvent,
): Promise<void> {
  const isoTimestamp = new Date(event.providerTimestamp).toISOString();
  const preview = (event.text ?? "").slice(0, 80);

  // Read current conversation to check timestamp ordering.
  const { data: conv, error: readErr } = await supabase
    .from("whatsapp_conversations")
    .select("last_message_at, unread_count, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (readErr || !conv) {
    // Best-effort update; don't fail the batch if conversation lookup fails.
    console.warn("[whatsapp-inbound-worker] conversation lookup failed", {
      conversationId,
      err: String(readErr?.message ?? "not found").slice(0, 120),
    });
    return;
  }

  // Skip if the existing last_message_at is newer than this event
  // (out-of-order delivery, e.g. a delayed webhook retry for an old message).
  const existingLastAt = conv.last_message_at as string | null;
  if (existingLastAt && new Date(existingLastAt).getTime() >= event.providerTimestamp) {
    return;
  }

  // Bump unread_count only if the conversation is open/in_progress/escalated
  // (i.e. not yet resolved/closed). For resolved/closed, the message still
  // lands, but unread_count stays 0 (the next agent action will reopen).
  const shouldBump = conv.status === "open" || conv.status === "in_progress" || conv.status === "escalated";
  const newUnread = shouldBump ? (conv.unread_count as number) + 1 : (conv.unread_count as number);

  await supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: isoTimestamp,
      last_message_preview: preview,
      unread_count: newUnread,
    })
    .eq("id", conversationId);
}

/**
 * Update a message's delivery_status from a status callback.
 *
 * Per ADR-004 §5, the immutability trigger allows updating delivery_status,
 * provider_timestamp, failure_reason, and retry_count on outbound messages.
 * Inbound messages are append-only (no UPDATE) — but they should never receive
 * status callbacks (status callbacks are for outbound messages we sent).
 *
 * Status ordering: sent < delivered < read. We don't downgrade.
 * "failed" is terminal; further updates are ignored.
 */
async function applyStatusUpdate(
  supabase: SupabaseClient,
  event: NormalizedStatusEvent,
): Promise<boolean> {
  const isoTimestamp = new Date(event.providerTimestamp).toISOString();

  // Find the existing message.
  const { data: msg, error: findErr } = await supabase
    .from("whatsapp_messages")
    .select("id, delivery_status, direction")
    .eq("provider_message_id", event.providerMessageId)
    .limit(1)
    .maybeSingle();

  if (findErr || !msg) {
    // Status for an unknown message — Meta sometimes sends statuses for messages
    // we didn't track. Log and ignore (still counts as processed).
    console.warn("[whatsapp-inbound-worker] status for unknown message", {
      wamid: event.providerMessageId,
      err: String(findErr?.message ?? "not found").slice(0, 120),
    });
    return false;
  }

  // Don't downgrade.
  const current = msg.delivery_status as string;
  const order = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 4, permanently_failed: 5 };
  if ((order[current as keyof typeof order] ?? 0) >= (order[event.status] ?? 0)) {
    return false;
  }

  // Don't update inbound messages (append-only per immutability trigger).
  if (msg.direction === "inbound") {
    return false;
  }

  const update: Record<string, unknown> = {
    delivery_status: event.status,
    provider_timestamp: isoTimestamp,
  };
  if (event.failureReason) {
    update.failure_reason = event.failureReason.slice(0, 500);
  }

  await supabase.from("whatsapp_messages").update(update).eq("id", msg.id);
  return true;
}

/**
 * Mark an inbound event row as processed.
 *
 * @param supabase  Supabase client
 * @param eventId   The inbound event row id
 * @param error     If non-null, the error message to record (truncated).
 *                  If null, clears processing_error.
 */
async function markProcessed(
  supabase: SupabaseClient,
  eventId: number,
  error: string | null,
): Promise<void> {
  const update: Record<string, unknown> = {
    processed_at: new Date().toISOString(),
    processing_error: error ? error.slice(0, 1000) : null,
  };
  if (error) {
    update.retry_count = 1; // Each row is processed once; we don't auto-retry.
  }
  await supabase.from("whatsapp_inbound_events").update(update).eq("id", eventId);
}

export function createInboundWorker(
  envStatus: EnvironmentStatus,
  adapter: MessageProviderAdapter,
): InboundWorker {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async processInboundBatch(limit = BATCH_SIZE_DEFAULT): Promise<InboundWorkerStats> {
      const supabase = getClient();
      const batchLimit = Math.min(Math.max(limit, 1), 100);

      // 1. Claim a batch of unprocessed events.
      const { data: rows, error } = await supabase
        .from("whatsapp_inbound_events")
        .select("id, raw_payload, retry_count")
        .is("processed_at", null)
        .lt("retry_count", MAX_RETRY_COUNT)
        .order("created_at", { ascending: true })
        .limit(batchLimit);

      if (error) throw new ApiError(500, "INBOUND_CLAIM_FAILED", error.message);

      const claimed = rows ?? [];
      const stats: InboundWorkerStats = {
        claimed: claimed.length,
        processed: 0,
        messagesInserted: 0,
        statusUpdates: 0,
        failed: 0,
      };

      for (const row of claimed) {
        const eventId = row.id as number;
        try {
          // 2. Normalize the raw payload into one or more events.
          let events;
          try {
            events = adapter.normalizeWebhookEvent(row.raw_payload);
          } catch (normErr) {
            await markProcessed(
              supabase,
              eventId,
              `normalize failed: ${normErr instanceof Error ? normErr.message : String(normErr)}`,
            );
            stats.failed += 1;
            continue;
          }

          if (events.length === 0) {
            // Meta sometimes sends webhooks with no messages/statuses (e.g.
            // for initial verification). Mark as processed with no action.
            await markProcessed(supabase, eventId, null);
            stats.processed += 1;
            continue;
          }

          // 3. Process each normalized event.
          for (const evt of events) {
            if (evt.kind === "message") {
              const conversationId = await resolveConversation(supabase, evt.message);
              const inserted = await insertInboundMessage(supabase, conversationId, evt.message);
              if (inserted) {
                stats.messagesInserted += 1;
                await updateConversationAfterMessage(supabase, conversationId, evt.message);
              }
            } else {
              // status event
              const updated = await applyStatusUpdate(supabase, evt.status);
              if (updated) {
                stats.statusUpdates += 1;
              }
            }
          }

          await markProcessed(supabase, eventId, null);
          stats.processed += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[whatsapp-inbound-worker] event processing failed", {
            eventId,
            err: msg.slice(0, 200),
          });
          await markProcessed(supabase, eventId, msg);
          stats.failed += 1;
        }
      }

      return stats;
    },
  };
}

/**
 * Start a periodic inbound worker poller.
 *
 * Same lifecycle as the notification outbox worker:
 *   - Does NOT start when whatsappMode=disabled.
 *   - Does NOT start in production unless TELEPIZZA_WHATSAPP_WORKER=1.
 *   - In mock/sandbox/test/local: starts with the given interval (default 10s).
 *
 * The worker reads whatsapp_inbound_events and writes to whatsapp_messages,
 * whatsapp_conversations, whatsapp_conversation_events, and customers. All
 * writes use the service-role Supabase client (bypasses RLS — internal worker).
 *
 * Logs only masked phone numbers; never logs raw message content.
 */
export function startInboundWorker(
  envStatus: EnvironmentStatus,
  adapter: MessageProviderAdapter | null,
  intervalMs = 10_000,
): InboundWorkerHandle | null {
  const mode = envStatus.config.whatsappMode;
  const force = process.env.TELEPIZZA_WHATSAPP_WORKER === "1";
  const isProd = envStatus.config.envClass === "production";

  if (mode === "disabled" || !adapter) return null;
  if (isProd && !force) return null;

  const worker = createInboundWorker(envStatus, adapter);
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    if (stopped) return;
    void worker
      .processInboundBatch(25)
      .then((stats) => {
        if (stats.claimed > 0) {
          console.info("[whatsapp-inbound-worker] batch complete", {
            claimed: stats.claimed,
            processed: stats.processed,
            messagesInserted: stats.messagesInserted,
            statusUpdates: stats.statusUpdates,
            failed: stats.failed,
          });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "unknown";
        console.warn("[whatsapp-inbound-worker] batch_error", { message: message.slice(0, 160) });
      });
  };

  tick();
  timer = setInterval(tick, Math.max(5_000, intervalMs));
  if (typeof timer.unref === "function") timer.unref();

  console.info(
    `[whatsapp-inbound-worker] started intervalMs=${intervalMs} whatsappMode=${mode} envClass=${envStatus.config.envClass}`,
  );

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
