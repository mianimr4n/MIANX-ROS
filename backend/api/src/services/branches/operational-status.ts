/**
 * Canonical branch operational-status policy (D2 opening readiness).
 *
 * Schema CHECK (`branches.status`): `operating` | `coming-soon` | `inactive`.
 * There is no `suspended` value in the repository — do not invent one.
 *
 * Authority:
 * - Administrative visibility: super-admin (and assigned managers for setup)
 *   may inspect coming-soon / inactive branches for readiness.
 * - Operational actions (POS create, kitchen transition, delivery assign,
 *   live order intake): require `operating`. Non-operational branches reject
 *   with BRANCH_NOT_OPERATIONAL (never silent omission).
 */

import { ApiError } from "../../common/http.js";

export const BRANCH_STATUSES = ["operating", "coming-soon", "inactive"] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export function isBranchStatus(value: string): value is BranchStatus {
  return (BRANCH_STATUSES as readonly string[]).includes(value);
}

export function isOperationallyActive(status: string): boolean {
  return status === "operating";
}

/** Setup / readiness surfaces — coming-soon is visible; inactive is admin-only. */
export function canAdministrativelyInspectBranch(input: {
  isSuperAdmin: boolean;
  branchStatus: string;
  isAssigned: boolean;
}): boolean {
  if (input.isSuperAdmin) return true;
  if (!input.isAssigned) return false;
  // Assigned BM/staff may see coming-soon for opening readiness; inactive is owner-only.
  return input.branchStatus === "operating" || input.branchStatus === "coming-soon";
}

/** Live POS / kitchen / delivery / customer order intake. */
export function assertBranchOperational(
  status: string,
  options: { code?: "BRANCH_NOT_OPERATIONAL" | "BRANCH_INACTIVE" | "BRANCH_UNAVAILABLE" } = {},
): void {
  if (status === "operating") return;
  if (status === "inactive") {
    throw new ApiError(
      409,
      options.code === "BRANCH_UNAVAILABLE" ? "BRANCH_UNAVAILABLE" : "BRANCH_INACTIVE",
      "This branch is inactive and cannot accept live operational actions.",
    );
  }
  throw new ApiError(
    409,
    options.code ?? "BRANCH_NOT_OPERATIONAL",
    "This branch is not operationally active. Live orders, kitchen, and delivery actions are blocked until status is operating.",
  );
}

export function assertBranchMembership(
  scope: { isSuperAdmin: boolean; branchIds: string[] },
  branchId: string,
): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
  }
}
