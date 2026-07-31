import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "casual"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export interface HrEmployeeRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  employeeNumber: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: HrEmployeeStatus;
  employmentType: HrEmploymentType | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  hiredAt: string | null;
  deactivationReason: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
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
  employeeNumber?: string | null;
  employmentType?: HrEmploymentType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface PatchHrEmployeeInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  hiredAt?: string | null;
  employeeNumber?: string | null;
  employmentType?: HrEmploymentType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  branchId?: string;
  transferReason?: string | null;
}

export interface DeactivateHrEmployeeInput {
  reason: string;
  status?: "inactive" | "terminated";
}

export interface HrEmployeesService {
  listEmployees(scope: BranchActorScope, branchId?: string): Promise<HrEmployeeRecord[]>;
  getEmployee(scope: BranchActorScope, employeeId: string): Promise<HrEmployeeRecord>;
  createEmployee(scope: BranchActorScope, actorUserId: string, input: CreateHrEmployeeInput): Promise<HrEmployeeRecord>;
  patchEmployee(
    scope: BranchActorScope,
    actorUserId: string,
    employeeId: string,
    input: PatchHrEmployeeInput,
  ): Promise<HrEmployeeRecord>;
  deactivateEmployee(
    scope: BranchActorScope,
    actorUserId: string,
    employeeId: string,
    input: DeactivateHrEmployeeInput,
  ): Promise<HrEmployeeRecord>;
  reactivateEmployee(
    scope: BranchActorScope,
    actorUserId: string,
    employeeId: string,
    reason?: string | null,
  ): Promise<HrEmployeeRecord>;
}

type EmployeeRow = {
  id: string;
  branch_id: string;
  employee_number: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  employment_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hired_at: string | null;
  deactivation_reason: string | null;
  deactivated_by: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
};

const SELECT =
  "id, branch_id, employee_number, full_name, email, phone, role, status, employment_type, emergency_contact_name, emergency_contact_phone, hired_at, deactivation_reason, deactivated_by, deactivated_at, created_at, updated_at, branch:branches(id, branch_code, name)";

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
    employeeNumber: row.employee_number,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status as HrEmployeeStatus,
    employmentType: (row.employment_type as HrEmploymentType | null) ?? null,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    hiredAt: row.hired_at,
    deactivationReason: row.deactivation_reason,
    deactivatedBy: row.deactivated_by,
    deactivatedAt: row.deactivated_at,
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

function snapshot(row: HrEmployeeRecord) {
  return {
    branchId: row.branchId,
    employeeNumber: row.employeeNumber,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    employmentType: row.employmentType,
    hiredAt: row.hiredAt,
  };
}

async function writeEmployeeEvent(
  client: SupabaseClient,
  input: {
    employeeId: string;
    branchId: string;
    actorUserId: string;
    action: string;
    reason?: string | null;
    before?: HrEmployeeRecord | null;
    after?: HrEmployeeRecord | null;
  },
) {
  const { error } = await client.from("hr_employee_events").insert({
    employee_id: input.employeeId,
    branch_id: input.branchId,
    actor_user_id: input.actorUserId,
    action: input.action,
    reason: input.reason ?? null,
    before_state: input.before ? snapshot(input.before) : null,
    after_state: input.after ? snapshot(input.after) : null,
  });
  if (error) {
    // Soft-fail audit only when table missing during rollout; otherwise surface.
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return;
    throw new ApiError(500, "HR_EMPLOYEE_EVENT_FAILED", error.message);
  }
}

export function createHrEmployeesService(envStatus: EnvironmentStatus): HrEmployeesService {
  const supabase = () => createServiceClient(envStatus);

  async function loadEmployee(client: SupabaseClient, employeeId: string): Promise<HrEmployeeRecord> {
    const { data, error } = await client.from("hr_employees").select(SELECT).eq("id", employeeId).maybeSingle();
    if (error) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", error.message);
    if (!data) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
    return mapRow(data as unknown as EmployeeRow);
  }

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

    async getEmployee(scope, employeeId) {
      const client = supabase();
      const row = await loadEmployee(client, employeeId);
      assertBranchMembership(scope, row.branchId);
      return row;
    },

    async createEmployee(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);

      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const email = input.email.trim().toLowerCase();
      const fullName = input.fullName.trim();
      const role = input.role.trim();
      const phone = input.phone?.trim() || null;
      const status = input.status ?? "active";
      const hiredAt = input.hiredAt?.trim() || null;
      const employeeNumber = input.employeeNumber?.trim() || null;
      const employmentType = input.employmentType ?? null;
      const emergencyContactName = input.emergencyContactName?.trim() || null;
      const emergencyContactPhone = input.emergencyContactPhone?.trim() || null;

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
          employee_number: employeeNumber,
          employment_type: employmentType,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
        })
        .select(SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "HR_EMPLOYEE_EXISTS",
            "An employee with this email or employee number already exists for the branch.",
          );
        }
        throw new ApiError(500, "HR_EMPLOYEE_CREATE_FAILED", error.message);
      }

      const created = mapRow(data as unknown as EmployeeRow);
      await writeEmployeeEvent(client, {
        employeeId: created.id,
        branchId: created.branchId,
        actorUserId,
        action: "employee.create",
        after: created,
      });
      return created;
    },

    async patchEmployee(scope, actorUserId, employeeId, input) {
      const client = supabase();
      const before = await loadEmployee(client, employeeId);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "terminated" || before.status === "inactive") {
        const onlyTransfer = input.branchId && Object.keys(input).every((k) => k === "branchId" || k === "transferReason");
        if (!onlyTransfer) {
          // Allow contact updates on inactive for history accuracy, but block reactivation via patch.
          if (input.role !== undefined || input.employeeNumber !== undefined) {
            // still allow non-status field updates
          }
        }
      }

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      let action = "employee.update";
      let reason: string | null = null;

      if (input.fullName !== undefined) {
        const fullName = input.fullName.trim();
        if (!fullName) throw new ApiError(400, "VALIDATION_ERROR", "Full name is required.");
        patch.full_name = fullName;
      }
      if (input.email !== undefined) {
        const email = input.email.trim().toLowerCase();
        if (!email) throw new ApiError(400, "VALIDATION_ERROR", "Email is required.");
        patch.email = email;
      }
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.role !== undefined) {
        const role = input.role.trim();
        if (!role) throw new ApiError(400, "VALIDATION_ERROR", "Role is required.");
        patch.role = role;
        if (role !== before.role) action = "employee.role_change";
      }
      if (input.hiredAt !== undefined) patch.hired_at = input.hiredAt?.trim() || null;
      if (input.employeeNumber !== undefined) patch.employee_number = input.employeeNumber?.trim() || null;
      if (input.employmentType !== undefined) patch.employment_type = input.employmentType;
      if (input.emergencyContactName !== undefined) {
        patch.emergency_contact_name = input.emergencyContactName?.trim() || null;
      }
      if (input.emergencyContactPhone !== undefined) {
        patch.emergency_contact_phone = input.emergencyContactPhone?.trim() || null;
      }

      if (input.branchId !== undefined && input.branchId !== before.branchId) {
        assertBranchMembership(scope, input.branchId);
        await loadBranchRow(client, input.branchId);
        const transferReason = input.transferReason?.trim();
        if (!transferReason) {
          throw new ApiError(400, "VALIDATION_ERROR", "transferReason is required when changing branch assignment.");
        }
        patch.branch_id = input.branchId;
        action = "employee.branch_transfer";
        reason = transferReason;
      }

      const mutableKeys = Object.keys(patch).filter((k) => k !== "updated_at");
      if (mutableKeys.length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No mutable fields provided.");
      }

      const { data, error } = await client
        .from("hr_employees")
        .update(patch)
        .eq("id", employeeId)
        .select(SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "HR_EMPLOYEE_EXISTS",
            "An employee with this email or employee number already exists for the branch.",
          );
        }
        throw new ApiError(500, "HR_EMPLOYEE_UPDATE_FAILED", error.message);
      }

      const after = mapRow(data as unknown as EmployeeRow);
      await writeEmployeeEvent(client, {
        employeeId,
        branchId: after.branchId,
        actorUserId,
        action,
        reason,
        before,
        after,
      });
      return after;
    },

    async deactivateEmployee(scope, actorUserId, employeeId, input) {
      const reason = input.reason.trim();
      if (!reason) {
        throw new ApiError(400, "VALIDATION_ERROR", "Deactivation reason is required.");
      }
      const status = input.status ?? "inactive";
      const client = supabase();
      const before = await loadEmployee(client, employeeId);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "terminated") {
        throw new ApiError(409, "HR_EMPLOYEE_ALREADY_TERMINATED", "Employee is already terminated.");
      }
      if (before.status === "inactive" && status === "inactive") {
        throw new ApiError(409, "HR_EMPLOYEE_ALREADY_INACTIVE", "Employee is already inactive.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_employees")
        .update({
          status,
          deactivation_reason: reason,
          deactivated_by: actorUserId,
          deactivated_at: now,
          updated_at: now,
        })
        .eq("id", employeeId)
        .select(SELECT)
        .single();

      if (error) throw new ApiError(500, "HR_EMPLOYEE_DEACTIVATE_FAILED", error.message);

      const after = mapRow(data as unknown as EmployeeRow);
      await writeEmployeeEvent(client, {
        employeeId,
        branchId: after.branchId,
        actorUserId,
        action: status === "terminated" ? "employee.terminate" : "employee.deactivate",
        reason,
        before,
        after,
      });
      return after;
    },

    async reactivateEmployee(scope, actorUserId, employeeId, reason) {
      const client = supabase();
      const before = await loadEmployee(client, employeeId);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "active") {
        throw new ApiError(409, "HR_EMPLOYEE_ALREADY_ACTIVE", "Employee is already active.");
      }
      if (before.status === "terminated") {
        throw new ApiError(
          409,
          "HR_EMPLOYEE_TERMINATED",
          "Terminated employees cannot be reactivated; create a new employee record.",
        );
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_employees")
        .update({
          status: "active",
          deactivation_reason: null,
          deactivated_by: null,
          deactivated_at: null,
          updated_at: now,
        })
        .eq("id", employeeId)
        .select(SELECT)
        .single();

      if (error) throw new ApiError(500, "HR_EMPLOYEE_REACTIVATE_FAILED", error.message);

      const after = mapRow(data as unknown as EmployeeRow);
      await writeEmployeeEvent(client, {
        employeeId,
        branchId: after.branchId,
        actorUserId,
        action: "employee.reactivate",
        reason: reason?.trim() || null,
        before,
        after,
      });
      return after;
    },
  };
}
