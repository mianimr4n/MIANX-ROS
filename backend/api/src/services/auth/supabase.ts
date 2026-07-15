import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";

export interface SafeAuthProfile {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface SafeAuthMeData {
  authUserId: string;
  email: string | null;
  profile: SafeAuthProfile | null;
  roles: string[];
  profileReady: boolean;
}

export interface AuthProfileRepository {
  getMe(authUserId: string, email: string | null): Promise<SafeAuthMeData>;
}

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  password_hash: string | null;
  user_type: string;
};

function createAnonClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseAnonKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseAuthTokenVerifier(envStatus: EnvironmentStatus): AuthTokenVerifier {
  return {
    async getUser(accessToken: string) {
      const client = createAnonClient(envStatus);
      const { data, error } = await client.auth.getUser(accessToken);

      if (error || !data.user) {
        return { user: null, errorMessage: error?.message };
      }

      return { user: data.user as User };
    },
  };
}

export function createSupabaseAuthProfileRepository(
  envStatus: EnvironmentStatus,
): AuthProfileRepository {
  return {
    async getMe(authUserId: string, email: string | null) {
      const admin = createServiceClient(envStatus);
      const { data: profile, error: profileError } = await admin
        .from("users")
        .select("id, full_name, phone, email, password_hash, user_type")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        return {
          authUserId,
          email,
          profile: null,
          roles: [],
          profileReady: false,
        };
      }

      const row = profile as UserRow;

      const { data: roleLinks, error: roleLinksError } = await admin
        .from("user_roles")
        .select("role_id")
        .eq("user_id", row.id);

      if (roleLinksError) {
        throw roleLinksError;
      }

      const roleIds = (roleLinks ?? []).map((link) => link.role_id).filter(Boolean);

      let roles: string[] = [];
      if (roleIds.length > 0) {
        const { data: roleRows, error: rolesError } = await admin
          .from("roles")
          .select("code")
          .in("id", roleIds);

        if (rolesError) {
          throw rolesError;
        }

        roles = (roleRows ?? [])
          .map((entry) => entry.code)
          .filter((code): code is string => Boolean(code));
      }

      return {
        authUserId,
        email: email ?? row.email,
        profile: {
          id: row.id,
          fullName: row.full_name,
          phone: row.phone,
        },
        roles,
        profileReady: true,
      };
    },
  };
}
