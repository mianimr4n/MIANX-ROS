import { ApiError } from "../../common/http.js";
import type { AuthPrincipal } from "./principal.js";

/**
 * Canonical tenant-scope contract for privileged services.
 *
 * The caller must pass an organization_id resolved from trusted database data
 * (never a client-supplied role/header/JWT metadata value). Platform
 * super-admins may cross tenant boundaries; every other principal is limited
 * to organizationIds derived by buildAuthPrincipal().
 */
export function resolveScopedOrganizationIds(principal: AuthPrincipal): string[] {
  if (principal.isSuperAdmin) {
    return [];
  }

  return [...new Set(principal.organizationIds ?? [])].filter(Boolean).sort();
}

export function assertOrganizationInScope(
  principal: AuthPrincipal,
  organizationId: string | null | undefined,
): asserts organizationId is string {
  if (!organizationId) {
    throw new ApiError(403, "ORGANIZATION_SCOPE_REQUIRED", "Organization scope is required.");
  }

  if (principal.isSuperAdmin) {
    return;
  }

  const allowed = resolveScopedOrganizationIds(principal);
  if (!allowed.includes(organizationId)) {
    throw new ApiError(403, "ORGANIZATION_ACCESS_DENIED", "Organization access denied.");
  }
}

/**
 * Branch-level guard when the branch's trusted organization_id is already
 * available. This avoids a second database lookup in service methods that
 * already loaded the branch row.
 */
export function assertBranchInScope(
  principal: AuthPrincipal,
  branch: { id: string; organizationId: string | null | undefined },
): void {
  if (principal.isSuperAdmin) {
    return;
  }

  if (principal.branchIds.includes(branch.id)) {
    return;
  }

  assertOrganizationInScope(principal, branch.organizationId);
}
