/**
 * ADR-016 §5 — OTP hashing + verification utilities.
 *
 * Plaintext OTPs are NEVER stored. We compute an HMAC-SHA256 hash of
 * the plaintext OTP signed with the OTP_HMAC_SECRET env var, and store
 * only the hash. Verification uses constant-time comparison via
 * `crypto.timingSafeEqual` to prevent timing attacks.
 *
 * Authority: ADR-016 (OTP Verification Architecture) §5
 *           ADR-003 (Provider-Secret Boundary — secrets in env vars)
 */

import { createHmac, timingSafeEqual, randomInt, createHash, randomBytes } from "node:crypto";

/**
 * Compute the HMAC-SHA256 hash of a plaintext OTP.
 *
 * @param plaintextOtp - 6-digit numeric string.
 * @param secret - OTP_HMAC_SECRET env var (32+ bytes recommended).
 * @returns 64-character lowercase hex string.
 */
export function hashOtp(plaintextOtp: string, secret: string): string {
  if (!secret || secret.length < 16) {
    throw new Error(
      "OTP_HMAC_SECRET must be set and at least 16 characters long (32+ recommended). Per ADR-003, secrets must be in env vars.",
    );
  }
  return createHmac("sha256", secret).update(plaintextOtp, "utf8").digest("hex");
}

/**
 * Constant-time comparison of two hex hash strings.
 *
 * @returns true if the hashes match exactly (same length + same bytes).
 */
export function constantTimeHashCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    // If either string is not valid hex, return false (do NOT leak why).
    return false;
  }
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 *
 * Uses `crypto.randomInt(0, 1_000_000)` (NOT Math.random) to avoid
 * modulo bias. Returns a zero-padded 6-character string.
 */
export function generateSixDigitOtp(): string {
  const code = randomInt(0, 1_000_000);
  return code.toString().padStart(6, "0");
}

/**
 * Hash a refresh token (SHA-256). Used for auth_refresh_tokens.token_hash
 * (ADR-017 §2). The plaintext refresh token is returned to the client
 * ONCE and never stored.
 */
export function hashRefreshToken(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/**
 * Generate a cryptographically secure refresh token (48 random bytes
 * base64url-encoded, ~64 chars).
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}
