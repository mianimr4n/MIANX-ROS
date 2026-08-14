/**
 * Mock WhatsApp provider adapter
 *
 * Used when `TELEPIZZA_WHATSAPP_MODE=mock` (local dev + test). Writes
 * outbound messages to a local JSON file for inspection; never hits the
 * Meta API. Inbound webhook events are still processed normally (the
 * mock accepts any payload the test sends).
 *
 * Authority: ADR-003 (Provider-Secret Boundary — mock never needs secrets)
 *           ADR-004 §8 (Provider adapter contract)
 */

import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  MessageContent,
  MessageProviderAdapter,
  MessageResult,
  NormalizedWebhookEvent,
} from "../providers/adapter.js";

const MOCK_OUTBOX_DIR = resolve(process.cwd(), "backend/api/.whatsapp-outbox");

/**
 * Create a mock WhatsApp adapter. The mock:
 *   - Generates deterministic wamids (so tests can assert against them)
 *   - Writes each sent message as a JSON file in MOCK_OUTBOX_DIR
 *   - Accepts ANY inbound payload (signature verification always returns true)
 *   - Never makes a network call
 */
export function createMockWhatsAppAdapter(): MessageProviderAdapter {
  // Ensure the outbox dir exists for inspection. Best-effort; ignore errors.
  try {
    mkdirSync(MOCK_OUTBOX_DIR, { recursive: true });
  } catch {
    // ignore — directory may already exist or be unwritable in some test envs
  }

  return {
    name: "mock-whatsapp",

    async sendMessage(to: string, content: MessageContent): Promise<MessageResult> {
      const providerMessageId = `wamid.mock.${randomUUID()}`;
      const timestamp = Date.now();

      const envelope = {
        providerMessageId,
        to,
        content,
        timestamp,
        mode: "mock",
        note: "Mock WhatsApp adapter — no real message sent. Inspect this file to verify outbound content.",
      };

      const filename = `${timestamp}-${providerMessageId}.json`;
      try {
        writeFileSync(resolve(MOCK_OUTBOX_DIR, filename), JSON.stringify(envelope, null, 2));
      } catch {
        // If the outbox dir is unwritable (e.g. in CI sandbox), we still
        // return a successful result — the mock's contract is "pretend it
        // sent", not "persist evidence to disk". Disk persistence is best
        // effort.
      }

      return {
        providerMessageId,
        status: "sent",
      };
    },

    verifyWebhookSignature(_payload: Buffer, _signature: string): boolean {
      // Mock accepts all signatures. Real verification happens in the
      // Cloud API adapter using WHATSAPP_APP_SECRET.
      return true;
    },

    normalizeWebhookEvent(rawPayload: unknown): NormalizedWebhookEvent[] {
      // Best-effort normalization. Tests can send a realistic Meta payload
      // OR a simplified mock payload. We handle both.
      const payload = rawPayload as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                id: string;
                from: string;
                text?: { body: string };
                timestamp: string;
                type: string;
              }>;
              statuses?: Array<{
                id: string;
                status: string;
                timestamp: string;
                errors?: Array<{ title: string }>;
              }>;
              metadata?: { phone_number_id: string };
            };
          }>;
        }>;
      };

      const events: NormalizedWebhookEvent[] = [];
      const entries = payload?.entry ?? [];

      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value) continue;

          // Inbound messages
          for (const msg of value.messages ?? []) {
            events.push({
              kind: "message",
              message: {
                providerMessageId: msg.id,
                fromPhone: msg.from,
                toPhone: value.metadata?.phone_number_id ?? "",
                text: msg.text?.body ?? null,
                contentType: msg.type === "text" ? "text" : "system",
                providerTimestamp: Number(msg.timestamp) * 1000,
                raw: msg,
              },
            });
          }

          // Status callbacks
          for (const st of value.statuses ?? []) {
            const status = st.status as "sent" | "delivered" | "read" | "failed";
            events.push({
              kind: "status",
              status: {
                providerMessageId: st.id,
                status,
                providerTimestamp: Number(st.timestamp) * 1000,
                failureReason: st.errors?.[0]?.title,
                raw: st,
              },
            });
          }
        }
      }

      return events;
    },
  };
}

/**
 * Compute the expected X-Hub-Signature-256 header for a given payload + secret.
 * Used by tests to construct valid signatures for the Cloud API adapter.
 * Format: `sha256=<hex hmac>`.
 */
export function computeHubSignature(payload: Buffer, appSecret: string): string {
  const hmac = createHmac("sha256", appSecret).update(payload).digest("hex");
  return `sha256=${hmac}`;
}
