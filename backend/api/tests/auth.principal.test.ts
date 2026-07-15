import { describe, expect, it } from "vitest";

import {
  APPROVED_CUSTOMER_PERMISSIONS,
  CUSTOMER_FORBIDDEN_PERMISSIONS,
  buildAuthPrincipal,
  isAccountActive,
  toSafeAuthMeData,
} from "../src/services/auth/principal.js";

describe("buildAuthPrincipal", () => {
  it("builds a valid customer principal with no staff permissions", () => {
    const principal = buildAuthPrincipal({
      authUserId: "auth-customer",
      userId: "user-customer",
      email: "customer@example.com",
      userType: "customer",
      status: "active",
      assignments: [
        {
          roleCode: "customer",
          branchId: null,
          permissionCodes: ["order.create", "menu.write", "staff.manage"],
        },
        {
          roleCode: "branch-manager",
          branchId: "branch-1",
          permissionCodes: ["menu.write", "staff.manage"],
        },
      ],
    });

    expect(principal.roles).toEqual(["branch-manager", "customer"]);
    expect(principal.permissions).toEqual([]);
    expect(principal.branchIds).toEqual([]);
    expect(principal.isSuperAdmin).toBe(false);
    expect(APPROVED_CUSTOMER_PERMISSIONS.size).toBe(0);

    for (const code of [
      "menu.update",
      "menu.write",
      "staff.create",
      "staff.assign_role",
      "reports.read",
      "payment.manage",
    ] as const) {
      expect(principal.permissions).not.toContain(code);
    }

    expect(CUSTOMER_FORBIDDEN_PERMISSIONS.has("menu.write")).toBe(true);
    expect(CUSTOMER_FORBIDDEN_PERMISSIONS.has("payment.manage")).toBe(true);
  });

  it("builds a branch-scoped staff principal", () => {
    const principal = buildAuthPrincipal({
      authUserId: "auth-staff",
      userId: "user-staff",
      email: "manager@example.com",
      userType: "staff",
      status: "active",
      assignments: [
        {
          roleCode: "branch-manager",
          branchId: "branch-a",
          permissionCodes: ["menu.write", "order.manage", "staff.manage"],
        },
      ],
    });

    expect(principal.roles).toEqual(["branch-manager"]);
    expect(principal.permissions).toEqual(["menu.write", "order.manage", "staff.manage"]);
    expect(principal.branchIds).toEqual(["branch-a"]);
    expect(principal.isSuperAdmin).toBe(false);
  });

  it("builds a super-admin global principal", () => {
    const principal = buildAuthPrincipal({
      authUserId: "auth-sa",
      userId: "user-sa",
      email: "admin@example.com",
      userType: "admin",
      status: "active",
      assignments: [
        {
          roleCode: "super-admin",
          branchId: null,
          permissionCodes: ["admin.access", "menu.write"],
        },
      ],
    });

    expect(principal.isSuperAdmin).toBe(true);
    expect(principal.branchIds).toEqual([]);
    expect(principal.roles).toEqual(["super-admin"]);
  });

  it("merges permissions from multiple roles without duplicates", () => {
    const principal = buildAuthPrincipal({
      authUserId: "auth-multi",
      userId: "user-multi",
      email: "multi@example.com",
      userType: "staff",
      status: "active",
      assignments: [
        {
          roleCode: "kitchen",
          branchId: "branch-a",
          permissionCodes: ["order.read", "order.manage"],
        },
        {
          roleCode: "cashier",
          branchId: "branch-a",
          permissionCodes: ["order.read", "payment.read", "payment.manage"],
        },
        {
          roleCode: "cashier",
          branchId: "branch-b",
          permissionCodes: ["order.read", "payment.read", "payment.manage"],
        },
      ],
    });

    expect(principal.roles).toEqual(["cashier", "kitchen"]);
    expect(principal.permissions).toEqual([
      "order.manage",
      "order.read",
      "payment.manage",
      "payment.read",
    ]);
    expect(principal.branchIds).toEqual(["branch-a", "branch-b"]);
  });
});

describe("account status", () => {
  it("allows only active status", () => {
    expect(isAccountActive("active")).toBe(true);
    expect(isAccountActive("suspended")).toBe(false);
    expect(isAccountActive("inactive")).toBe(false);
    expect(isAccountActive("invited")).toBe(false);
    expect(isAccountActive("deleted")).toBe(false);
    expect(isAccountActive(null)).toBe(false);
  });
});

describe("toSafeAuthMeData", () => {
  it("returns profileReady false when profile is missing", () => {
    const data = toSafeAuthMeData("auth-1", "a@example.com", null, null);
    expect(data.profileReady).toBe(false);
    expect(data.profile).toBeNull();
    expect(data.roles).toEqual([]);
    expect(data.permissions).toEqual([]);
    expect(data.branchIds).toEqual([]);
    expect(data.isSuperAdmin).toBe(false);
  });
});
