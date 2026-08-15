/**
 * ADR-017 — Phone-first session service.
 *
 * Issues + rotates refresh tokens after a successful OTP verification.
 * Uses Supabase Auth's JWT infrastructure for the access token and
 * our own auth_refresh_tokens table for the refresh token (with rotation).
 *
 * Authority: ADR-017 (Phone-First Auth & Session Handoff)
 *           ADR-016 (OTP Verification Architecture)
 *           ADR-005 (Canonical Customer Identity)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { generateRefreshToken, hashRefreshToken } from "./otp-hasher.js";

export interface SessionConfig {
  accessTokenTtlSeconds: number; // default: 900 (15 min)
  refreshTokenTtlSeconds: number; // default: 2_592_000 (30 days)
  rotateRefreshToken: boolean; // default: true
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  rotateRefreshToken: true,
};

export interface SessionIssuanceInput {
  otpRequestId: string;
  ip?: string;
  userAgent?: string;
}

export interface SessionIssuanceResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO 8601
  authUserId: string;
  customerId?: string;
}

export interface SessionRefreshResult {
  accessToken: string;
  refreshToken: string; // new rotated token (old one revoked)
  expiresAt: string;
  authUserId: string;
}

export interface SessionServiceDeps {
  supabase: SupabaseClient;
  config: SessionConfig;
  /**
   * Function that mints a Supabase Auth access token for a given user.
   * In Production this calls supabase.auth.admin.generateAccessToken();
   * in tests it can be stubbed.
   */
  issueAccessToken: (authUserId: string, ttlSeconds: number) => Promise<string>;
}

/**
 * Provision a customer after OTP verification (ADR-017 §1).
 *
 * 1. Resolve customer by phone (ADR-005).
 * 2. If not found, create a provisional customer.
 * 3. Look up auth.users by customer.
 * 4. If not found, create an auth.users row with a placeholder email.
 * 5. Update customers.last_login_at.
 *
 * Returns the auth_user_id (and customer_id if available).
 */
export async function provisionCustomerPostOtp(
  supabase: SupabaseClient,
  phoneE164: string,
  otpRequestId: string,
): Promise<{ authUserId: string; customerId?: string }> {
  // 1. Resolve customer by phone.
  let customerId: string | null = null;
  const { data: resolveData, error: resolveError } = await supabase.rpc(
    "resolve_customer_by_identity",
    { p_identity_type: "phone", p_identity_value: phoneE164 },
  );
  if (!resolveError && resolveData) {
    customerId = (resolveData as { customer_id?: string } | null)?.customer_id ?? null;
  }

  // 2. If not found, create a provisional customer.
  if (!customerId) {
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({
        full_name: null,
        phone: phoneE164,
        email: null,
        status: "provisional",
      })
      .select("id")
      .single();

    if (createError || !newCustomer) {
      throw new Error(`Failed to create provisional customer: ${createError?.message}`);
    }
    customerId = newCustomer.id as string;

    // The auto_create_customer_identities trigger (ADR-005) will create
    // the customer_identities row. Mark the phone as verified.
    await supabase.rpc("mark_customer_phone_verified", {
      p_customer_id: customerId,
      p_phone_e164: phoneE164,
      p_otp_request_id: otpRequestId,
    });
  }

  // 3. Look up auth.users for this customer.
  // We use the customers.auth_user_id column if present, else look up by phone.
  const { data: customer } = await supabase
    .from("customers")
    .select("auth_user_id, phone")
    .eq("id", customerId)
    .single();

  let authUserId: string | null = customer?.auth_user_id ?? null;

  // 4. If not found, create a new auth.users row with placeholder email.
  if (!authUserId) {
    const placeholderEmail = `${phoneE164.replace(/[^0-9]/g, "")}@otp.telepizza.local`;
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: placeholderEmail,
      phone: phoneE164,
      email_confirm: true,
      user_metadata: {
        user_type: "customer",
        customer_id: customerId,
        phone_e164: phoneE164,
        placeholder_email: true,
      },
    });

    if (userError || !newUser.user) {
      throw new Error(`Failed to create auth.users row: ${userError?.message}`);
    }
    authUserId = newUser.user.id;

    // Link the auth_user_id back to the customer.
    await supabase.from("customers").update({ auth_user_id: authUserId }).eq("id", customerId);
  }

  // 5. Update last_login_at.
  await supabase
    .from("customers")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", customerId);

  return { authUserId, customerId: customerId ?? undefined };
}

/**
 * Issue a session after OTP verification.
 * Returns the access token + refresh token (plaintext refresh returned ONCE).
 */
export async function issueSession(
  deps: SessionServiceDeps,
  input: SessionIssuanceInput,
): Promise<SessionIssuanceResult> {
  const { supabase, config, issueAccessToken } = deps;

  // Look up the verified OTP request.
  const { data: otpReq, error: otpError } = await supabase
    .from("otp_requests")
    .select("id, phone_e164, status, customer_id, auth_user_id")
    .eq("id", input.otpRequestId)
    .single();

  if (otpError || !otpReq) {
    throw new Error("OTP request not found.");
  }
  if (otpReq.status !== "verified") {
    throw new Error(`OTP request is not verified (status=${otpReq.status}).`);
  }

  // Provision the customer if not already done.
  let authUserId: string | null = otpReq.auth_user_id ?? null;
  let customerId: string | null = otpReq.customer_id ?? null;

  if (!authUserId) {
    const provisioned = await provisionCustomerPostOtp(supabase, otpReq.phone_e164, otpReq.id);
    authUserId = provisioned.authUserId;
    customerId = provisioned.customerId ?? customerId;

    // Update the OTP request with the resolved IDs.
    await supabase
      .from("otp_requests")
      .update({ auth_user_id: authUserId, customer_id: customerId })
      .eq("id", otpReq.id);
  }

  // Issue the access token via Supabase Auth.
  const accessToken = await issueAccessToken(authUserId, config.accessTokenTtlSeconds);

  // Issue the refresh token (plaintext returned to client ONCE; hash stored).
  const plaintextRefresh = generateRefreshToken();
  const refreshHash = hashRefreshToken(plaintextRefresh);
  const refreshExpiresAt = new Date(
    Date.now() + config.refreshTokenTtlSeconds * 1000,
  ).toISOString();

  const { error: insertError } = await supabase.from("auth_refresh_tokens").insert({
    auth_user_id: authUserId,
    token_hash: refreshHash,
    issued_at: new Date().toISOString(),
    expires_at: refreshExpiresAt,
    issued_ip: input.ip ?? null,
    issued_user_agent: input.userAgent ?? null,
  });

  if (insertError) {
    throw new Error(`Failed to persist refresh token: ${insertError.message}`);
  }

  // Emit domain event (ADR-012) via emit_domain_event RPC (best-effort).
  await supabase.rpc("emit_domain_event", {
    p_event_type: "auth.session_issued",
    p_domain: "auth",
    p_entity_id: authUserId,
    p_branch_id: null,
    p_actor_user_id: authUserId,
    p_actor_role: "customer",
    p_metadata: {
      channel: "phone_otp",
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      otp_request_id: otpReq.id,
    },
    p_correlation_id: randomUUID(),
  }).then(({ error }) => {
    if (error) {
      console.warn("[session] emit_domain_event failed:", error.message);
    }
  });

  return {
    accessToken,
    refreshToken: plaintextRefresh,
    expiresAt: new Date(Date.now() + config.accessTokenTtlSeconds * 1000).toISOString(),
    authUserId,
    customerId: customerId ?? undefined,
  };
}

/**
 * Refresh a session. Rotates the refresh token: issues a new one, revokes the old.
 */
export async function refreshSession(
  deps: SessionServiceDeps,
  plaintextRefreshToken: string,
  input: { ip?: string; userAgent?: string },
): Promise<SessionRefreshResult> {
  const { supabase, config, issueAccessToken } = deps;

  const tokenHash = hashRefreshToken(plaintextRefreshToken);

  // Look up the refresh token.
  const { data: token, error: tokenError } = await supabase
    .from("auth_refresh_tokens")
    .select("id, auth_user_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  if (tokenError || !token) {
    throw new SessionError("invalid_refresh_token", "Refresh token not recognized.", 401);
  }

  if (token.revoked_at) {
    throw new SessionError("token_revoked", "Refresh token has been revoked.", 401);
  }

  if (new Date(token.expires_at).getTime() < Date.now()) {
    throw new SessionError("token_expired", "Refresh token has expired.", 401);
  }

  // Rotate: revoke old, issue new.
  if (config.rotateRefreshToken) {
    await supabase.rpc("revoke_refresh_token", {
      p_token_hash: tokenHash,
      p_reason: "rotation",
    });
  }

  // Issue new refresh token.
  const newPlaintext = generateRefreshToken();
  const newHash = hashRefreshToken(newPlaintext);
  const newExpiresAt = new Date(
    Date.now() + config.refreshTokenTtlSeconds * 1000,
  ).toISOString();

  await supabase.from("auth_refresh_tokens").insert({
    auth_user_id: token.auth_user_id,
    token_hash: newHash,
    issued_at: new Date().toISOString(),
    expires_at: newExpiresAt,
    issued_ip: input.ip ?? null,
    issued_user_agent: input.userAgent ?? null,
  });

  // Issue new access token.
  const accessToken = await issueAccessToken(token.auth_user_id, config.accessTokenTtlSeconds);

  // Emit domain event.
  await supabase.rpc("emit_domain_event", {
    p_event_type: "auth.session_refreshed",
    p_domain: "auth",
    p_entity_id: token.auth_user_id,
    p_branch_id: null,
    p_actor_user_id: token.auth_user_id,
    p_actor_role: "customer",
    p_metadata: {
      rotated_from: token.id,
      ip: input.ip ?? null,
    },
    p_correlation_id: randomUUID(),
  }).then(({ error }) => {
    if (error) console.warn("[session] emit_domain_event (refresh) failed:", error.message);
  });

  return {
    accessToken,
    refreshToken: newPlaintext,
    expiresAt: new Date(Date.now() + config.accessTokenTtlSeconds * 1000).toISOString(),
    authUserId: token.auth_user_id,
  };
}

/**
 * Revoke a single refresh token (logout).
 */
export async function revokeSession(
  supabase: SupabaseClient,
  plaintextRefreshToken: string,
  reason: string = "user_logout",
): Promise<{ revoked: boolean; authUserId?: string }> {
  const tokenHash = hashRefreshToken(plaintextRefreshToken);
  const { data, error } = await supabase.rpc("revoke_refresh_token", {
    p_token_hash: tokenHash,
    p_reason: reason,
  });
  if (error) {
    console.warn("[session] revoke_refresh_token failed:", error.message);
    return { revoked: false };
  }
  return { revoked: true, authUserId: (data as string | null) ?? undefined };
}

/**
 * Revoke all refresh tokens for a user (logout-all).
 */
export async function revokeAllSessions(
  supabase: SupabaseClient,
  authUserId: string,
  reason: string = "user_logout",
): Promise<number> {
  const { data, error } = await supabase.rpc("revoke_all_user_refresh_tokens", {
    p_auth_user_id: authUserId,
    p_reason: reason,
  });
  if (error) {
    console.warn("[session] revoke_all_user_refresh_tokens failed:", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

/**
 * List active sessions for a user.
 */
export async function listSessions(supabase: SupabaseClient, authUserId: string) {
  const { data, error } = await supabase
    .from("auth_refresh_tokens")
    .select("id, issued_at, expires_at, issued_ip, issued_user_agent, revoked_at, revoke_reason")
    .eq("auth_user_id", authUserId)
    .order("issued_at", { ascending: false })
    .limit(20);
  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }
  return data ?? [];
}

export class SessionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SessionError";
  }
}
