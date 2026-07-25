import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  canAdministrativelyInspectBranch,
  isOperationallyActive,
  type BranchStatus,
} from "./operational-status.js";
import { assertBranchMembership } from "./operational-status.js";
import { loadBranchRow } from "./lookup.js";

export interface BranchReadinessScope {
  isSuperAdmin: boolean;
  branchIds: string[];
}

export interface BranchReadinessReport {
  branchId: string;
  branchCode: string;
  name: string;
  status: BranchStatus | string;
  operationallyActive: boolean;
  blockers: Array<{ code: string; message: string }>;
  checks: {
    phone: boolean;
    operatingHours: boolean;
    branchManagerAssigned: boolean;
    cashierAssigned: boolean;
    kitchenAssigned: boolean;
    riderAssigned: boolean;
    statusOperating: boolean;
  };
}

async function countRoleOnBranch(
  supabase: SupabaseClient,
  branchId: string,
  roleCode: string,
): Promise<number> {
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .maybeSingle();
  if (roleError) throw new ApiError(500, "ROLE_LOOKUP_FAILED", roleError.message);
  if (!role) return 0;

  const { count, error } = await supabase
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("branch_id", branchId)
    .eq("role_id", (role as { id: string }).id);
  if (error) throw new ApiError(500, "MEMBERSHIP_LOOKUP_FAILED", error.message);
  return count ?? 0;
}

export function createBranchReadinessService(envStatus: EnvironmentStatus) {
  function getClient(): SupabaseClient {
    if (!envStatus.isReady) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
    }
    return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    async getBranchReadiness(
      scope: BranchReadinessScope,
      branchId: string,
    ): Promise<BranchReadinessReport> {
      assertBranchMembership(scope, branchId);
      const supabase = getClient();
      const branch = await loadBranchRow(supabase, branchId);

      if (
        !canAdministrativelyInspectBranch({
          isSuperAdmin: scope.isSuperAdmin,
          branchStatus: branch.status,
          isAssigned: scope.isSuperAdmin || scope.branchIds.includes(branchId),
        })
      ) {
        throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
      }

      const { data: details, error: detailsError } = await supabase
        .from("branches")
        .select("phone, opening_hours")
        .eq("id", branchId)
        .maybeSingle();

      if (detailsError) {
        throw new ApiError(500, "BRANCH_LOOKUP_FAILED", detailsError.message);
      }

      const phone = Boolean((details as { phone?: string | null } | null)?.phone?.trim());
      const openingHours = (details as { opening_hours?: Record<string, unknown> } | null)
        ?.opening_hours;
      const hoursOk =
        Boolean(openingHours) &&
        JSON.stringify(openingHours).toLowerCase().includes("coming soon") === false &&
        Object.keys(openingHours ?? {}).length > 0;

      const [bm, cashier, kitchen, rider] = await Promise.all([
        countRoleOnBranch(supabase, branchId, "branch-manager"),
        countRoleOnBranch(supabase, branchId, "cashier"),
        countRoleOnBranch(supabase, branchId, "kitchen"),
        countRoleOnBranch(supabase, branchId, "rider"),
      ]);

      const checks = {
        phone,
        operatingHours: hoursOk,
        branchManagerAssigned: bm > 0,
        cashierAssigned: cashier > 0,
        kitchenAssigned: kitchen > 0,
        riderAssigned: rider > 0,
        statusOperating: isOperationallyActive(branch.status),
      };

      const blockers: Array<{ code: string; message: string }> = [];
      if (!checks.statusOperating) {
        blockers.push({
          code: "STATUS_NOT_OPERATING",
          message: `Branch status is '${branch.status}'. Flip to operating before live service.`,
        });
      }
      if (!checks.phone) {
        blockers.push({ code: "PHONE_MISSING", message: "Branch phone number is required." });
      }
      if (!checks.operatingHours) {
        blockers.push({
          code: "HOURS_MISSING",
          message: "Real operating hours are required (placeholder Coming Soon is not valid).",
        });
      }
      if (!checks.branchManagerAssigned) {
        blockers.push({
          code: "MANAGER_MISSING",
          message: "No branch-manager membership is assigned to this branch.",
        });
      }
      if (!checks.cashierAssigned) {
        blockers.push({
          code: "CASHIER_MISSING",
          message: "No cashier membership is assigned to this branch.",
        });
      }
      if (!checks.kitchenAssigned) {
        blockers.push({
          code: "KITCHEN_MISSING",
          message: "No kitchen membership is assigned to this branch.",
        });
      }
      if (!checks.riderAssigned) {
        blockers.push({
          code: "RIDER_MISSING",
          message: "No rider membership is assigned (required for delivery).",
        });
      }

      return {
        branchId: branch.id,
        branchCode: branch.branch_code,
        name: branch.name,
        status: branch.status,
        operationallyActive: checks.statusOperating,
        blockers,
        checks,
      };
    },
  };
}

export type BranchReadinessService = ReturnType<typeof createBranchReadinessService>;
