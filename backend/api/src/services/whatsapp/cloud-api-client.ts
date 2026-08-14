/**
 * WhatsApp Cloud API provider adapter
 *
 * Used when `TELEPIZZA_WHATSAPP_MODE=sandbox|live`. Talks to the Meta
 * Graph API at https://graph.facebook.com/<version>/<phone_number_id>/messages.
 * Verifies inbound webhook signatures using WHATSAPP_APP_SECRET (HMAC-SHA256).
 *
 * Per ADR-003, the access token and app secret are read from process.env
 * (resolved into `WhatsAppEnvConfig` by env.ts at startup). They are NEVER
 * persisted to DB, NEVER logged, NEVER returned by any API.
 *
 * Authority: ADR-003 (Provider-Secret Boundary)
 *           ADR-004 §7 (Webhook contract: verify → 200 OK → async)
 *           ADR-004 §8 (Provider adapter contract)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { WhatsAppEnvConfig } from "../../config/env.js";
import type {
  MessageContent,
  MessageProviderAdapter,
  MessageResult,
  NormalizedWebhookEvent,
  TemplateParameter,
} from "../providers/adapter.js";

const META_GRAPH_BASE = "https://graph.facebook.com";

/**
 * Create a WhatsApp Cloud API adapter.
 *
 * @param config  WhatsApp env config (secrets from process.env per ADR-003)
 * @throws if required env vars are missing — caller (env.ts) already validates
 *         this in evaluateLocalSafety(), so this is a defense-in-depth check.
 */
export function createCloudApiWhatsAppAdapter(config: WhatsAppEnvConfig): MessageProviderAdapter {
  if (!config.accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN is required for the Cloud API adapter (ADR-003).");
  }
  if (!config.appSecret) {
    throw new Error("WHATSAPP_APP_SECRET is required for the Cloud API adapter (ADR-003).");
  }
  if (!config.phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is required for the Cloud API adapter.");
  }

  return {
    name: "whatsapp-cloud-api",

    async sendMessage(to: string, content: MessageContent): Promise<MessageResult> {
      const url = `${META_GRAPH_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;
      const body = buildOutboundPayload(to, content);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "(no body)");
        // Do NOT log the access token or Authorization header. Log only status + error body.
        return {
          providerMessageId: "",
          status: "failed",
          failureReason: `Meta API ${response.status}: ${errorText.slice(0, 500)}`,
        };
      }

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (data.error) {
        return {
          providerMessageId: "",
          status: "failed",
          failureReason: data.error.message,
        };
      }

      const wamid = data.messages?.[0]?.id;
      if (!wamid) {
        return {
          providerMessageId: "",
          status: "failed",
          failureReason: "Meta API returned 200 but no message id in response.",
        };
      }

      return {
        providerMessageId: wamid,
        status: "sent",
      };
    },

    verifyWebhookSignature(payload: Buffer, signature: string): boolean {
      // X-Hub-Signature-256 format: "sha256=<hex>"
      if (!signature.startsWith("sha256=")) {
        return false;
      }
      const expectedHex = signature.slice("sha256=".length);
      const expected = Buffer.from(expectedHex, "hex");

      const actual = createHmac("sha256", config.appSecret).update(payload).digest();

      // Constant-time comparison to prevent timing attacks.
      if (expected.length !== actual.length) {
        return false;
      }
      return timingSafeEqual(expected, actual);
    },

    normalizeWebhookEvent(rawPayload: unknown): NormalizedWebhookEvent[] {
      // Same normalization logic as the mock adapter. Shared here to keep
      // the Cloud API adapter self-contained; if the logic diverges later
      // (e.g. we add media handling), we can extract to a shared helper.
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
 * Build the JSON body for a Meta Cloud API POST /messages call.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
function buildOutboundPayload(to: string, content: MessageContent): unknown {
  if (content.kind === "text") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: content.text },
    };
  }

  // Template
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: content.templateKey,
      language: { code: content.language },
      components: buildTemplateComponents(content.parameters),
    },
  };
}

function buildTemplateComponents(parameters: TemplateParameter[]): unknown[] {
  // v1: only text parameters. The Cloud API expects a single "body" component
  // with one parameter object per {{N}} placeholder, in order.
  if (parameters.length === 0) {
    return [];
  }
  return [
    {
      type: "body",
      parameters: parameters.map((p) => {
        if (p.type === "text") {
          return { type: "text", text: p.text ?? "" };
        }
        if (p.type === "currency") {
          return {
            type: "currency",
            currency: {
              fallback_value: p.currency?.fallback_value ?? "",
              code: p.currency?.code ?? "USD",
              amount_1000: p.currency?.amount_1000 ?? 0,
            },
          };
        }
        // date_time
        return {
          type: "date_time",
          date_time: { fallback_value: p.date_time?.fallback_value ?? "" },
        };
      }),
    },
  ];
}
