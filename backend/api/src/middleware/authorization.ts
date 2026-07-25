import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../common/http.js";
import type { AuthPrincipalRepository } from "../services/auth/supabase.js";
import { isAccountActive, type AuthPrincipal } from "../services/auth/principal.js";
import {
  createRequireAuth,
  type AuthenticatedRequest,
  type AuthTokenVerifier,
} from "./auth.js";

export type AuthorizedRequest = AuthenticatedRequest & {
  principal?: AuthPrincipal;
};

export type BranchIdResolver = (
  req: Request,
) => string | null | undefined | Promise<string | null | undefined>;

function classifyPrincipalLoadFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return "unknown_principal_load_failure";
  }

  const message = error.message.toLowerCase();
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
    return "principal_load_network_failure";
  }
  if (message.includes("jwt") || message.includes("auth")) {
    return "principal_load_auth_client_failure";
  }
  if (message.includes("pgrst") || message.includes("postgrest") || message.includes("22p02")) {
    return "principal_load_postgrest_failure";
  }
  return "principal_load_failure";
}

function getPrincipal(req: Request): AuthPrincipal | undefined {
  return (req as AuthorizedRequest).principal;
}

function throwAccessDisabled(): never {
  throw new ApiError(
    403,
    "USER_ACCESS_DISABLED",
    "Access is disabled for this account.",
  );
}

function throwPrincipalUnavailable(): never {
  throw new ApiError(
    503,
    "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE",
    "Your profile is temporarily unavailable. Please try again.",
  );
}

async function loadAndAttachPrincipal(
  req: Request,
  repository: AuthPrincipalRepository,
): Promise<AuthPrincipal> {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }

  let principal: AuthPrincipal | null;
  try {
    principal = await repository.resolvePrincipal(auth.authUserId, auth.email);
  } catch (error) {
    console.warn("[authz] principal load failed:", classifyPrincipalLoadFailure(error));
    throwPrincipalUnavailable();
  }

  if (!principal || !isAccountActive(principal.status)) {
    throwAccessDisabled();
  }

  (req as AuthorizedRequest).principal = principal;
  return principal;
}

/**
 * JWT verification + DB-backed principal + active-status gate.
 * Never trusts x-telepizza-role, branch headers, JWT metadata, or body claims.
 */
export function createRequireAuthenticatedUser(
  verifier: AuthTokenVerifier,
  repository: AuthPrincipalRepository,
) {
  const requireAuth = createRequireAuth(verifier);

  return async (req: Request, res: Response, next: NextFunction) => {
    return requireAuth(req, res, async (authError?: unknown) => {
      if (authError) {
        return next(authError);
      }

      try {
        await loadAndAttachPrincipal(req, repository);
        return next();
      } catch (error) {
        return next(error);
      }
    });
  };
}

export function requirePermission(permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const principal = getPrincipal(req);
      if (!principal) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      if (principal.isSuperAdmin || principal.permissions.includes(permissionCode)) {
        return next();
      }

      throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    } catch (error) {
      return next(error);
    }
  };
}

export function requireAnyPermission(permissionCodes: string[]) {
  const required = [...new Set(permissionCodes.filter(Boolean))];

  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const principal = getPrincipal(req);
      if (!principal) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      if (
        principal.isSuperAdmin ||
        required.some((code) => principal.permissions.includes(code))
      ) {
        return next();
      }

      throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * @deprecated NON-CANONICAL — do not mount on production routes.
 *
 * Retained only for unit tests and experimental defense-in-depth experiments.
 * Canonical branch isolation lives in the service layer
 * (`assertBranchInScope` / `resolveScopedBranchIds` and domain equivalents).
 * Those services must remain secure when called outside a normal HTTP route.
 *
 * Presence of this helper is NOT evidence that routes are gated.
 */
export function requireBranchAccess(resolveBranchId: BranchIdResolver) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const principal = getPrincipal(req);
      if (!principal) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      if (principal.isSuperAdmin) {
        return next();
      }

      const branchId = await resolveBranchId(req);
      if (!branchId) {
        throw new ApiError(403, "FORBIDDEN", "Branch scope is required.");
      }

      if (!principal.branchIds.includes(branchId)) {
        throw new ApiError(403, "FORBIDDEN", "Branch access denied.");
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const principal = getPrincipal(req);
    if (!principal) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (!principal.isSuperAdmin) {
      throw new ApiError(403, "FORBIDDEN", "Super-admin access is required.");
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

export function createAuthorizationHelpers(
  verifier: AuthTokenVerifier,
  repository: AuthPrincipalRepository,
) {
  return {
    requireAuthenticatedUser: createRequireAuthenticatedUser(verifier, repository),
    requirePermission,
    requireAnyPermission,
    requireBranchAccess,
    requireSuperAdmin,
  };
}
