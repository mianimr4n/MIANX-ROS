/**
 * ADR-004 §8 — Provider adapter contract
 *
 * Normalizes across messaging providers (WhatsApp Cloud API today; SMS /
 * email-to-SMS gateway future). Each provider implementation MUST satisfy
 * this interface.
 *
 * Authority: ADR-004 "WhatsApp Conversation Ownership & Routing" §8
 *           ADR-003 "Provider-Secret Boundary Architecture" (secrets never in DB)
 */

/**
 * Content of a message to send. Either a plain text body, or a template
 * invocation with parameters. Media (images, docs) is out of scope for
 * v1 — text + template only.
 */
export type MessageContent =
  | { kind: "text"; text: string }
  | {
      kind: "template";
      templateKey: string;
      language: string;
      parameters: TemplateParameter[];
    };

/**
 * A single template parameter. WhatsApp supports text, currency, and
 * date-time parameters; v1 ships text only.
 */
export interface TemplateParameter {
  type: "text" | "currency" | "date_time";
  /** For type="text": the text value. For currency: ISO 4217 code. For date_time: ISO 8601. */
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
}

/**
 * Result of sending a message. The adapter MUST return this shape so the
 * outbox worker can update the `whatsapp_messages` row with the provider's
 * message ID and initial delivery status.
 */
export interface MessageResult {
  /** Provider's message ID (e.g. Meta wamid). Used for idempotent webhook upsert. */
  providerMessageId: string;
  /** Initial status. Meta returns 200 + wamid immediately; actual delivery is via webhook. */
  status: "sent" | "failed";
  /** Failure reason if status="failed". */
  failureReason?: string;
}

/**
 * Normalized inbound event. The webhook receiver accepts raw Meta payloads
 * and passes them to the adapter's `normalizeInboundEvent()` to produce
 * this shape, which the inbound worker persists to `whatsapp_messages`.
 */
export interface NormalizedInboundEvent {
  /** Meta wamid. UNIQUE in whatsapp_messages — idempotent upsert key. */
  providerMessageId: string;
  /** E.164 of the sender (customer). */
  fromPhone: string;
  /** E.164 of the recipient (our WABA number). */
  toPhone: string;
  /** Message body (text). Null for media-only messages (v1: not supported). */
  text: string | null;
  /** Type of message. v1: text only. */
  contentType: "text" | "template" | "image_ref" | "doc_ref" | "audio_ref" | "video_ref" | "system";
  /** Provider-assigned timestamp (Unix ms). Use this for ordering, NOT created_at. */
  providerTimestamp: number;
  /** Raw payload preserved for the `whatsapp_inbound_events` audit table. */
  raw: unknown;
}

/**
 * Normalized status event (delivery receipt). Drives the
 * `whatsapp_messages.delivery_status` state machine.
 */
export interface NormalizedStatusEvent {
  /** wamid of the message this status applies to. */
  providerMessageId: string;
  /** New delivery status. */
  status: "sent" | "delivered" | "read" | "failed";
  /** Provider timestamp of the status event (Unix ms). */
  providerTimestamp: number;
  /** Failure reason if status="failed". */
  failureReason?: string;
  /** Raw payload preserved for audit. */
  raw: unknown;
}

/**
 * Union of normalized inbound events (new message OR status callback).
 * Meta sends both via the same webhook endpoint; the adapter disambiguates.
 */
export type NormalizedWebhookEvent =
  | { kind: "message"; message: NormalizedInboundEvent }
  | { kind: "status"; status: NormalizedStatusEvent };

/**
 * Provider adapter contract. Implementations:
 *   - `services/whatsapp/cloud-api-client.ts` — Meta Cloud API (sandbox + live)
 *   - `services/whatsapp/mock-client.ts` — mock for local/test (no network)
 *
 * The adapter is the ONLY place that talks to the provider. Application
 * code calls adapter methods; never the provider HTTP API directly.
 */
export interface MessageProviderAdapter {
  /** Human-readable name for logs / diagnostics. */
  readonly name: string;

  /**
   * Send a message to a customer. Returns the provider's message ID and
   * initial status. The actual delivery confirmation comes asynchronously
   * via webhook → `normalizeWebhookEvent()`.
   *
   * @throws Error if the provider call fails (network, auth, rate limit).
   *         The outbox worker catches and retries with backoff.
   */
  sendMessage(to: string, content: MessageContent): Promise<MessageResult>;

  /**
   * Verify the X-Hub-Signature-256 HMAC-SHA256 signature on an inbound
   * webhook payload. Per ADR-003, the secret (`WHATSAPP_APP_SECRET`) is
   * read from process.env inside the adapter — it is NEVER passed in.
   *
   * @returns true if signature is valid, false otherwise.
   */
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;

  /**
   * Normalize a raw webhook payload into one or more domain events.
   * Meta batches multiple events in a single webhook; this method
   * returns an array to preserve that.
   *
   * @throws Error if the payload is malformed (should not happen for
   *         signature-verified payloads from Meta).
   */
  normalizeWebhookEvent(rawPayload: unknown): NormalizedWebhookEvent[];
}
