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

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
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
   * Deprecated for customer auth. Website signs in via Supabase Auth directly.
   * Kept as an explicit stub so clients do not invent a second password stack.
   */
  router.post("/login", validateBody(loginSchema), (_req, res) =>
    sendNotImplemented(res, "Deprecated password login — use Supabase Auth on the client", [
      "auth.login",
    ]),
  );

  router.post("/refresh", validateBody(refreshSchema), (_req, res) =>
    sendNotImplemented(res, "Deprecated token refresh — use Supabase Auth session refresh", [
      "auth.refresh",
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

  return router;
}
