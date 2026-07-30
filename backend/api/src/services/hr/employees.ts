import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export interface HrEmployeeRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: HrEmployeeStatus;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHrEmployeeInput {
  branchId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  status?: HrEmployeeStatus;
  hiredAt?: string | null;
}

export interface HrEmployeesService {
  listEmployees(scope: BranchActorScope, branchId?: string): Promise<HrEmployeeRecord[]>;
  createEmployee(scope: BranchActorScope, input: CreateHrEmployeeInput): Promise<HrEmployeeRecord>;
}

type EmployeeRow = {
  id: string;
  branch_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
};

const SELECT =
  "id, branch_id, full_name, email, phone, role, status, hired_at, created_at, updated_at, branch:branches(id, branch_code, name)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: EmployeeRow): HrEmployeeRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status as HrEmployeeStatus,
    hiredAt: row.hired_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resolveListBranchIds(scope: BranchActorScope, branchId?: string): string[] | "all" | "none" {
  if (branchId) {
    assertBranchMembership(scope, branchId);
    return [branchId];
  }
  if (scope.isSuperAdmin) return "all";
  if (scope.branchIds.length === 0) return "none";
  return scope.branchIds;
}

export function createHrEmployeesService(envStatus: EnvironmentStatus): HrEmployeesService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listEmployees(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client.from("hr_employees").select(SELECT).order("full_name", { ascending: true });
      if (branchScope !== "all") {
        query = query.in("branch_id", branchScope);
      }

      const { data, error } = await query;
      if (error) {
        throw new ApiError(500, "HR_EMPLOYEES_READ_FAILED", error.message);
      }
      return ((data ?? []) as unknown as EmployeeRow[]).map(mapRow);
    },

    async createEmployee(scope, input) {
      assertBranchMembership(scope, input.branchId);

      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const email = input.email.trim().toLowerCase();
      const fullName = input.fullName.trim();
      const role = input.role.trim();
      const phone = input.phone?.trim() || null;
      const status = input.status ?? "active";
      const hiredAt = input.hiredAt?.trim() || null;

      if (!fullName) {
        throw new ApiError(400, "VALIDATION_ERROR", "Full name is required.");
      }
      if (!email) {
        throw new ApiError(400, "VALIDATION_ERROR", "Email is required.");
      }
      if (!role) {
        throw new ApiError(400, "VALIDATION_ERROR", "Role is required.");
      }

      const { data, error } = await client
        .from("hr_employees")
        .insert({
          branch_id: input.branchId,
          full_name: fullName,
          email,
          phone,
          role,
          status,
          hired_at: hiredAt,
        })
        .select(SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "HR_EMPLOYEE_EXISTS", "An employee with this email already exists for the branch.");
        }
        throw new ApiError(500, "HR_EMPLOYEE_CREATE_FAILED", error.message);
      }

      return mapRow(data as unknown as EmployeeRow);
    },
  };
}
