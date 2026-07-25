import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { assertBranchOperational } from "./operational-status.js";

export async function loadBranchRow(
  supabase: SupabaseClient,
  branchId: string,
): Promise<{ id: string; branch_code: string; status: string; name: string }> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, status, name")
    .eq("id", branchId)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
  }
  if (!data) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
  }
  return data as { id: string; branch_code: string; status: string; name: string };
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
): Promise<{ id: string; branch_code: string; status: string; name: string }> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, branch_code, status, name")
    .eq("branch_code", branchCode)
    .maybeSingle();
  if (error) {
    throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
  }
  if (!data) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", `Branch '${branchCode}' was not found.`);
  }
  return data as { id: string; branch_code: string; status: string; name: string };
}
