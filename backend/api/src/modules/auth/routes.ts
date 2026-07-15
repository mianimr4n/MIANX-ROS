import { Router } from "express";
import { z } from "zod";

import { ApiError, sendNotImplemented, validateBody } from "../../common/http.js";
import {
  createRequireAuth,
  type AuthenticatedRequest,
  type AuthTokenVerifier,
} from "../../middleware/auth.js";
import type { AuthProfileRepository } from "../../services/auth/supabase.js";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export interface AuthRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthProfileRepository;
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

      let data;
      try {
        data = await dependencies.authProfileRepository.getMe(auth.authUserId, auth.email);
      } catch (error) {
        // Prefer 503 over a fake profileReady:false success so clients can retry
        // without treating a infrastructure outage as "profile missing".
        // Never forward raw Supabase/PostgREST messages to the client.
        console.warn("[auth/me] profile load failed:", classifyProfileLoadFailure(error));
        throw new ApiError(
          503,
          "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE",
          "Your profile is temporarily unavailable. Please try again.",
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

  return router;
}
