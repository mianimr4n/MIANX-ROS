/**
 * Tests for OTP service + session service (ADR-016 + ADR-017).
 *
 * Verifies:
 *   - OTP hashing: HMAC-SHA256 + constant-time compare
 *   - OTP generation: 6-digit, zero-padded, cryptographically secure
 *   - Refresh token hashing: SHA-256
 *   - Refresh token generation: 48 bytes base64url
 *   - OtpError + SessionError classes carry statusCode + retryAfter
 *
 * Uses pure unit tests (no DB) for the hashing utilities, and mocked
 * Supabase for the service-level flows.
 *
 * Authority: ADR-016 (OTP Verification Architecture)
 *           ADR-017 (Phone-First Auth & Session Handoff)
 */

import { vi, describe, it, expect } from "vitest";
import { createHmac, createHash } from "node:crypto";

import {
  hashOtp,
  constantTimeHashCompare,
  generateSixDigitOtp,
  hashRefreshToken,
  generateRefreshToken,
} from "../src/services/otp/otp-hasher.js";
import { OtpError } from "../src/services/otp/otp-service.js";
import { SessionError } from "../src/services/otp/session-service.js";
import {
  DEFAULT_OTP_CONFIG,
  generateOtp,
  verifyOtp,
} from "../src/services/otp/otp-service.js";
import {
  issueSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
} from "../src/services/otp/session-service.js";
import type { OtpServiceDeps } from "../src/services/otp/otp-service.js";
import type { SessionServiceDeps } from "../src/services/otp/session-service.js";

const TEST_SECRET = "test-otp-hmac-secret-32-bytes-long!!";

// ---------------------------------------------------------------------------
// 1. Hashing utilities — pure functions, no mocks.
// ---------------------------------------------------------------------------

describe("ADR-016 §5 — OTP hashing utilities", () => {
  it("hashOtp produces a stable 64-char hex HMAC-SHA256", () => {
    const hash1 = hashOtp("123456", TEST_SECRET);
    const hash2 = hashOtp("123456", TEST_SECRET);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // Matches a manual computation.
    const expected = createHmac("sha256", TEST_SECRET).update("123456", "utf8").digest("hex");
    expect(hash1).toBe(expected);
  });

  it("hashOtp with different secrets produces different hashes", () => {
    const h1 = hashOtp("123456", "secret-one-32-bytes-long-padd!!!");
    const h2 = hashOtp("123456", "secret-two-32-bytes-long-padd!!!");
    expect(h1).not.toBe(h2);
  });

  it("hashOtp throws if secret is too short (<16 chars)", () => {
    expect(() => hashOtp("123456", "short")).toThrow(/OTP_HMAC_SECRET/);
    expect(() => hashOtp("123456", "")).toThrow(/OTP_HMAC_SECRET/);
  });

  it("constantTimeHashCompare returns true for matching hashes", () => {
    const h = hashOtp("999999", TEST_SECRET);
    expect(constantTimeHashCompare(h, h)).toBe(true);
  });

  it("constantTimeHashCompare returns false for non-matching hashes", () => {
    const h1 = hashOtp("111111", TEST_SECRET);
    const h2 = hashOtp("222222", TEST_SECRET);
    expect(constantTimeHashCompare(h1, h2)).toBe(false);
  });

  it("constantTimeHashCompare returns false for different-length inputs", () => {
    expect(constantTimeHashCompare("abc", "abcd")).toBe(false);
  });

  it("constantTimeHashCompare returns false for non-hex input (no exception)", () => {
    expect(constantTimeHashCompare("not-hex-but-64-chars-yes-this-is-64-chars-ok!!", hashOtp("123456", TEST_SECRET))).toBe(false);
  });

  it("generateSixDigitOtp returns a 6-char zero-padded numeric string", () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateSixDigitOtp();
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
      const n = Number(otp);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1_000_000);
    }
  });

  it("generateSixDigitOtp produces varied values (no obvious repeats)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateSixDigitOtp());
    }
    // With 1M possible values and 1000 draws, we expect >900 unique.
    expect(set.size).toBeGreaterThan(900);
  });
});

describe("ADR-017 §2 — Refresh token utilities", () => {
  it("hashRefreshToken produces a stable 64-char SHA-256 hex", () => {
    const plaintext = "test-refresh-token-12345";
    const h1 = hashRefreshToken(plaintext);
    const h2 = hashRefreshToken(plaintext);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);

    const expected = createHash("sha256").update(plaintext, "utf8").digest("hex");
    expect(h1).toBe(expected);
  });

  it("hashRefreshToken with different inputs produces different hashes", () => {
    expect(hashRefreshToken("a")).not.toBe(hashRefreshToken("b"));
  });

  it("generateRefreshToken returns a base64url string of ~64 chars", () => {
    for (let i = 0; i < 10; i++) {
      const t = generateRefreshToken();
      expect(t.length).toBeGreaterThanOrEqual(60);
      expect(t.length).toBeLessThanOrEqual(70);
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("generateRefreshToken produces varied values", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateRefreshToken());
    }
    expect(set.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 2. Error classes.
// ---------------------------------------------------------------------------

describe("ADR-016 / ADR-017 — Error classes", () => {
  it("OtpError carries code, statusCode, retryAfterSeconds", () => {
    const err = new OtpError("rate_limited", "Too many", 429, 600);
    expect(err.code).toBe("rate_limited");
    expect(err.statusCode).toBe(429);
    expect(err.retryAfterSeconds).toBe(600);
    expect(err.message).toBe("Too many");
    expect(err.name).toBe("OtpError");
    expect(err instanceof Error).toBe(true);
  });

  it("OtpError retryAfterSeconds is optional", () => {
    const err = new OtpError("not_found", "No OTP", 404);
    expect(err.retryAfterSeconds).toBeUndefined();
  });

  it("SessionError carries code + statusCode", () => {
    const err = new SessionError("token_expired", "Expired", 401);
    expect(err.code).toBe("token_expired");
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("SessionError");
  });
});

// ---------------------------------------------------------------------------
// 3. Mocked Supabase client for service-level tests.
// ---------------------------------------------------------------------------

function makeMockSupabase(overrides: {
  rpc?: Record<string, (args: unknown) => Promise<unknown>>;
  fromSelectSingle?: Record<string, (query: unknown) => Promise<{ data: unknown; error: unknown }>>;
  fromInsert?: Record<string, (payload: unknown) => Promise<{ data: unknown; error: unknown }>>;
  fromUpdate?: Record<string, (payload: unknown, filter: unknown) => Promise<{ data: unknown; error: unknown }>>;
} = {}) {
  const rpc = overrides.rpc ?? {};
  const fromSelectSingle = overrides.fromSelectSingle ?? {};
  const fromInsert = overrides.fromInsert ?? {};
  const fromUpdate = overrides.fromUpdate ?? {};

  const chainable = (table: string) => {
    const obj: Record<string, unknown> = {
      select: () => obj,
      eq: (_col: string, _val: unknown) => obj,
      gte: (_col: string, _val: unknown) => obj,
      ilike: (_col: string, _val: string) => obj,
      order: () => obj,
      limit: () => obj,
      range: () => obj,
      single: async () => {
        if (fromSelectSingle[table]) {
          return fromSelectSingle[table](obj);
        }
        return { data: null, error: null };
      },
      insert: (payload: unknown) => {
        // Returns a chainable that supports .select().single()
        const insertChain: Record<string, unknown> = {
          select: () => insertChain,
          single: async () => {
            if (fromInsert[table]) {
              return fromInsert[table](payload);
            }
            return { data: { id: `${table}-mock-id` }, error: null };
          },
        };
        return insertChain;
      },
      update: (payload: unknown) => ({
        eq: (_col: string, _val: unknown) => ({
          // Allow chaining another .eq() (for optimistic concurrency: .eq("id").eq("status"))
          eq: (_col2: string, _val2: unknown) => {
            if (fromUpdate[table]) {
              return fromUpdate[table](payload, _val);
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    };
    return obj;
  };

  return {
    rpc: vi.fn(async (name: string, args: unknown) => {
      if (rpc[name]) {
        return rpc[name](args);
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => chainable(table)),
  };
}

describe("ADR-016 §5 — generateOtp service flow", () => {
  const baseConfig = {
    ...DEFAULT_OTP_CONFIG,
    hmacSecret: TEST_SECRET,
  };

  it("rejects when OTP_HMAC_SECRET is missing", async () => {
    const supabase = makeMockSupabase();
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: { ...baseConfig, hmacSecret: "" },
    };
    await expect(
      generateOtp(deps, { phone: "+923001234567" }),
    ).rejects.toThrow(/OTP_HMAC_SECRET/);
  });

  it("rejects when phone cannot be normalized (normalize returns null)", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        normalize_phone_e164: async () => ({ data: null, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    await expect(generateOtp(deps, { phone: "garbage" })).rejects.toMatchObject({
      code: "invalid_phone",
      statusCode: 400,
    });
  });

  it("rejects the D11 ordering number with 422", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        normalize_phone_e164: async () => ({ data: "+923041110495", error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    await expect(generateOtp(deps, { phone: "0304-1110495" })).rejects.toMatchObject({
      code: "ordering_number_blocked",
      statusCode: 422,
    });
  });

  it("rejects when per-phone rate limit exceeded", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        normalize_phone_e164: async () => ({ data: "+923001234567", error: null }),
        count_otp_requests_by_phone: async () => ({
          data: { count_10min: 5, count_1hour: 5, count_1day: 5 },
          error: null,
        }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    await expect(generateOtp(deps, { phone: "+923001234567" })).rejects.toMatchObject({
      code: "rate_limit_exceeded_phone_10min",
      statusCode: 429,
    });
  });

  it("issues an OTP successfully and returns { otpRequestId, channel, expiresAt }", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        normalize_phone_e164: async () => ({ data: "+923001234567", error: null }),
        count_otp_requests_by_phone: async () => ({
          data: { count_10min: 0, count_1hour: 0, count_1day: 0 },
          error: null,
        }),
        rotate_previous_pending_otps: async () => ({ data: 0, error: null }),
        resolve_customer_by_identity: async () => ({ data: null, error: null }),
      },
      fromInsert: {
        otp_requests: async () => ({
          data: { id: "otp-req-123" },
          error: null,
        }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null, // sms channel fallback
      config: baseConfig,
    };
    const result = await generateOtp(deps, { phone: "+923001234567" });
    expect(result.otpRequestId).toBe("otp-req-123");
    expect(result.channel).toBe("sms"); // no WhatsApp adapter → sms fallback
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses whatsapp channel when adapter is available", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        normalize_phone_e164: async () => ({ data: "+923001234567", error: null }),
        count_otp_requests_by_phone: async () => ({
          data: { count_10min: 0, count_1hour: 0, count_1day: 0 },
          error: null,
        }),
        rotate_previous_pending_otps: async () => ({ data: 0, error: null }),
        resolve_customer_by_identity: async () => ({ data: null, error: null }),
      },
      fromInsert: {
        otp_requests: async () => ({ data: { id: "otp-req-456" }, error: null }),
      },
    });
    const mockAdapter = {
      sendMessage: vi.fn(async () => ({ providerMessageId: "wamid-mock", status: "sent" })),
      verifyWebhookSignature: vi.fn(),
      normalizeWebhookEvent: vi.fn(),
    };
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: mockAdapter as never,
      config: baseConfig,
    };
    const result = await generateOtp(deps, { phone: "+923001234567" });
    expect(result.channel).toBe("whatsapp");
    expect(mockAdapter.sendMessage).toHaveBeenCalledOnce();
  });
});

describe("ADR-016 §5 — verifyOtp service flow", () => {
  const baseConfig = {
    ...DEFAULT_OTP_CONFIG,
    hmacSecret: TEST_SECRET,
  };

  it("returns 404 when OTP request not found", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({ data: null, error: { message: "not found" } }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    await expect(
      verifyOtp(deps, { otpRequestId: "nonexistent", otp: "123456" }),
    ).rejects.toMatchObject({ code: "not_found", statusCode: 404 });
  });

  it("returns verified=false with current status when OTP is already verified", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "verified",
            otp_hash: hashOtp("123456", TEST_SECRET),
            attempt_count: 0,
            expires_at: new Date(Date.now() + 60000).toISOString(),
            phone_e164: "+923001234567",
            customer_id: null,
          },
          error: null,
        }),
      },
      rpc: {
        expire_stale_otp_requests: async () => ({ data: 0, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    const result = await verifyOtp(deps, { otpRequestId: "otp-1", otp: "123456" });
    expect(result.verified).toBe(false);
    expect(result.status).toBe("verified");
  });

  it("returns verified=false with status=expired when expires_at is past", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "pending",
            otp_hash: hashOtp("123456", TEST_SECRET),
            attempt_count: 0,
            expires_at: new Date(Date.now() - 60000).toISOString(), // expired
            phone_e164: "+923001234567",
            customer_id: null,
          },
          error: null,
        }),
      },
      rpc: {
        expire_stale_otp_requests: async () => ({ data: 0, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    const result = await verifyOtp(deps, { otpRequestId: "otp-1", otp: "123456" });
    expect(result.verified).toBe(false);
    expect(result.status).toBe("expired");
  });

  it("returns verified=true when OTP hash matches (happy path)", async () => {
    const correctOtp = "654321";
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "pending",
            otp_hash: hashOtp(correctOtp, TEST_SECRET),
            attempt_count: 0,
            expires_at: new Date(Date.now() + 60000).toISOString(),
            phone_e164: "+923001234567",
            customer_id: "cust-1",
          },
          error: null,
        }),
      },
      rpc: {
        expire_stale_otp_requests: async () => ({ data: 0, error: null }),
        mark_customer_phone_verified: async () => ({ data: "verif-1", error: null }),
      },
      fromUpdate: {
        otp_requests: async () => ({ data: null, error: null }),
      },
      fromInsert: {
        otp_attempts: async () => ({ data: { id: "att-1" }, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    const result = await verifyOtp(deps, { otpRequestId: "otp-1", otp: correctOtp });
    expect(result.verified).toBe(true);
    expect(result.status).toBe("verified");
    expect(result.customerId).toBe("cust-1");
  });

  it("returns verified=false + remainingAttempts when OTP is wrong", async () => {
    const correctOtp = "654321";
    const wrongOtp = "000000";
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "pending",
            otp_hash: hashOtp(correctOtp, TEST_SECRET),
            attempt_count: 2,
            expires_at: new Date(Date.now() + 60000).toISOString(),
            phone_e164: "+923001234567",
            customer_id: null,
          },
          error: null,
        }),
      },
      rpc: {
        expire_stale_otp_requests: async () => ({ data: 0, error: null }),
      },
      fromUpdate: {
        otp_requests: async () => ({ data: null, error: null }),
      },
      fromInsert: {
        otp_attempts: async () => ({ data: { id: "att-2" }, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    const result = await verifyOtp(deps, { otpRequestId: "otp-1", otp: wrongOtp });
    expect(result.verified).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.remainingAttempts).toBe(2); // 5 - (2+1)
    expect(result.failureReason).toBe("wrong_otp");
  });

  it("fails permanently when attempt_count reaches max (5)", async () => {
    const correctOtp = "654321";
    const wrongOtp = "000000";
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "pending",
            otp_hash: hashOtp(correctOtp, TEST_SECRET),
            attempt_count: 4, // 4 + 1 = 5 = MAX
            expires_at: new Date(Date.now() + 60000).toISOString(),
            phone_e164: "+923001234567",
            customer_id: null,
          },
          error: null,
        }),
      },
      rpc: {
        expire_stale_otp_requests: async () => ({ data: 0, error: null }),
      },
      fromUpdate: {
        otp_requests: async () => ({ data: null, error: null }),
      },
      fromInsert: {
        otp_attempts: async () => ({ data: { id: "att-3" }, error: null }),
      },
    });
    const deps: OtpServiceDeps = {
      supabase: supabase as never,
      whatsappAdapter: null,
      config: baseConfig,
    };
    const result = await verifyOtp(deps, { otpRequestId: "otp-1", otp: wrongOtp });
    expect(result.verified).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.remainingAttempts).toBe(0);
    expect(result.failureReason).toBe("max_attempts_exceeded");
  });
});

// ---------------------------------------------------------------------------
// 4. Session service tests (issueSession, refreshSession, revokeSession).
// ---------------------------------------------------------------------------

describe("ADR-017 — Session service flows", () => {
  const sessionConfig = {
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 2_592_000,
    rotateRefreshToken: true,
  };

  function makeSessionDeps(supabase: unknown): SessionServiceDeps {
    return {
      supabase: supabase as never,
      config: sessionConfig,
      async issueAccessToken(authUserId: string, ttl: number): Promise<string> {
        // Test stub: return a deterministic token.
        return `test-access-token.${authUserId}.${ttl}`;
      },
    };
  }

  it("issueSession fails when OTP request not found", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({ data: null, error: { message: "not found" } }),
      },
    });
    await expect(
      issueSession(makeSessionDeps(supabase), { otpRequestId: "missing" }),
    ).rejects.toThrow(/OTP request not found/);
  });

  it("issueSession fails when OTP is not verified", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "pending",
            phone_e164: "+923001234567",
            customer_id: null,
            auth_user_id: null,
          },
          error: null,
        }),
      },
    });
    await expect(
      issueSession(makeSessionDeps(supabase), { otpRequestId: "otp-1" }),
    ).rejects.toThrow(/OTP request is not verified/);
  });

  it("issueSession issues access + refresh tokens when OTP is verified", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        otp_requests: async () => ({
          data: {
            id: "otp-1",
            status: "verified",
            phone_e164: "+923001234567",
            customer_id: "cust-1",
            auth_user_id: "auth-user-1",
          },
          error: null,
        }),
      },
      fromInsert: {
        auth_refresh_tokens: async () => ({ data: { id: "rt-1" }, error: null }),
      },
      fromUpdate: {
        otp_requests: async () => ({ data: null, error: null }),
      },
      rpc: {
        emit_domain_event: async () => ({ data: null, error: null }),
      },
    });
    const result = await issueSession(makeSessionDeps(supabase), { otpRequestId: "otp-1" });
    expect(result.accessToken).toBe("test-access-token.auth-user-1.900");
    expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.authUserId).toBe("auth-user-1");
    expect(result.customerId).toBe("cust-1");
  });

  it("refreshSession fails with 401 when refresh token not recognized", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        auth_refresh_tokens: async () => ({ data: null, error: { message: "not found" } }),
      },
    });
    await expect(
      refreshSession(makeSessionDeps(supabase), "bad-token", {}),
    ).rejects.toMatchObject({ code: "invalid_refresh_token", statusCode: 401 });
  });

  it("refreshSession fails with 401 when token already revoked", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        auth_refresh_tokens: async () => ({
          data: {
            id: "rt-1",
            auth_user_id: "auth-user-1",
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            revoked_at: new Date().toISOString(),
          },
          error: null,
        }),
      },
    });
    await expect(
      refreshSession(makeSessionDeps(supabase), "any-token", {}),
    ).rejects.toMatchObject({ code: "token_revoked", statusCode: 401 });
  });

  it("refreshSession fails with 401 when token expired", async () => {
    const supabase = makeMockSupabase({
      fromSelectSingle: {
        auth_refresh_tokens: async () => ({
          data: {
            id: "rt-1",
            auth_user_id: "auth-user-1",
            expires_at: new Date(Date.now() - 86400000).toISOString(),
            revoked_at: null,
          },
          error: null,
        }),
      },
    });
    await expect(
      refreshSession(makeSessionDeps(supabase), "any-token", {}),
    ).rejects.toMatchObject({ code: "token_expired", statusCode: 401 });
  });

  it("revokeSession returns revoked=true when revoke_refresh_token RPC succeeds", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        revoke_refresh_token: async () => ({ data: "auth-user-1", error: null }),
      },
    });
    const result = await revokeSession(supabase as never, "any-token", "user_logout");
    expect(result.revoked).toBe(true);
    expect(result.authUserId).toBe("auth-user-1");
  });

  it("revokeSession returns revoked=false when RPC fails", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        revoke_refresh_token: async () => ({ data: null, error: { message: "boom" } }),
      },
    });
    const result = await revokeSession(supabase as never, "any-token", "user_logout");
    expect(result.revoked).toBe(false);
  });

  it("revokeAllSessions returns count from revoke_all_user_refresh_tokens RPC", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        revoke_all_user_refresh_tokens: async () => ({ data: 3, error: null }),
      },
    });
    const count = await revokeAllSessions(supabase as never, "auth-user-1", "user_logout");
    expect(count).toBe(3);
  });

  it("revokeAllSessions returns 0 when RPC fails", async () => {
    const supabase = makeMockSupabase({
      rpc: {
        revoke_all_user_refresh_tokens: async () => ({ data: null, error: { message: "boom" } }),
      },
    });
    const count = await revokeAllSessions(supabase as never, "auth-user-1", "user_logout");
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. DEFAULT_OTP_CONFIG sanity.
// ---------------------------------------------------------------------------

describe("ADR-016 — DEFAULT_OTP_CONFIG sanity", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_OTP_CONFIG.ttlSeconds).toBe(5 * 60);
    expect(DEFAULT_OTP_CONFIG.maxAttempts).toBe(5);
    expect(DEFAULT_OTP_CONFIG.rateLimits.phonePer10Min).toBe(3);
    expect(DEFAULT_OTP_CONFIG.rateLimits.phonePerHour).toBe(5);
    expect(DEFAULT_OTP_CONFIG.rateLimits.phonePerDay).toBe(10);
    expect(DEFAULT_OTP_CONFIG.rateLimits.verifyPerIpPerMin).toBe(10);
  });

  it("hmacSecret defaults to empty string (must be overridden at runtime)", () => {
    expect(DEFAULT_OTP_CONFIG.hmacSecret).toBe("");
  });
});
