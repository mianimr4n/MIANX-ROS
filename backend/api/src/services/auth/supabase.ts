import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import { normalizePakistaniMobileE164 } from "./phone.js";
import {
  buildAuthPrincipal,
  isAccountActive,
  toSafeAuthMeData,
  type AuthPrincipal,
  type SafeAuthMeData,
  type SafeAuthProfile,
} from "./principal.js";

export type {
  AuthPrincipal,
  SafeAuthMeData,
  SafeAuthProfile,
} from "./principal.js";

export type UpdateOwnProfileInput = {
  fullName?: string;
  phone?: string | null;
};

export interface AuthPrincipalRepository {
  resolvePrincipal(authUserId: string, email: string | null): Promise<AuthPrincipal | null>;
  getMe(authUserId: string, email: string | null): Promise<SafeAuthMeData>;
  /** Customer self-service profile update (fullName/phone only). */
  updateOwnProfile?(
    authUserId: string,
    email: string | null,
    input: UpdateOwnProfileInput,
  ): Promise<SafeAuthProfile>;
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
  id: string;
  role_id: string;
  branch_id: string | null;
  organization_id: string | null;
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
    .select("id, role_id, branch_id, organization_id")
    .eq("user_id", row.id)
    .eq("assignment_status", "ACTIVE");

  if (roleLinksError) {
    throw roleLinksError;
  }

  const links = (roleLinks ?? []) as UserRoleRow[];
  const roleIds = [...new Set(links.map((link) => link.role_id).filter(Boolean))];

  const roleLinkIds = links.map((link) => link.id);
  const branchIdsByRoleLink = new Map<string, string[]>();
  if (roleLinkIds.length > 0) {
    const { data: branchLinks, error: branchLinksError } = await admin
      .from("user_role_branches")
      .select("user_role_id, branch_id")
      .in("user_role_id", roleLinkIds);
    if (branchLinksError) throw branchLinksError;
    for (const link of (branchLinks ?? []) as Array<{ user_role_id: string; branch_id: string }>) {
      const bucket = branchIdsByRoleLink.get(link.user_role_id) ?? [];
      bucket.push(link.branch_id);
      branchIdsByRoleLink.set(link.user_role_id, bucket);
    }
  }

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
        organizationId: link.organization_id,
        branchIds: branchIdsByRoleLink.get(link.id) ?? [],
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

async function bootstrapCustomerProfile(
  admin: SupabaseClient,
  authUserId: string,
  email: string | null,
  fullNameHint?: string | null,
): Promise<{ principal: AuthPrincipal; profile: { id: string; fullName: string; phone: string | null } }> {
  const nameArg = fullNameHint?.trim() || email?.split("@")[0] || "Customer";
  const { error: rpcError } = await admin.rpc("ensure_customer_profile_for_auth_user", {
    p_auth_user_id: authUserId,
    p_email: email,
    p_full_name_meta: nameArg,
  });

  if (rpcError) {
    throw rpcError;
  }

  const reloaded = await loadPrincipalFromDb(admin, authUserId, email);
  if (!reloaded) {
    throw new ApiError(
      503,
      "PROFILE_BOOTSTRAP_FAILED",
      "We couldn't finish setting up your profile yet. Please try again.",
    );
  }
  return reloaded;
}

export function createSupabaseAuthProfileRepository(
  envStatus: EnvironmentStatus,
): AuthPrincipalRepository {
  return {
    async resolvePrincipal(authUserId: string, email: string | null) {
      const admin = createServiceClient(envStatus);
      const loaded = await loadPrincipalFromDb(admin, authUserId, email);
      if (!loaded) {
        const bootstrapped = await bootstrapCustomerProfile(admin, authUserId, email);
        return bootstrapped.principal;
      }
      return loaded.principal;
    },

    async getMe(authUserId: string, email: string | null) {
      const admin = createServiceClient(envStatus);
      let loaded = await loadPrincipalFromDb(admin, authUserId, email);
      if (!loaded) {
        loaded = await bootstrapCustomerProfile(admin, authUserId, email);
      }
      return toSafeAuthMeData(authUserId, email, loaded.principal, loaded.profile);
    },

    async updateOwnProfile(authUserId, email, input) {
      const admin = createServiceClient(envStatus);
      let loaded = await loadPrincipalFromDb(admin, authUserId, email);

      if (!loaded) {
        loaded = await bootstrapCustomerProfile(admin, authUserId, email);
      }

      if (!isAccountActive(loaded.principal.status)) {
        throw new ApiError(403, "USER_ACCESS_DISABLED", "Access is disabled for this account.");
      }

      // Staff profiles must not be rewritten through the customer profile path.
      if (loaded.principal.userType !== "customer") {
        throw new ApiError(
          403,
          "PROFILE_UPDATE_FORBIDDEN",
          "This account cannot update a customer profile here.",
        );
      }

      const patch: { full_name?: string; phone?: string | null } = {};

      if (input.fullName !== undefined) {
        const trimmed = input.fullName.trim();
        if (!trimmed) {
          throw new ApiError(400, "INVALID_FULL_NAME", "Full name cannot be empty.");
        }
        if (trimmed.length > 150) {
          throw new ApiError(400, "INVALID_FULL_NAME", "Full name is too long.");
        }
        patch.full_name = trimmed;
      }

      if (input.phone !== undefined) {
        if (input.phone === null || input.phone.trim() === "") {
          patch.phone = null;
        } else {
          patch.phone = normalizePakistaniMobileE164(input.phone);
        }
      }

      if (Object.keys(patch).length === 0) {
        return loaded.profile;
      }

      // Never accept/mutate role, user_type, status, auth_user_id, branch, permissions.
      const { data: updated, error } = await admin
        .from("users")
        .update(patch)
        .eq("auth_user_id", authUserId)
        .eq("user_type", "customer")
        .select("id, full_name, phone")
        .maybeSingle();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "PHONE_ALREADY_IN_USE",
            "This phone number cannot be used. Try a different number.",
          );
        }
        if (error.code === "23514") {
          throw new ApiError(
            400,
            "INVALID_PHONE",
            "Enter a valid Pakistani mobile number (03XXXXXXXXX or +923XXXXXXXXX).",
          );
        }
        throw error;
      }

      if (!updated) {
        throw new ApiError(
          503,
          "PROFILE_BOOTSTRAP_FAILED",
          "We couldn't finish setting up your profile yet. Please try again.",
        );
      }

      return {
        id: updated.id as string,
        fullName: updated.full_name as string,
        phone: (updated.phone as string | null) ?? null,
      };
    },
  };
}
