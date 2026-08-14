/**
 * WhatsApp webhook receiver module (ADR-004 §7)
 *
 * Two endpoints:
 *   GET  /api/v1/webhooks/whatsapp — Meta webhook subscription handshake.
 *                                   Compares hub.verify_token against
 *                                   WHATSAPP_VERIFY_TOKEN env var.
 *   POST /api/v1/webhooks/whatsapp — Inbound message + status callback.
 *                                   Verifies X-Hub-Signature-256 HMAC,
 *                                   enqueues raw payload to
 *                                   whatsapp_inbound_events, returns 200 OK
 *                                   immediately. Async worker drains the
 *                                   queue and updates whatsapp_messages.
 *
 * Raw body capture: app.ts registers express.json() with a `verify` hook
 * that stores the original Buffer on req.rawBody. This route reads
 * req.rawBody for HMAC verification; all other routes ignore it.
 *
 * Authority: ADR-003 (Provider-Secret Boundary — verify token + app secret
 *           from env vars only)
 *           ADR-004 §7 (Webhook contract: verify → 200 OK → async process)
 */

import { Router } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { MessageProviderAdapter } from "../../services/providers/adapter.js";

export interface WhatsAppWebhookDependencies {
  envStatus: EnvironmentStatus;
  adapter: MessageProviderAdapter | null;
  /** Optional Supabase client override (for tests). Production creates one from env. */
  supabaseClient?: SupabaseClient;
}

export function createWhatsAppWebhookRouter(deps: WhatsAppWebhookDependencies): Router {
  const router = Router();
  const { envStatus, adapter } = deps;

  // Lazily create the Supabase client only when a POST request arrives and
  // WhatsApp is enabled. This avoids crashing the app at startup if env vars
  // are missing (the /readyz endpoint reports the missing vars; the webhook
  // simply returns 503 if called before env is ready).
  let supabaseCached: SupabaseClient | null = null;
  function getSupabase(): SupabaseClient {
    if (deps.supabaseClient) return deps.supabaseClient;
    if (!supabaseCached) {
      supabaseCached = createClient(
        envStatus.config.supabaseUrl,
        envStatus.config.supabaseServiceRoleKey,
        { auth: { persistSession: false } },
      );
    }
    return supabaseCached;
  }

  // ---------------------------------------------------------------------------
  // GET — Meta webhook verification handshake
  // ---------------------------------------------------------------------------
  // Meta sends: GET /?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
  // We respond with the challenge as plaintext if the verify token matches.
  // No DB access; pure env-var comparison.
  router.get("/", (req, res) => {
    if (envStatus.config.whatsappMode === "disabled") {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "WhatsApp integration is disabled." },
      });
    }

    const mode = req.query["hub.mode"] as string | undefined;
    const token = req.query["hub.verify_token"] as string | undefined;
    const challenge = req.query["hub.challenge"] as string | undefined;

    if (mode !== "subscribe" || !token || !challenge) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing hub.mode, hub.verify_token, or hub.challenge query parameter.",
        },
      });
    }

    const expectedToken = envStatus.config.whatsapp.verifyToken;
    if (!expectedToken) {
      // Should never happen — env.ts evaluateLocalSafety() blocks sandbox/live
      // mode without WHATSAPP_VERIFY_TOKEN. Defense in depth.
      return res.status(500).json({
        ok: false,
        error: {
          code: "CONFIG_ERROR",
          message: "WHATSAPP_VERIFY_TOKEN is not set. Cannot verify webhook subscription.",
        },
      });
    }

    if (token !== expectedToken) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "hub.verify_token does not match." },
      });
    }

    // Meta expects the challenge as plaintext in the response body.
    return res.status(200).type("text/plain").send(challenge);
  });

  // ---------------------------------------------------------------------------
  // POST — Inbound message + status callback
  // ---------------------------------------------------------------------------
  // Step 1: Verify X-Hub-Signature-256 HMAC-SHA256 (500ms budget).
  // Step 2: Return 200 OK immediately — Meta retries on non-2xx.
  // Step 3: Enqueue raw payload to whatsapp_inbound_events for async processing.
  router.post("/", async (req, res) => {
    // If WhatsApp is disabled, return 404 so Meta stops retrying.
    if (envStatus.config.whatsappMode === "disabled" || !adapter) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "WhatsApp integration is disabled." },
      });
    }

    const rawBody = (req as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      // Should never happen — app.ts registers express.json({ verify }) to
      // capture rawBody. Defense in depth.
      return res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Raw body not available for HMAC verification." },
      });
    }

    const signature = req.header("X-Hub-Signature-256") ?? "";

    // Step 1: verify signature. If invalid, 401 — Meta will not retry 4xx.
    if (!adapter.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Invalid X-Hub-Signature-256." },
      });
    }

    // Step 2: parse + enqueue. If parsing fails, we still return 200 to
    // prevent Meta from retrying a malformed payload forever. The error
    // is captured in whatsapp_inbound_events.processing_error.
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch (err) {
      try {
        await getSupabase().from("whatsapp_inbound_events").insert({
          raw_payload: {
            _parse_error: String(err),
            raw: rawBody.toString("utf8").slice(0, 4000),
          },
          signature_verified: true,
          processing_error: `JSON parse failed: ${String(err)}`,
          processed_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error("[whatsapp-webhook] Failed to record parse error:", String(dbErr));
      }
      return res.status(200).json({ ok: true });
    }

    // Step 3: enqueue. The inbound worker will normalize + upsert to
    // whatsapp_messages. We return 200 OK immediately.
    try {
      await getSupabase().from("whatsapp_inbound_events").insert({
        raw_payload: payload,
        signature_verified: true,
      });
    } catch (err) {
      // If the DB insert fails (rare), return 500 so Meta retries.
      // Log the error WITHOUT the payload (which may contain PII).
      console.error("[whatsapp-webhook] Failed to enqueue inbound event:", String(err));
      return res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to enqueue inbound event." },
      });
    }

    // Step 4: 200 OK. Meta considers the webhook delivered.
    return res.status(200).json({ ok: true });
  });

  return router;
}
