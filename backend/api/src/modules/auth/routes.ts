import { Router } from "express";
import { z } from "zod";

import { ApiError, sendNotImplemented, validateBody } from "../../common/http.js";
import {
  createRequireAuth,
  type AuthenticatedRequest,
  type AuthTokenVerifier,
} from "../../middleware/auth.js";
import { isAccountActive } from "../../services/auth/principal.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { StaffInviteRepository } from "../../services/staff/invites.js";
import type { OtpServiceDeps } from "../../services/otp/otp-service.js";
import type { SessionServiceDeps } from "../../services/otp/session-service.js";
import {
  generateOtp,
  verifyOtp,
  OtpError,
} from "../../services/otp/otp-service.js";
import {
  issueSession,
  refreshSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
  SessionError,
} from "../../services/otp/session-service.js";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const acceptInviteSchema = z.object({
  token: z.string().min(20).max(512),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(150).optional(),
});

const previewInviteSchema = z.object({
  token: z.string().min(20).max(512),
});

/** Only mutable customer profile fields. Privilege fields are stripped/rejected. */
const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(150).optional(),
    phone: z.union([z.string().trim().min(7).max(30), z.null()]).optional(),
  })
  .strict()
  .refine((value) => value.fullName !== undefined || value.phone !== undefined, {
    message: "Provide fullName and/or phone to update.",
  });

export interface AuthRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  /** Phase 3 — OTP service deps (ADR-016). Optional: legacy tests may omit. */
  otpServiceDeps?: OtpServiceDeps;
  /** Phase 3 — Session service deps (ADR-017). Optional: legacy tests may omit. */
  sessionServiceDeps?: SessionServiceDeps;
}

function classifyProfileLoadFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "unknown_profile_load_failure";
  }

  const message = error.message.toLowerCase();
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
    return "profile_load_network_failure";
  }
  if (message.includes("jwt") || message.includes("auth")) {
    return "profile_load_auth_client_failure";
  }
  if (message.includes("pgrst") || message.includes("postgrest") || message.includes("22p02")) {
    return "profile_load_postgrest_failure";
  }
  return "profile_load_failure";
}

export function createAuthRouter(dependencies: AuthRouterDependencies) {
  const router = Router();
  const requireAuth = createRequireAuth(dependencies.authTokenVerifier);

  /**
   * POST /auth/login — staff email/password login (DEPRECATED for customers).
   * Customers MUST use /auth/otp/request → /auth/otp/verify → /auth/phone-login.
   * Staff should use /staff/login (a future alias) or this endpoint with email+password.
   * Kept as an explicit stub so clients do not invent a second password stack.
   */
  router.post("/login", validateBody(loginSchema), (_req, res) =>
    sendNotImplemented(res, "Deprecated password login — use Supabase Auth on the client or /auth/phone-login for customers", [
      "auth.login",
    ]),
  );

  router.get("/me", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;

      // Intentionally ignore x-telepizza-role / branch spoof headers for identity.
      let data;
      try {
        data = await dependencies.authProfileRepository.getMe(auth.authUserId, auth.email);
      } catch (error) {
        console.warn("[auth/me] profile load failed:", classifyProfileLoadFailure(error));
        throw new ApiError(
          503,
          "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE",
          "Your profile is temporarily unavailable. Please try again.",
        );
      }

      if (data.profileReady && data.status && !isAccountActive(data.status)) {
        throw new ApiError(
          403,
          "USER_ACCESS_DISABLED",
          "Access is disabled for this account.",
        );
      }

      return res.json({
        ok: true,
        data: {
          authUserId: data.authUserId,
          email: data.email,
          profile: data.profile
            ? {
                id: data.profile.id,
                fullName: data.profile.fullName,
                phone: data.profile.phone,
              }
            : null,
          roles: data.roles,
          permissions: data.permissions,
          branchIds: data.branchIds,
          organizationIds: data.organizationIds ?? [],
          ownedOrganizationIds: data.ownedOrganizationIds ?? [],
          isPlatformSuperAdmin: data.isPlatformSuperAdmin ?? data.isSuperAdmin,
          isSuperAdmin: data.isSuperAdmin,
        },
        meta: {
          profileReady: data.profileReady,
          // Client role headers are never trusted for identity.
          deprecatedRoleHeaderIgnored: true,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Customer self-service profile update.
   * Bearer-derived identity only — body userId/role/status/branch are rejected by .strict().
   */
  router.patch("/me/profile", requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const body = req.body as z.infer<typeof updateProfileSchema>;

      const updateOwnProfile = dependencies.authProfileRepository.updateOwnProfile;
      if (!updateOwnProfile) {
        throw new ApiError(501, "NOT_IMPLEMENTED", "Profile updates are not available.");
      }

      const profile = await updateOwnProfile.call(
        dependencies.authProfileRepository,
        auth.authUserId,
        auth.email,
        {
          fullName: body.fullName,
          phone: body.phone,
        },
      );

      return res.json({
        ok: true,
        data: {
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          email: auth.email,
        },
        meta: {
          phoneVerified: false,
          phoneNote: "Phone added — verification will be enabled with WhatsApp OTP.",
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Safe invite preview for accept UI — token only; never returns hash/url secrets.
   * Role/branch come from the stored invite row.
   */
  router.get("/staff/invites/preview", async (req, res, next) => {
    try {
      const parsed = previewInviteSchema.safeParse({
        token: typeof req.query.token === "string" ? req.query.token : "",
      });
      if (!parsed.success) {
        throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
      }

      const preview = await dependencies.staffInviteRepository.previewInvite(parsed.data.token);
      return res.json({
        ok: true,
        data: {
          email: preview.email,
          fullName: preview.fullName,
          roleCode: preview.roleCode,
          organizationId: preview.organizationId,
          branchIds: preview.branchIds,
          branchNames: preview.branchNames,
          branchId: preview.branchId,
          branchName: preview.branchName,
          status: preview.status,
          expiresAt: preview.expiresAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Staff invite acceptance — authenticated by invite token only (not JWT privilege).
   * Role/branch come solely from the invite row; body overrides are ignored by the repository.
   */
  router.post("/staff/invites/accept", validateBody(acceptInviteSchema), async (req, res, next) => {
    try {
      const result = await dependencies.staffInviteRepository.acceptInvite(
        {
          token: req.body.token,
          password: req.body.password,
          fullName: req.body.fullName,
        },
        {
          ip: typeof req.ip === "string" ? req.ip : null,
          userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
        },
      );

      return res.status(201).json({
        ok: true,
        data: {
          authUserId: result.authUserId,
          email: result.email,
          profileReady: result.profileReady,
        },
        meta: {
          next: "sign_in_with_email_password",
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  // ==========================================================================
  // Phase 3 — Phone-First Auth (ADR-016 + ADR-017)
  // ==========================================================================

  const otpRequestSchema = z.object({
    phone: z.string().trim().min(7).max(30),
    channel: z.enum(["whatsapp", "sms", "email"]).optional(),
    purpose: z
      .enum(["customer_login", "customer_register", "phone_reverify", "recovery"])
      .optional(),
  });

  const otpVerifySchema = z.object({
    otpRequestId: z.string().uuid(),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits."),
  });

  const phoneLoginSchema = z.object({
    otpRequestId: z.string().uuid(),
  });

  const phoneRefreshSchema = z.object({
    refreshToken: z.string().min(10),
  });

  /**
   * POST /auth/otp/request — issue a new OTP (ADR-016).
   * Returns { otpRequestId, channel, expiresAt }. NEVER returns the plaintext OTP.
   */
  router.post("/otp/request", validateBody(otpRequestSchema), async (req, res, next) => {
    if (!dependencies.otpServiceDeps) {
      return sendNotImplemented(res, "OTP service not configured", ["auth.otp.request"]);
    }
    try {
      const result = await generateOtp(dependencies.otpServiceDeps, {
        phone: req.body.phone,
        channel: req.body.channel,
        purpose: req.body.purpose,
        ip: typeof req.ip === "string" ? req.ip : undefined,
        userAgent:
          typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      });
      return res.status(201).json({
        ok: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof OtpError) {
        const headers: Record<string, string> = {};
        if (error.retryAfterSeconds) {
          headers["Retry-After"] = String(error.retryAfterSeconds);
        }
        return res
          .status(error.statusCode)
          .set(headers)
          .json({
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
            },
          });
      }
      return next(error);
    }
  });

  /**
   * POST /auth/otp/verify — verify a submitted OTP (ADR-016).
   * Returns { verified, status, customerId?, remainingAttempts?, failureReason? }.
   * Does NOT issue a session — call /auth/phone-login next.
   */
  router.post("/otp/verify", validateBody(otpVerifySchema), async (req, res, next) => {
    if (!dependencies.otpServiceDeps) {
      return sendNotImplemented(res, "OTP service not configured", ["auth.otp.verify"]);
    }
    try {
      const result = await verifyOtp(dependencies.otpServiceDeps, {
        otpRequestId: req.body.otpRequestId,
        otp: req.body.otp,
        ip: typeof req.ip === "string" ? req.ip : undefined,
        userAgent:
          typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      });
      return res.status(result.verified ? 200 : 401).json({
        ok: result.verified,
        data: result,
      });
    } catch (error) {
      if (error instanceof OtpError) {
        const headers: Record<string, string> = {};
        if (error.retryAfterSeconds) {
          headers["Retry-After"] = String(error.retryAfterSeconds);
        }
        return res
          .status(error.statusCode)
          .set(headers)
          .json({
            ok: false,
            error: { code: error.code, message: error.message },
          });
      }
      return next(error);
    }
  });

  /**
   * POST /auth/phone-login — exchange a verified OTP for session tokens (ADR-017).
   * Returns { accessToken, refreshToken, expiresAt }.
   */
  router.post("/phone-login", validateBody(phoneLoginSchema), async (req, res, next) => {
    if (!dependencies.sessionServiceDeps) {
      return sendNotImplemented(res, "Session service not configured", ["auth.phone_login"]);
    }
    try {
      const result = await issueSession(dependencies.sessionServiceDeps, {
        otpRequestId: req.body.otpRequestId,
        ip: typeof req.ip === "string" ? req.ip : undefined,
        userAgent:
          typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      });
      return res.status(200).json({
        ok: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          authUserId: result.authUserId,
          ...(result.customerId ? { customerId: result.customerId } : {}),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST /auth/refresh — exchange a refresh token for a new access token (ADR-017).
   * Rotates the refresh token (revokes old, issues new).
   */
  router.post("/refresh", validateBody(phoneRefreshSchema), async (req, res, next) => {
    if (!dependencies.sessionServiceDeps) {
      return sendNotImplemented(res, "Session service not configured", ["auth.refresh"]);
    }
    try {
      const result = await refreshSession(
        dependencies.sessionServiceDeps,
        req.body.refreshToken,
        {
          ip: typeof req.ip === "string" ? req.ip : undefined,
          userAgent:
            typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
        },
      );
      return res.status(200).json({
        ok: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof SessionError) {
        return res.status(error.statusCode).json({
          ok: false,
          error: { code: error.code, message: error.message },
        });
      }
      return next(error);
    }
  });

  /**
   * POST /auth/logout — revoke the current refresh token (ADR-017).
   * Requires auth (so we can identify the user) + a refresh token in the body.
   */
  router.post("/logout", requireAuth, validateBody(phoneRefreshSchema), async (req, res, next) => {
    if (!dependencies.sessionServiceDeps) {
      return sendNotImplemented(res, "Session service not configured", ["auth.logout"]);
    }
    try {
      const result = await revokeSession(
        dependencies.sessionServiceDeps.supabase,
        req.body.refreshToken,
        "user_logout",
      );
      return res.status(200).json({ ok: true, data: { revoked: result.revoked } });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST /auth/logout-all — revoke ALL refresh tokens for the current user (ADR-017).
   */
  router.post("/logout-all", requireAuth, async (req, res, next) => {
    if (!dependencies.sessionServiceDeps) {
      return sendNotImplemented(res, "Session service not configured", ["auth.logout_all"]);
    }
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const count = await revokeAllSessions(
        dependencies.sessionServiceDeps.supabase,
        auth.authUserId,
        "user_logout",
      );
      return res.status(200).json({ ok: true, data: { revokedCount: count } });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * GET /auth/sessions — list active sessions for the current user (ADR-017).
   */
  router.get("/sessions", requireAuth, async (req, res, next) => {
    if (!dependencies.sessionServiceDeps) {
      return sendNotImplemented(res, "Session service not configured", ["auth.sessions"]);
    }
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const sessions = await listSessions(
        dependencies.sessionServiceDeps.supabase,
        auth.authUserId,
      );
      return res.status(200).json({ ok: true, data: sessions });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
