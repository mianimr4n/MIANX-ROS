import { describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import {
  assertBranchInScope,
  assertOrganizationInScope,
  resolveScopedOrganizationIds,
} from "../src/services/auth/tenant-scope.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    authUserId: "auth-1",
    userId: "user-1",
    email: "owner@example.com",
    userType: "staff",
    status: "active",
    roles: ["organization_owner"],
    permissions: [],
    branchIds: ["branch-a"],
    organizationIds: ["org-a"],
    ownedOrganizationIds: ["org-a"],
    isPlatformSuperAdmin: false,
    isSuperAdmin: false,
    ...overrides,
  };
}

describe("tenant scope guards", () => {
  it("resolves only server-derived organizations for non-super-admins", () => {
    expect(resolveScopedOrganizationIds(principal({ organizationIds: ["org-b", "org-a", "org-a"] }))).toEqual([
      "org-a",
      "org-b",
    ]);
  });

  it("allows a principal to access its organization", () => {
    expect(() => assertOrganizationInScope(principal(), "org-a")).not.toThrow();
  });

  it("blocks cross-tenant organization access", () => {
    expect(() => assertOrganizationInScope(principal(), "org-b")).toThrowError(ApiError);
    try {
      assertOrganizationInScope(principal(), "org-b");
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 403, code: "ORGANIZATION_ACCESS_DENIED" });
    }
  });

  it("allows super-admin cross-tenant access", () => {
    const platform = principal({ isSuperAdmin: true, isPlatformSuperAdmin: true, organizationIds: [] });
    expect(resolveScopedOrganizationIds(platform)).toEqual([]);
    expect(() => assertOrganizationInScope(platform, "org-b")).not.toThrow();
  });

  it("accepts an explicitly assigned branch even when organization scope is absent", () => {
    const branchOnly = principal({ organizationIds: [] });
    expect(() => assertBranchInScope(branchOnly, { id: "branch-a", organizationId: "org-b" })).not.toThrow();
  });

  it("blocks an unassigned branch from another organization", () => {
    expect(() => assertBranchInScope(principal(), { id: "branch-b", organizationId: "org-b" })).toThrowError(ApiError);
  });
});
