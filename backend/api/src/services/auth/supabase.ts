import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import {
  buildAuthPrincipal,
  toSafeAuthMeData,
  type AuthPrincipal,
  type SafeAuthMeData,
} from "./principal.js";

export type {
  AuthPrincipal,
  SafeAuthMeData,
  SafeAuthProfile,
} from "./principal.js";

export interface AuthPrincipalRepository {
  resolvePrincipal(authUserId: string, email: string | null): Promise<AuthPrincipal | null>;
  getMe(authUserId: string, email: string | null): Promise<SafeAuthMeData>;
}

/** @deprecated Prefer AuthPrincipalRepository — kept as alias for existing imports. */
export type AuthProfileRepository = AuthPrincipalRepository;

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  user_type: string;
  status: string;
};

type UserRoleRow = {
  role_id: string;
  branch_id: string | null;
};

type RoleRow = {
  id: string;
  code: string;
};

type RolePermissionRow = {
  role_id: string;
  permission_id: string;
};

type PermissionRow = {
  id: string;
  code: string;
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

async function loadPrincipalFromDb(
  admin: SupabaseClient,
  authUserId: string,
  email: string | null,
): Promise<{ principal: AuthPrincipal; profile: { id: string; fullName: string; phone: string | null } } | null> {
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, full_name, phone, email, user_type, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  const row = profile as UserRow;

  const { data: roleLinks, error: roleLinksError } = await admin
    .from("user_roles")
    .select("role_id, branch_id")
    .eq("user_id", row.id);

  if (roleLinksError) {
    throw roleLinksError;
  }

  const links = (roleLinks ?? []) as UserRoleRow[];
  const roleIds = [...new Set(links.map((link) => link.role_id).filter(Boolean))];

  let rolesById = new Map<string, string>();
  if (roleIds.length > 0) {
    const { data: roleRows, error: rolesError } = await admin
      .from("roles")
      .select("id, code")
      .in("id", roleIds);

    if (rolesError) {
      throw rolesError;
    }

    rolesById = new Map(
      ((roleRows ?? []) as RoleRow[])
        .filter((entry) => Boolean(entry.code))
        .map((entry) => [entry.id, entry.code]),
    );
  }

  let permissionsByRoleId = new Map<string, string[]>();
  if (roleIds.length > 0) {
    const { data: rolePermissionRows, error: rolePermissionsError } = await admin
      .from("role_permissions")
      .select("role_id, permission_id")
      .in("role_id", roleIds);

    if (rolePermissionsError) {
      throw rolePermissionsError;
    }

    const permissionIds = [
      ...new Set(
        ((rolePermissionRows ?? []) as RolePermissionRow[])
          .map((entry) => entry.permission_id)
          .filter(Boolean),
      ),
    ];

    let permissionsById = new Map<string, string>();
    if (permissionIds.length > 0) {
      const { data: permissionRows, error: permissionsError } = await admin
        .from("permissions")
        .select("id, code")
        .in("id", permissionIds);

      if (permissionsError) {
        throw permissionsError;
      }

      permissionsById = new Map(
        ((permissionRows ?? []) as PermissionRow[])
          .filter((entry) => Boolean(entry.code))
          .map((entry) => [entry.id, entry.code]),
      );
    }

    for (const roleId of roleIds) {
      permissionsByRoleId.set(roleId, []);
    }

    for (const link of (rolePermissionRows ?? []) as RolePermissionRow[]) {
      const code = permissionsById.get(link.permission_id);
      if (!code) continue;
      const bucket = permissionsByRoleId.get(link.role_id) ?? [];
      bucket.push(code);
      permissionsByRoleId.set(link.role_id, bucket);
    }
  }

  const assignments = links
    .map((link) => {
      const roleCode = rolesById.get(link.role_id);
      if (!roleCode) return null;
      return {
        roleCode,
        branchId: link.branch_id,
        permissionCodes: permissionsByRoleId.get(link.role_id) ?? [],
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const principal = buildAuthPrincipal({
    authUserId,
    userId: row.id,
    email: email ?? row.email,
    userType: row.user_type,
    status: row.status,
    assignments,
  });

  return {
    principal,
    profile: {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
    },
  };
}

export function createSupabaseAuthProfileRepository(
  envStatus: EnvironmentStatus,
): AuthPrincipalRepository {
  return {
    async resolvePrincipal(authUserId: string, email: string | null) {
      const admin = createServiceClient(envStatus);
      const loaded = await loadPrincipalFromDb(admin, authUserId, email);
      return loaded?.principal ?? null;
    },

    async getMe(authUserId: string, email: string | null) {
      const admin = createServiceClient(envStatus);
      const loaded = await loadPrincipalFromDb(admin, authUserId, email);
      if (!loaded) {
        return toSafeAuthMeData(authUserId, email, null, null);
      }
      return toSafeAuthMeData(authUserId, email, loaded.principal, loaded.profile);
    },
  };
}
