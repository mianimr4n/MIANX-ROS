/**
 * Server-derived authorization principal.
 * All fields come from public.* tables — never from headers, body, JWT metadata, or frontend state.
 */

export type UserAccountStatus = "invited" | "active" | "inactive" | "suspended" | string;

export interface AuthPrincipal {
  authUserId: string;
  userId: string;
  email: string | null;
  userType: string;
  status: UserAccountStatus;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  /** Tenant scope is repository-derived. Optional only for legacy test doubles. */
  organizationIds?: string[];
  /** Organizations in which this user has an active owner assignment. */
  ownedOrganizationIds?: string[];
  /** Canonical platform authority; legacy super-admin is a compatibility alias. */
  isPlatformSuperAdmin?: boolean;
  isSuperAdmin: boolean;
}

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
  permissions: string[];
  branchIds: string[];
  organizationIds?: string[];
  ownedOrganizationIds?: string[];
  isPlatformSuperAdmin?: boolean;
  isSuperAdmin: boolean;
  status: UserAccountStatus | null;
  profileReady: boolean;
}

/** Slice 2A approved customer permission codes (empty until order/address slices). */
export const APPROVED_CUSTOMER_PERMISSIONS: ReadonlySet<string> = new Set();

/** Staff / privileged permission codes customers must never receive. */
export const CUSTOMER_FORBIDDEN_PERMISSIONS: ReadonlySet<string> = new Set([
  "menu.update",
  "menu.write",
  "staff.create",
  "staff.assign_role",
  "staff.manage",
  "staff.read",
  "reports.read",
  "payment.manage",
  "payment.read",
  "admin.access",
  "branch.manage",
  "order.manage",
  "delivery.assign",
  "delivery.update",
]);

export interface RoleAssignmentInput {
  roleCode: string;
  branchId: string | null;
  organizationId?: string | null;
  branchIds?: string[];
  permissionCodes: string[];
}

export interface BuildPrincipalInput {
  authUserId: string;
  userId: string;
  email: string | null;
  userType: string;
  status: string;
  assignments: RoleAssignmentInput[];
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

/**
 * Build AuthPrincipal from DB-backed rows only.
 * Customers only receive permissions granted via the `customer` role and the
 * approved customer permission allowlist (currently empty).
 */
export function buildAuthPrincipal(input: BuildPrincipalInput): AuthPrincipal {
  const isCustomer = input.userType === "customer";
  const roleCodes = uniqueSorted(input.assignments.map((entry) => entry.roleCode));
  const isPlatformSuperAdmin = !isCustomer &&
    (roleCodes.includes("platform_super_admin") || roleCodes.includes("super-admin"));
  const isSuperAdmin = isPlatformSuperAdmin;

  const effectiveAssignments = isCustomer
    ? input.assignments.filter((entry) => entry.roleCode === "customer")
    : input.assignments;

  const permissionCodes = uniqueSorted(
    effectiveAssignments.flatMap((entry) => entry.permissionCodes),
  ).filter((code) => {
    if (!isCustomer) {
      return true;
    }
    return APPROVED_CUSTOMER_PERMISSIONS.has(code) && !CUSTOMER_FORBIDDEN_PERMISSIONS.has(code);
  });

  const branchIds = isCustomer
    ? []
    : uniqueSorted(
        effectiveAssignments
          .flatMap((entry) => [entry.branchId, ...(entry.branchIds ?? [])])
          .filter((branchId): branchId is string => Boolean(branchId)),
      );

  const organizationIds = isCustomer ? [] : uniqueSorted(
    effectiveAssignments.map((entry) => entry.organizationId).filter((id): id is string => Boolean(id)),
  );
  const ownedOrganizationIds = isCustomer ? [] : uniqueSorted(
    effectiveAssignments
      .filter((entry) => entry.roleCode === "organization_owner")
      .map((entry) => entry.organizationId)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    authUserId: input.authUserId,
    userId: input.userId,
    email: input.email,
    userType: input.userType,
    status: input.status,
    roles: roleCodes,
    permissions: permissionCodes,
    branchIds,
    organizationIds,
    ownedOrganizationIds,
    isPlatformSuperAdmin,
    isSuperAdmin,
  };
}

export function isAccountActive(status: string | null | undefined): boolean {
  return status === "active";
}

export function toSafeAuthMeData(
  authUserId: string,
  email: string | null,
  principal: AuthPrincipal | null,
  profile: SafeAuthProfile | null,
): SafeAuthMeData {
  if (!principal || !profile) {
    return {
      authUserId,
      email,
      profile: null,
      roles: [],
      permissions: [],
      branchIds: [],
      organizationIds: [],
      ownedOrganizationIds: [],
      isPlatformSuperAdmin: false,
      isSuperAdmin: false,
      status: principal?.status ?? null,
      profileReady: false,
    };
  }

  return {
    authUserId: principal.authUserId,
    email: principal.email ?? email,
    profile,
    roles: principal.roles,
    permissions: principal.permissions,
    branchIds: principal.branchIds,
    organizationIds: principal.organizationIds ?? [],
    ownedOrganizationIds: principal.ownedOrganizationIds ?? [],
    isPlatformSuperAdmin: principal.isPlatformSuperAdmin ?? principal.isSuperAdmin,
    isSuperAdmin: principal.isSuperAdmin,
    status: principal.status,
    profileReady: true,
  };
}
