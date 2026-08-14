/**
 * In-memory rate limit for WhatsApp webhook POST (per IP).
 *
 * Meta retries webhook delivery on non-2xx with exponential backoff, but a
 * misconfigured Meta app or a malicious actor could flood the endpoint.
 * This limiter caps inbound webhook receipts per IP. Process-local (not
 * distributed) — mirrors the dine-in/quote/guest-access limiters.
 *
 * Authority: ADR-004 §7 (webhook contract — must return 200 fast)
 *           CodeQL: js/missing-rate-limitting
 */

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../common/http.js";
import { getRequestIp } from "../orders/quote-rate-limit.js";

const buckets = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;
// Meta sends bursts of webhook deliveries (one per message + status callbacks).
// 200/min/IP is generous for legitimate traffic; anything higher is likely abuse.
const MAX_PER_WINDOW = 200;

function bucketKey(ip: string): string {
  return `whatsapp-webhook:${ip}`;
}

export function assertWhatsAppWebhookRateLimit(ip: string): void {
  const key = bucketKey(ip);
  const now = Date.now();
  const prior = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (prior.length >= MAX_PER_WINDOW) {
    throw new ApiError(429, "RATE_LIMITED", "Too many webhook requests from this IP. Please retry later.");
  }
  prior.push(now);
  buckets.set(key, prior);
}

/** Test helper — clears buckets between tests. */
export function resetWhatsAppWebhookRateLimitBuckets(): void {
  buckets.clear();
}

export function whatsAppWebhookRateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    assertWhatsAppWebhookRateLimit(getRequestIp(req));
    return next();
  } catch (error) {
    return next(error);
  }
}
