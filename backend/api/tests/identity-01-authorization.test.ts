import { describe, expect, it } from "vitest";

import type { AuthPrincipal } from "../src/services/auth/principal.js";
import {
  assertInvitationAuthority,
  assertPlatformSuperAdmin,
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  isInviteableRoleCode,
} from "../src/services/staff/invites.js";

const ORG_A = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

function principal(overrides: Partial<AuthPrincipal>): AuthPrincipal {
  return {
    authUserId: "auth-user", userId: "app-user", email: "masked@example.test",
    userType: "staff", status: "active", roles: [], permissions: [], branchIds: [],
    organizationIds: [], ownedOrganizationIds: [], isPlatformSuperAdmin: false,
    isSuperAdmin: false, ...overrides,
  };
}

describe("IDENTITY-01 invitation authority", () => {
  it("treats canonical and legacy platform roles as platform-only authority", () => {
    expect(() => assertPlatformSuperAdmin(principal({ roles: ["platform_super_admin"], isPlatformSuperAdmin: true, isSuperAdmin: true }))).not.toThrow();
    expect(() => assertPlatformSuperAdmin(principal({ roles: ["super-admin"], isSuperAdmin: true }))).not.toThrow();
    expect(() => assertPlatformSuperAdmin(principal({ roles: ["organization_owner"], ownedOrganizationIds: [ORG_A] }))).toThrowError(/Platform/);
  });

  it("prevents platform administrators from provisioning ordinary restaurant staff", () => {
    expect(() => assertInvitationAuthority(principal({ roles: ["platform_super_admin"], isSuperAdmin: true }), ORG_A, "cashier", [B1])).toThrowError(/only bootstrap/);
  });

  it("allows owner grants only inside the owned organization and below owner authority", () => {
    const owner = principal({ roles: ["organization_owner"], organizationIds: [ORG_A], ownedOrganizationIds: [ORG_A] });
    expect(() => assertInvitationAuthority(owner, ORG_A, "branch_manager", [B1, B2])).not.toThrow();
    expect(() => assertInvitationAuthority(owner, ORG_A, "organization_owner", [])).toThrowError(/cannot be granted/);
    expect(() => assertInvitationAuthority(owner, ORG_B, "cashier", [B1])).toThrowError(/Organization access denied/);
    expect(() => assertInvitationAuthority(owner, ORG_A, "platform_super_admin", [])).toThrowError(/cannot be granted/);
  });

  it("limits branch managers to lower roles and assigned branches", () => {
    const manager = principal({ roles: ["branch_manager"], organizationIds: [ORG_A], branchIds: [B1] });
    expect(() => assertInvitationAuthority(manager, ORG_A, "cashier", [B1])).not.toThrow();
    expect(() => assertInvitationAuthority(manager, ORG_A, "organization_owner", [])).toThrowError(/exceeds assigned authority/);
    expect(() => assertInvitationAuthority(manager, ORG_A, "cashier", [B2])).toThrowError(/exceeds assigned authority/);
    expect(() => assertInvitationAuthority(manager, ORG_B, "cashier", [B1])).toThrowError(/Organization access denied/);
  });

  it("denies kitchen, cashier, rider and support invitation management", () => {
    for (const role of ["kitchen_manager", "cashier", "rider", "support"]) {
      expect(() => assertInvitationAuthority(principal({ roles: [role], organizationIds: [ORG_A], branchIds: [B1] }), ORG_A, "cashier", [B1])).toThrowError(/Organization access denied/);
    }
  });

  it("issues canonical roles only and keeps token material one-way", () => {
    expect(isInviteableRoleCode("branch_manager")).toBe(true);
    expect(isInviteableRoleCode("branch-manager")).toBe(false);
    expect(isInviteableRoleCode("host")).toBe(false);
    expect(isInviteableRoleCode("waiter")).toBe(false);
    const generated = generateInviteToken();
    expect(generated.tokenHash).toBe(hashInviteToken(generated.rawToken));
    expect(generated.tokenHash).not.toContain(generated.rawToken);
    expect(buildInviteUrl("https://example.test", generated.rawToken)).toContain("/staff/accept?token=");
  });
});
