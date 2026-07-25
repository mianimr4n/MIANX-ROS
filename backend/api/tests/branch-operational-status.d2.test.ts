import { describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import {
  assertBranchMembership,
  assertBranchOperational,
  canAdministrativelyInspectBranch,
  isOperationallyActive,
} from "../src/services/branches/operational-status.js";

describe("D2 — branch operational status policy", () => {
  it("only operating is operationally active", () => {
    expect(isOperationallyActive("operating")).toBe(true);
    expect(isOperationallyActive("coming-soon")).toBe(false);
    expect(isOperationallyActive("inactive")).toBe(false);
  });

  it("coming-soon rejects live ops with BRANCH_NOT_OPERATIONAL", () => {
    expect(() => assertBranchOperational("coming-soon")).toThrow(ApiError);
    try {
      assertBranchOperational("coming-soon");
    } catch (error) {
      expect(error).toMatchObject({ code: "BRANCH_NOT_OPERATIONAL", statusCode: 409 });
    }
  });

  it("inactive rejects live ops with BRANCH_INACTIVE", () => {
    try {
      assertBranchOperational("inactive");
    } catch (error) {
      expect(error).toMatchObject({ code: "BRANCH_INACTIVE", statusCode: 409 });
    }
  });

  it("operating allows live ops", () => {
    expect(() => assertBranchOperational("operating")).not.toThrow();
  });

  it("admin visibility: SA sees inactive; assigned BM sees coming-soon; staff not assigned denied", () => {
    expect(
      canAdministrativelyInspectBranch({
        isSuperAdmin: true,
        branchStatus: "inactive",
        isAssigned: false,
      }),
    ).toBe(true);
    expect(
      canAdministrativelyInspectBranch({
        isSuperAdmin: false,
        branchStatus: "coming-soon",
        isAssigned: true,
      }),
    ).toBe(true);
    expect(
      canAdministrativelyInspectBranch({
        isSuperAdmin: false,
        branchStatus: "inactive",
        isAssigned: true,
      }),
    ).toBe(false);
    expect(
      canAdministrativelyInspectBranch({
        isSuperAdmin: false,
        branchStatus: "coming-soon",
        isAssigned: false,
      }),
    ).toBe(false);
  });

  it("membership denial uses BRANCH_ACCESS_DENIED", () => {
    try {
      assertBranchMembership(
        { isSuperAdmin: false, branchIds: ["a"] },
        "b",
      );
    } catch (error) {
      expect(error).toMatchObject({ code: "BRANCH_ACCESS_DENIED", statusCode: 403 });
    }
  });
});
