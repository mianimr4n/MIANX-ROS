import type { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";

import { ApiError } from "../common/http.js";

export interface AuthenticatedRequestAuth {
  authUserId: string;
  email: string | null;
  accessToken: string;
  supabaseUser: User;
}

export type AuthenticatedRequest = Request & {
  auth?: AuthenticatedRequestAuth;
};

export interface AuthTokenVerifier {
  getUser(accessToken: string): Promise<{ user: User | null; errorMessage?: string }>;
}

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * Bearer JWT verification only (Supabase Auth getUser).
 * Does not authorize roles/permissions — use authorization middleware for that.
 * Never trusts x-telepizza-role, branch headers, body, query, JWT metadata, or frontend state.
 */
export function createRequireAuth(verifier: AuthTokenVerifier) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req.header("authorization") ?? undefined);

      if (!token) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      // Intentionally ignore x-telepizza-role and any client-supplied role/branch claims.
      const result = await verifier.getUser(token);

      if (!result.user) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      (req as AuthenticatedRequest).auth = {
        authUserId: result.user.id,
        email: result.user.email ?? null,
        accessToken: token,
        supabaseUser: result.user,
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Optional Bearer attach for guest-compatible routes (e.g. order create).
 * Missing/invalid tokens do not fail the request — guest checkout stays open.
 * Never trusts role/branch headers or JWT metadata for privilege.
 */
export function createOptionalAuth(verifier: AuthTokenVerifier) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req.header("authorization") ?? undefined);
      if (!token) {
        return next();
      }

      const result = await verifier.getUser(token);
      if (result.user) {
        (req as AuthenticatedRequest).auth = {
          authUserId: result.user.id,
          email: result.user.email ?? null,
          accessToken: token,
          supabaseUser: result.user,
        };
      }

      return next();
    } catch {
      // Optional path — ignore verifier failures and continue as guest.
      return next();
    }
  };
}
