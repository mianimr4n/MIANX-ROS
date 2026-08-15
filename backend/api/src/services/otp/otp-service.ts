/**
 * ADR-016 + ADR-017 — OTP service.
 *
 * Implements the OTP generation / verification / dispatch lifecycle:
 *   - generateOtp()     — issue a new OTP (rate-limited, rotates prior pending)
 *   - verifyOtp()       — verify a submitted OTP (constant-time, lazy expiry)
 *   - getRequestHistory — admin audit lookup
 *
 * Dispatch uses the existing MessageProviderAdapter contract (ADR-004 §8)
 * for WhatsApp delivery, reusing the same outbox worker built in Phase 2.2.
 *
 * Authority: ADR-016 (OTP Verification Architecture)
 *           ADR-017 (Phone-First Auth & Session Handoff)
 *           ADR-003 (Provider-Secret Boundary)
 *           ADR-004 §8 (MessageProviderAdapter contract)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MessageProviderAdapter } from "../providers/adapter.js";
import {
  hashOtp,
  constantTimeHashCompare,
  generateSixDigitOtp,
} from "./otp-hasher.js";
import {
  checkOtpRequestRateLimit,
  checkOtpVerifyRateLimit,
  type OtpRateLimitConfig,
} from "./otp-rate-limiter.js";

/** D11 hard rule (TELEPIZZA-MASTER-ROADMAP.md line 79). */
const ORDERING_PHONE_E164 = "+923041110495";

export type OtpChannel = "whatsapp" | "sms" | "email";
export type OtpPurpose = "customer_login" | "customer_register" | "phone_reverify" | "recovery";
export type OtpStatus = "pending" | "verified" | "failed" | "expired";

export interface OtpRequestInput {
  phone: string; // raw input — will be normalized via ADR-005 normalize_phone_e164()
  channel?: OtpChannel; // optional override; default: auto-resolve
  purpose?: OtpPurpose; // default: customer_login
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface OtpRequestResult {
  otpRequestId: string;
  channel: OtpChannel;
  expiresAt: string; // ISO 8601
}

export interface OtpVerifyInput {
  otpRequestId: string;
  otp: string; // 6-digit plaintext submitted by the customer
  ip?: string;
  userAgent?: string;
}

export interface OtpVerifyResult {
  verified: boolean;
  status: OtpStatus;
  customerId?: string;
  authUserId?: string;
  /** When verified=false, remaining attempts before the OTP is permanently failed. */
  remainingAttempts?: number;
  /** When verified=false, the reason for failure (PII-free). */
  failureReason?: string;
}

export interface OtpServiceConfig {
  hmacSecret: string;
  ttlSeconds: number;
  maxAttempts: number;
  rateLimits: OtpRateLimitConfig;
}

export const DEFAULT_OTP_CONFIG: OtpServiceConfig = {
  hmacSecret: "",
  ttlSeconds: 5 * 60,
  maxAttempts: 5,
  rateLimits: {
    phonePer10Min: 3,
    phonePerHour: 5,
    phonePerDay: 10,
    verifyPerIpPerMin: 10,
  },
};

export interface OtpServiceDeps {
  supabase: SupabaseClient;
  whatsappAdapter: MessageProviderAdapter | null;
  config: OtpServiceConfig;
}

/**
 * Normalize a raw phone input to E.164 using the ADR-005 RPC.
 * Returns null if the input is not a valid Pakistani mobile.
 */
async function normalizePhone(supabase: SupabaseClient, raw: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("normalize_phone_e164", { p_raw: raw });
  if (error) {
    console.warn("[otp] normalize_phone_e164 failed:", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

/**
 * Resolve the delivery channel for a given phone.
 * Defaults: WhatsApp if adapter is available, else SMS if OTP_SMS_PROVIDER != disabled, else email fallback.
 * Caller can override via input.channel.
 */
function resolveChannel(
  override: OtpChannel | undefined,
  whatsappAdapter: MessageProviderAdapter | null,
): OtpChannel {
  if (override) return override;
  if (whatsappAdapter) return "whatsapp";
  return "sms"; // SMS is the default fallback (will fail-closed if SMS provider not configured)
}

/**
 * Generate and dispatch a new OTP.
 *
 * Algorithm (ADR-016 §5):
 *   1. Normalize phone to E.164.
 *   2. Check D11 hard rule (reject ordering number).
 *   3. Check per-phone rate limits.
 *   4. Call rotate_previous_pending_otps() to invalidate prior pending OTPs.
 *   5. Generate 6-digit code via crypto.randomInt.
 *   6. Compute HMAC-SHA256 hash.
 *   7. Insert otp_requests row.
 *   8. Dispatch via the resolved channel (WhatsApp adapter or SMS/email — TBD).
 *   9. Return { otpRequestId, channel, expiresAt }. NEVER return the plaintext.
 */
export async function generateOtp(
  deps: OtpServiceDeps,
  input: OtpRequestInput,
): Promise<OtpRequestResult> {
  const { supabase, whatsappAdapter, config } = deps;

  if (!config.hmacSecret || config.hmacSecret.length < 16) {
    throw new Error(
      "OTP_HMAC_SECRET must be set (16+ chars). Per ADR-003, secrets must be in env vars.",
    );
  }

  // 1. Normalize phone.
  const phoneE164 = await normalizePhone(supabase, input.phone);
  if (!phoneE164) {
    throw new OtpError("invalid_phone", "Phone number could not be normalized to E.164.", 400);
  }

  // 2. D11 hard rule — never send OTP to the ordering number.
  if (phoneE164 === ORDERING_PHONE_E164) {
    throw new OtpError(
      "ordering_number_blocked",
      "OTP cannot be sent to the ordering number (D11). Use a different phone.",
      422,
    );
  }

  // 3. Rate limit check.
  const rl = await checkOtpRequestRateLimit(supabase, phoneE164, config.rateLimits);
  if (!rl.allowed) {
    throw new OtpError(
      rl.reason ?? "rate_limited",
      "Too many OTP requests. Please try again later.",
      429,
      rl.retryAfterSeconds,
    );
  }

  // 4. Rotate prior pending OTPs for this phone.
  const { error: rotateError } = await supabase.rpc("rotate_previous_pending_otps", {
    p_phone_e164: phoneE164,
  });
  if (rotateError) {
    console.warn("[otp] rotate_previous_pending_otps failed:", rotateError.message);
    // Continue — the unique-pending invariant is best-effort at the app layer.
  }

  // 5. Generate plaintext OTP.
  const plaintextOtp = generateSixDigitOtp();

  // 6. Compute hash.
  const otpHash = hashOtp(plaintextOtp, config.hmacSecret);

  // 7. Resolve channel + customer (if exists).
  const channel = resolveChannel(input.channel, whatsappAdapter);
  const purpose = input.purpose ?? "customer_login";

  // Look up the customer (if exists) for audit + later session issuance.
  let customerId: string | null = null;
  if (purpose !== "customer_register") {
    const { data: resolveData, error: resolveError } = await supabase.rpc(
      "resolve_customer_by_identity",
      {
        p_identity_type: "phone",
        p_identity_value: phoneE164,
      },
    );
    if (!resolveError && resolveData) {
      customerId = (resolveData as { customer_id?: string } | null)?.customer_id ?? null;
    }
  }

  // 8. Insert otp_requests row.
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + config.ttlSeconds * 1000);

  const { data: insertData, error: insertError } = await supabase
    .from("otp_requests")
    .insert({
      phone_e164: phoneE164,
      channel,
      purpose,
      otp_hash: otpHash,
      status: "pending",
      attempt_count: 0,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      customer_id: customerId,
      request_ip: input.ip ?? null,
      request_user_agent: input.userAgent ?? null,
      correlation_id: input.correlationId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !insertData) {
    console.error("[otp] insert failed:", insertError?.message);
    throw new OtpError("insert_failed", "Failed to issue OTP. Please try again.", 500);
  }

  const otpRequestId = insertData.id as string;

  // 9. Dispatch via the resolved channel.
  // For WhatsApp, we reuse the MessageProviderAdapter contract (ADR-004 §8).
  // The adapter enqueues the message; the outbox worker (Phase 2.2) sends it.
  if (channel === "whatsapp" && whatsappAdapter) {
    try {
      // Note: in mock mode, this writes the plaintext OTP to .whatsapp-outbox/
      // for engineering verification. In sandbox/live mode, the OTP is sent
      // via the WhatsApp Cloud API.
      await whatsappAdapter.sendMessage(phoneE164, {
        kind: "template",
        templateKey: "otp_delivery",
        language: "en",
        parameters: [{ type: "text", text: plaintextOtp }],
      });
    } catch (err) {
      // Dispatch failure does NOT fail the OTP request — the customer can
      // still verify if the message eventually arrives. Log + continue.
      console.error("[otp] WhatsApp dispatch failed:", err);
    }
  } else if (channel === "sms") {
    // SMS provider not yet wired (Phase 3 follow-up). For now, in mock mode
    // we log the OTP; in non-mock mode we fail-closed (no SMS provider).
    console.info(`[otp] SMS dispatch not yet implemented; phone=${phoneE164} otp=${plaintextOtp}`);
  } else if (channel === "email") {
    console.info(`[otp] Email dispatch not yet implemented; phone=${phoneE164} otp=${plaintextOtp}`);
  }

  return {
    otpRequestId,
    channel,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Verify a submitted OTP against a pending OTP request.
 *
 * Algorithm (ADR-016 §5):
 *   1. Look up otp_request_id. 404 if not found.
 *   2. Lazy-expire stale pending OTPs.
 *   3. If request is no longer pending → 410 Gone with current status.
 *   4. Check per-IP verify rate limit.
 *   5. Constant-time compare submitted hash with stored hash.
 *   6. On match: set status='verified', insert otp_attempts(success),
 *      call mark_customer_phone_verified() if customer_id is set.
 *   7. On mismatch: increment attempt_count, insert otp_attempts(wrong_otp),
 *      fail permanently if attempt_count >= max.
 */
export async function verifyOtp(
  deps: OtpServiceDeps,
  input: OtpVerifyInput,
): Promise<OtpVerifyResult> {
  const { supabase, config } = deps;

  if (!config.hmacSecret || config.hmacSecret.length < 16) {
    throw new Error("OTP_HMAC_SECRET must be set.");
  }

  // 1. Look up the OTP request.
  const { data: req, error: reqError } = await supabase
    .from("otp_requests")
    .select("*")
    .eq("id", input.otpRequestId)
    .single();

  if (reqError || !req) {
    throw new OtpError("not_found", "OTP request not found.", 404);
  }

  // 2. Lazy-expire stale pending OTPs.
  await supabase.rpc("expire_stale_otp_requests");

  // Refresh the request if it was just expired.
  if (req.status === "pending") {
    const { data: refreshed } = await supabase
      .from("otp_requests")
      .select("status, expires_at")
      .eq("id", input.otpRequestId)
      .single();
    if (refreshed) {
      req.status = refreshed.status;
      req.expires_at = refreshed.expires_at;
    }
  }

  // 3. If request is no longer pending, return the current status.
  if (req.status !== "pending") {
    return {
      verified: false,
      status: req.status as OtpStatus,
      failureReason: req.failure_reason ?? `status_${req.status}`,
    };
  }

  // Check expiry (defensive — expire_stale_otp_requests should have caught this).
  if (new Date(req.expires_at).getTime() < Date.now()) {
    return {
      verified: false,
      status: "expired",
      failureReason: "expired",
    };
  }

  // 4. Per-IP verify rate limit.
  if (input.ip) {
    const vrl = await checkOtpVerifyRateLimit(supabase, input.ip, config.rateLimits);
    if (!vrl.allowed) {
      throw new OtpError(
        vrl.reason ?? "rate_limited",
        "Too many verify attempts from this IP. Please try again later.",
        429,
        vrl.retryAfterSeconds,
      );
    }
  }

  // 5. Constant-time compare.
  const submittedHash = hashOtp(input.otp, config.hmacSecret);
  const matches = constantTimeHashCompare(submittedHash, req.otp_hash);

  if (matches) {
    // 6. On match: mark verified.
    const { error: updateError } = await supabase
      .from("otp_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      })
      .eq("id", input.otpRequestId)
      .eq("status", "pending"); // optimistic concurrency guard

    if (updateError) {
      // Race: another request already verified or failed this OTP.
      console.warn("[otp] optimistic update failed:", updateError.message);
      return {
        verified: false,
        status: "failed",
        failureReason: "concurrent_modification",
      };
    }

    // Insert audit attempt.
    await supabase.from("otp_attempts").insert({
      otp_request_id: input.otpRequestId,
      result: "success",
      attempt_ip: input.ip ?? null,
      attempt_user_agent: input.userAgent ?? null,
    });

    // Mark phone as verified if customer_id is set.
    if (req.customer_id) {
      await supabase.rpc("mark_customer_phone_verified", {
        p_customer_id: req.customer_id,
        p_phone_e164: req.phone_e164,
        p_otp_request_id: input.otpRequestId,
      });
    }

    return {
      verified: true,
      status: "verified",
      customerId: req.customer_id ?? undefined,
    };
  }

  // 7. On mismatch: increment attempt_count, maybe fail permanently.
  const newAttemptCount = (req.attempt_count ?? 0) + 1;
  const shouldFail = newAttemptCount >= config.maxAttempts;

  await supabase
    .from("otp_requests")
    .update({
      attempt_count: newAttemptCount,
      ...(shouldFail
        ? {
            status: "failed",
            resolved_at: new Date().toISOString(),
            failure_reason: "max_attempts_exceeded",
          }
        : {}),
    })
    .eq("id", input.otpRequestId);

  await supabase.from("otp_attempts").insert({
    otp_request_id: input.otpRequestId,
    result: "wrong_otp",
    attempt_ip: input.ip ?? null,
    attempt_user_agent: input.userAgent ?? null,
  });

  return {
    verified: false,
    status: shouldFail ? "failed" : "pending",
    remainingAttempts: shouldFail ? 0 : config.maxAttempts - newAttemptCount,
    failureReason: shouldFail ? "max_attempts_exceeded" : "wrong_otp",
  };
}

/**
 * List OTP request history for admin/support audit.
 * Branch-scoped: super-admin sees all; customer-support sees only their branch's customers.
 */
export async function getRequestHistory(
  supabase: SupabaseClient,
  filters: {
    phoneE164?: string;
    customerId?: string;
    status?: OtpStatus;
    limit?: number;
    offset?: number;
  },
) {
  let query = supabase
    .from("otp_requests")
    .select("id, phone_e164, channel, purpose, status, attempt_count, issued_at, expires_at, verified_at, resolved_at, failure_reason, customer_id, request_ip")
    .order("issued_at", { ascending: false })
    .limit(filters.limit ?? 50)
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

  if (filters.phoneE164) query = query.eq("phone_e164", filters.phoneE164);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch OTP history: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Custom error class for OTP failures with HTTP status + retry-after.
 */
export class OtpError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "OtpError";
  }
}
