/**
 * ADR-016 §5 — OTP rate limiter.
 *
 * Enforces per-phone and per-IP rate limits on OTP requests and verifications.
 * Limits are configurable via env vars with sensible defaults.
 *
 * Limits:
 *   - Per phone per 10 minutes: 3 requests (default OTP_RATE_LIMIT_PHONE_PER_10MIN)
 *   - Per phone per hour:       5 requests (default OTP_RATE_LIMIT_PHONE_PER_HOUR)
 *   - Per phone per day:        10 requests (default OTP_RATE_LIMIT_PHONE_PER_DAY)
 *   - Per IP per minute (verify): 10 attempts (default OTP_RATE_LIMIT_VERIFY_PER_IP_PER_MIN)
 *
 * The rate limiter queries the otp_requests table directly (no Redis dependency).
 * Performance is acceptable for v1 (single-tenant, Pakistan-only volume).
 *
 * Authority: ADR-016 §5
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface OtpRateLimitConfig {
  phonePer10Min: number;
  phonePerHour: number;
  phonePerDay: number;
  verifyPerIpPerMin: number;
}

export const DEFAULT_OTP_RATE_LIMITS: OtpRateLimitConfig = {
  phonePer10Min: 3,
  phonePerHour: 5,
  phonePerDay: 10,
  verifyPerIpPerMin: 10,
};

export interface RateLimitDecision {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Check whether a new OTP request is allowed for the given phone.
 * Returns { allowed: true } if the request is within all rate limits,
 * or { allowed: false, reason, retryAfterSeconds } if a limit is exceeded.
 */
export async function checkOtpRequestRateLimit(
  supabase: SupabaseClient,
  phoneE164: string,
  config: OtpRateLimitConfig = DEFAULT_OTP_RATE_LIMITS,
): Promise<RateLimitDecision> {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Query all three windows in one round-trip using a single SELECT with counts.
  const { data, error } = await supabase.rpc("count_otp_requests_by_phone", {
    p_phone_e164: phoneE164,
    p_since_10min: tenMinAgo.toISOString(),
    p_since_1hour: hourAgo.toISOString(),
    p_since_1day: dayAgo.toISOString(),
  });

  if (error) {
    // Fail-open: log + allow. We don't want a DB hiccup to block all OTPs.
    console.warn("[otp-rate-limit] count query failed; failing open:", error.message);
    return { allowed: true };
  }

  const counts = (data ?? {}) as {
    count_10min: number;
    count_1hour: number;
    count_1day: number;
  };

  if (counts.count_10min >= config.phonePer10Min) {
    return {
      allowed: false,
      reason: "rate_limit_exceeded_phone_10min",
      retryAfterSeconds: 10 * 60,
    };
  }
  if (counts.count_1hour >= config.phonePerHour) {
    return {
      allowed: false,
      reason: "rate_limit_exceeded_phone_hour",
      retryAfterSeconds: 60 * 60,
    };
  }
  if (counts.count_1day >= config.phonePerDay) {
    return {
      allowed: false,
      reason: "rate_limit_exceeded_phone_day",
      retryAfterSeconds: 24 * 60 * 60,
    };
  }

  return { allowed: true };
}

/**
 * Check whether a verify attempt is allowed for the given IP.
 * Returns { allowed: true } if the request is within the per-IP verify limit,
 * or { allowed: false, reason, retryAfterSeconds } if exceeded.
 */
export async function checkOtpVerifyRateLimit(
  supabase: SupabaseClient,
  ip: string,
  config: OtpRateLimitConfig = DEFAULT_OTP_RATE_LIMITS,
): Promise<RateLimitDecision> {
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("otp_attempts")
    .select("*", { count: "exact", head: true })
    .eq("attempt_ip", ip)
    .gte("attempted_at", oneMinAgo);

  if (error) {
    console.warn("[otp-rate-limit] verify count query failed; failing open:", error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= config.verifyPerIpPerMin) {
    return {
      allowed: false,
      reason: "rate_limit_exceeded_verify_ip",
      retryAfterSeconds: 60,
    };
  }

  return { allowed: true };
}
