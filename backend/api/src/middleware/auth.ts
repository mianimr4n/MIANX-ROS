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

export function createRequireAuth(verifier: AuthTokenVerifier) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req.header("authorization") ?? undefined);

      if (!token) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }

      // Intentionally ignore x-telepizza-role and any client-supplied role claims.
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
