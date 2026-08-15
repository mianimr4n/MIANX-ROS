/**
 * OTP service factory (ADR-016 + ADR-017).
 *
 * Wires together the OTP service + session service with the Supabase
 * service-role client and the existing WhatsApp adapter.
 *
 * Authority: ADR-016 (OTP Verification Architecture)
 *           ADR-017 (Phone-First Auth & Session Handoff)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

import type { EnvironmentStatus } from "../../config/env.js";
import type { MessageProviderAdapter } from "../providers/adapter.js";
import {
  DEFAULT_OTP_CONFIG,
  type OtpServiceConfig,
  type OtpServiceDeps,
} from "./otp-service.js";
import {
  DEFAULT_SESSION_CONFIG,
  type SessionConfig,
  type SessionServiceDeps,
} from "./session-service.js";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new Error("Supabase service role configuration is missing for OTP service.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveOtpConfig(envStatus: EnvironmentStatus): OtpServiceConfig {
  const source = process.env;
  const hmacSecret = source.OTP_HMAC_SECRET ?? "";
  if (!hmacSecret && envStatus.config.envClass !== "test") {
    // In test env, we'll inject a test secret via the test harness.
    console.warn(
      "[otp] OTP_HMAC_SECRET not set — OTP service will fail at runtime. Per ADR-003, secrets must be in env vars.",
    );
  }
  return {
    hmacSecret,
    ttlSeconds: Number(source.OTP_TTL_SECONDS ?? DEFAULT_OTP_CONFIG.ttlSeconds),
    maxAttempts: Number(source.OTP_MAX_ATTEMPTS ?? DEFAULT_OTP_CONFIG.maxAttempts),
    rateLimits: {
      phonePer10Min: Number(source.OTP_RATE_LIMIT_PHONE_PER_10MIN ?? DEFAULT_OTP_CONFIG.rateLimits.phonePer10Min),
      phonePerHour: Number(source.OTP_RATE_LIMIT_PHONE_PER_HOUR ?? DEFAULT_OTP_CONFIG.rateLimits.phonePerHour),
      phonePerDay: Number(source.OTP_RATE_LIMIT_PHONE_PER_DAY ?? DEFAULT_OTP_CONFIG.rateLimits.phonePerDay),
      verifyPerIpPerMin: Number(source.OTP_RATE_LIMIT_VERIFY_PER_IP_PER_MIN ?? DEFAULT_OTP_CONFIG.rateLimits.verifyPerIpPerMin),
    },
  };
}

function resolveSessionConfig(envStatus: EnvironmentStatus): SessionConfig {
  const source = process.env;
  return {
    accessTokenTtlSeconds: Number(source.OTP_SESSION_ACCESS_TOKEN_TTL_SECONDS ?? DEFAULT_SESSION_CONFIG.accessTokenTtlSeconds),
    refreshTokenTtlSeconds: Number(source.OTP_SESSION_REFRESH_TOKEN_TTL_SECONDS ?? DEFAULT_SESSION_CONFIG.refreshTokenTtlSeconds),
    rotateRefreshToken: source.OTP_SESSION_ROTATE_REFRESH_TOKEN !== "0",
  };
}

/**
 * Build the OTP service deps from env + the resolved WhatsApp adapter.
 *
 * The Supabase client is created LAZILY on first use (same pattern as
 * `createSessionServiceDeps`) to avoid crashing app startup in a
 * misconfigured environment.
 */
export function createOtpServiceDeps(
  envStatus: EnvironmentStatus,
  whatsappAdapter: MessageProviderAdapter | null,
): OtpServiceDeps {
  let cachedClient: SupabaseClient | null = null;
  const getSupabase = (): SupabaseClient => {
    if (!cachedClient) {
      cachedClient = createServiceClient(envStatus);
    }
    return cachedClient;
  };
  return {
    get supabase() {
      return getSupabase();
    },
    whatsappAdapter,
    config: resolveOtpConfig(envStatus),
  };
}

/**
 * Build the session service deps from env.
 *
 * `issueAccessToken` is wired to mint a stateless JWT signed with the
 * API_JWT_SECRET using `node:crypto` (HMAC-SHA256, following the pattern
 * in `services/orders/quote-token.ts`). The JWT payload includes `sub`
 * (auth_user_id), `aud='authenticated'`, `role='authenticated'`,
 * `user_type='customer'`, and `iss='telepizza-api'`.
 *
 * The Supabase client is created LAZILY on first use, so a misconfigured
 * environment (e.g. test env) does not crash at app startup.
 */
export function createSessionServiceDeps(
  envStatus: EnvironmentStatus,
): SessionServiceDeps {
  let cachedClient: SupabaseClient | null = null;
  const getSupabase = (): SupabaseClient => {
    if (!cachedClient) {
      cachedClient = createServiceClient(envStatus);
    }
    return cachedClient;
  };
  return {
    get supabase() {
      return getSupabase();
    },
    config: resolveSessionConfig(envStatus),
    async issueAccessToken(authUserId: string, ttlSeconds: number): Promise<string> {
      const jwtSecret = envStatus.config.jwtSecret;
      if (!jwtSecret) {
        throw new Error("API_JWT_SECRET must be set to issue access tokens.");
      }
      const header = { alg: "HS256", typ: "JWT" };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: authUserId,
        aud: "authenticated",
        role: "authenticated",
        user_type: "customer",
        iss: "telepizza-api",
        iat: now,
        exp: now + ttlSeconds,
      };
      const enc = (obj: unknown) =>
        Buffer.from(JSON.stringify(obj))
          .toString("base64url")
          .replace(/=/g, "");
      const data = `${enc(header)}.${enc(payload)}`;
      const sig = createHmac("sha256", jwtSecret).update(data).digest("base64url");
      return `${data}.${sig}`;
    },
  };
}
