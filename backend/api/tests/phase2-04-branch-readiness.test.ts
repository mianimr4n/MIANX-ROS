import { describe, expect, it } from "vitest";

import { assertControlPlaneReadAccess, deriveControlPlaneReadiness } from "../src/services/branches/control-plane.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";

const branch = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Royal Orchard",
  branch_code: "ROYAL",
  organization_id: "20000000-0000-4000-8000-000000000001",
  status: "operating",
  address: "Main Boulevard",
  timezone: "Asia/Karachi",
  phone: "0300-0000000",
  opening_hours: { monday: { open: "11:00", close: "23:00" } },
};

function legacy(overrides: Partial<{
  operationallyActive: boolean; menuAssigned: boolean; paymentConfigured: boolean;
  kdsReady: boolean; deliveryReady: boolean; branchManagerAssigned: boolean;
}> = {}) {
  return {
    operationallyActive: overrides.operationallyActive ?? true,
    checks: {
      menuAssigned: overrides.menuAssigned ?? true,
      paymentConfigured: overrides.paymentConfigured ?? true,
      kdsReady: overrides.kdsReady ?? true,
      deliveryReady: overrides.deliveryReady ?? true,
      branchManagerAssigned: overrides.branchManagerAssigned ?? true,
    },
  };
}

const configured = {
  schemaCount: 2, requiredSchemaCount: 1, activeCount: 1,
  activeVersion: { versionId: "30000000-0000-4000-8000-000000000001", revision: 3, activatedAt: "2026-08-08T00:00:00.000Z" },
};

describe("PHASE2-04 deterministic branch readiness", () => {
  it("reports READY only when every blocker and warning check passes", () => {
    const result = deriveControlPlaneReadiness(branch, legacy(), configured, "2026-08-08T00:00:00.000Z");
    expect(result.readinessState).toBe("READY");
    expect(result.readinessScore).toBeLessThan(100); // unavailable INFO remains honest and does not pass
    expect(result.blockingChecks).toBe(0);
    expect(result.warningChecks).toBe(0);
  });

  it("reports READY_WITH_WARNINGS for non-blocking operational gaps", () => {
    const result = deriveControlPlaneReadiness(branch, legacy({ paymentConfigured: false }), configured);
    expect(result.readinessState).toBe("READY_WITH_WARNINGS");
    expect(result.warningChecks).toBe(2);
  });

  it("reports BLOCKED for a failed source-backed launch blocker", () => {
    const result = deriveControlPlaneReadiness(branch, legacy({ branchManagerAssigned: false }), configured);
    expect(result.readinessState).toBe("BLOCKED");
    expect(result.recommendedActions.some((item) => item.checkKey === "staff.manager")).toBe(true);
  });

  it("reports NOT_CONFIGURED when no configuration schema contract exists", () => {
    const result = deriveControlPlaneReadiness(branch, legacy(), {
      schemaCount: 0, requiredSchemaCount: 0, activeCount: 0, activeVersion: null,
    });
    expect(result.readinessState).toBe("NOT_CONFIGURED");
  });

  it("does not count UNKNOWN checks as passing", () => {
    const result = deriveControlPlaneReadiness(branch, legacy({ deliveryReady: false }), configured);
    const unknown = result.groups.flatMap((group) => group.checks).filter((item) => item.state === "UNKNOWN");
    expect(unknown.length).toBeGreaterThan(0);
    expect(result.passedChecks).toBeLessThan(result.totalChecks);
  });
});

function principal(role: string, isSuperAdmin = false): AuthPrincipal {
  return { authUserId: "auth", userId: "user", email: null, userType: "staff", status: "active",
    roles: [role], permissions: ["admin.access"], branchIds: [], organizationIds: [],
    ownedOrganizationIds: [], isSuperAdmin, isPlatformSuperAdmin: isSuperAdmin };
}

describe("PHASE2-04 enterprise readiness authorization", () => {
  it.each(["platform_super_admin", "super-admin", "organization_owner", "branch_manager", "branch-manager"])("allows %s read authority", (role) => {
    expect(() => assertControlPlaneReadAccess(principal(role, role.includes("super")))).not.toThrow();
  });

  it.each(["kitchen_manager", "kitchen", "cashier", "rider", "waiter"])("denies lower role %s", (role) => {
    expect(() => assertControlPlaneReadAccess(principal(role))).toThrowError(/access denied/i);
  });
});
