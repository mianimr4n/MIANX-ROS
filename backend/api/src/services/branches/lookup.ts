import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { assertBranchOperational } from "./operational-status.js";

export interface BranchLookupRow {
  id: string;
  branch_code: string;
  status: string;
  name: string;
  organization_id: string;
}

/**
 * Multi-Tenant Foundation (Phase B, Group 1): asserts a looked-up branch
 * actually belongs to the caller's organization. `branches.id` and
 * `branch_code` are globally unique, so a bare lookup by either can never
 * "leak" another tenant's branch data by accident -- but a caller that
 * looks up a branch by an ID it received from user input (a request param,
 * not a value it already trusted) must call this before acting on the
 * result, or a malicious/buggy caller in a future multi-tenant world could
 * ask for `branchId=<some other tenant's branch>` and get a valid answer.
 */
export function assertBranchBelongsToOrganization(
  branch: BranchLookupRow,
  organizationId: string,
): void {
  if (branch.organization_id !== organizationId) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
  }
}

export async function loadBranchRow(
  supabase: SupabaseClient,
  branchId: string,
): Promise<BranchLookupRow> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, status, name, organization_id")
    .eq("id", branchId)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
  }
  if (!data) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
  }
  return data as BranchLookupRow;
}

export async function assertBranchIdOperational(
  supabase: SupabaseClient,
  branchId: string,
): Promise<void> {
  const branch = await loadBranchRow(supabase, branchId);
  assertBranchOperational(branch.status);
}

export async function loadBranchByCode(
  supabase: SupabaseClient,
  branchCode: string,
): Promise<BranchLookupRow> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, status, name, organization_id")
    .eq("branch_code", branchCode)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
  }
  if (!data) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", `Branch '${branchCode}' was not found.`);
  }
  return data as BranchLookupRow;
}
