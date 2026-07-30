import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"] as const;
export type HrAttendanceStatus = (typeof HR_ATTENDANCE_STATUSES)[number];

export const HR_LEAVE_TYPES = ["CASUAL", "SICK", "ANNUAL"] as const;
export type HrLeaveType = (typeof HR_LEAVE_TYPES)[number];

export const HR_LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type HrLeaveStatus = (typeof HR_LEAVE_STATUSES)[number];

export const HR_DOCUMENT_TYPES = ["CNIC", "CONTRACT", "CERTIFICATE"] as const;
export type HrDocumentType = (typeof HR_DOCUMENT_TYPES)[number];

export interface HrAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: HrAttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHrAttendanceInput {
  employeeId: string;
  branchId: string;
  action?: "check_in" | "check_out";
  status?: HrAttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export interface HrLeaveRequestRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  startDate: string;
  endDate: string;
  leaveType: HrLeaveType;
  status: HrLeaveStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHrLeaveInput {
  employeeId: string;
  branchId: string;
  startDate: string;
  endDate: string;
  leaveType: HrLeaveType;
  reason?: string | null;
}

export interface DecideHrLeaveInput {
  status: "APPROVED" | "REJECTED";
}

export interface HrEmployeeDocumentRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  documentType: HrDocumentType;
  fileUrl: string;
  uploadedAt: string;
  createdAt: string;
}

export interface CreateHrDocumentInput {
  documentType: HrDocumentType;
  fileUrl: string;
}

export interface HrWorkforceService {
  listAttendance(scope: BranchActorScope, branchId?: string): Promise<HrAttendanceRecord[]>;
  createAttendance(scope: BranchActorScope, input: CreateHrAttendanceInput): Promise<HrAttendanceRecord>;
  listLeaves(scope: BranchActorScope, branchId?: string): Promise<HrLeaveRequestRecord[]>;
  createLeave(scope: BranchActorScope, input: CreateHrLeaveInput): Promise<HrLeaveRequestRecord>;
  decideLeave(scope: BranchActorScope, leaveId: string, input: DecideHrLeaveInput): Promise<HrLeaveRequestRecord>;
  listDocuments(
    scope: BranchActorScope,
    query?: { branchId?: string; employeeId?: string },
  ): Promise<HrEmployeeDocumentRecord[]>;
  createDocument(
    scope: BranchActorScope,
    employeeId: string,
    input: CreateHrDocumentInput,
  ): Promise<HrEmployeeDocumentRecord>;
}

type AttendanceRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
  employee: { id: string; full_name: string } | null;
};

type LeaveRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
  employee: { id: string; full_name: string } | null;
};

type DocumentRow = {
  id: string;
  employee_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
  created_at: string;
  employee: { id: string; full_name: string; branch_id: string } | null;
};

const ATTENDANCE_SELECT =
  "id, employee_id, branch_id, check_in_time, check_out_time, status, created_at, updated_at, branch:branches(id, branch_code, name), employee:hr_employees(id, full_name)";

const LEAVE_SELECT =
  "id, employee_id, branch_id, start_date, end_date, leave_type, status, reason, created_at, updated_at, branch:branches(id, branch_code, name), employee:hr_employees(id, full_name)";

const DOCUMENT_SELECT =
  "id, employee_id, document_type, file_url, uploaded_at, created_at, employee:hr_employees(id, full_name, branch_id)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function mapAttendance(row: AttendanceRow): HrAttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    status: row.status as HrAttendanceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLeave(row: LeaveRow): HrLeaveRequestRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    leaveType: row.leave_type as HrLeaveType,
    status: row.status as HrLeaveStatus,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: DocumentRow): HrEmployeeDocumentRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    documentType: row.document_type as HrDocumentType,
    fileUrl: row.file_url,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
  };
}

async function loadEmployeeInBranch(
  client: SupabaseClient,
  employeeId: string,
  branchId: string,
): Promise<{ id: string; branch_id: string; full_name: string }> {
  const { data, error } = await client
    .from("hr_employees")
    .select("id, branch_id, full_name")
    .eq("id", employeeId)
    .maybeSingle();
  if (error) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", error.message);
  if (!data) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
  if (data.branch_id !== branchId) {
    throw new ApiError(400, "VALIDATION_ERROR", "Employee must belong to the same branch.");
  }
  return data;
}

export function createHrWorkforceService(envStatus: EnvironmentStatus): HrWorkforceService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listAttendance(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let query = client
        .from("hr_attendance")
        .select(ATTENDANCE_SELECT)
        .order("check_in_time", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);
      const { data, error } = await query;
      if (error) throw new ApiError(500, "HR_ATTENDANCE_READ_FAILED", error.message);
      return ((data ?? []) as unknown as AttendanceRow[]).map(mapAttendance);
    },

    async createAttendance(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      await loadEmployeeInBranch(client, input.employeeId, input.branchId);

      const action = input.action ?? (input.checkOutTime && !input.checkInTime ? "check_out" : "check_in");

      if (action === "check_out") {
        const { data: openRows, error: openError } = await client
          .from("hr_attendance")
          .select(ATTENDANCE_SELECT)
          .eq("employee_id", input.employeeId)
          .eq("branch_id", input.branchId)
          .is("check_out_time", null)
          .order("check_in_time", { ascending: false, nullsFirst: false })
          .limit(1);
        if (openError) throw new ApiError(500, "HR_ATTENDANCE_READ_FAILED", openError.message);
        const open = ((openRows ?? []) as unknown as AttendanceRow[])[0];
        if (!open) {
          throw new ApiError(404, "HR_ATTENDANCE_OPEN_NOT_FOUND", "No open attendance record to check out.");
        }
        const checkOutTime = input.checkOutTime?.trim() || new Date().toISOString();
        const { data, error } = await client
          .from("hr_attendance")
          .update({ check_out_time: checkOutTime })
          .eq("id", open.id)
          .select(ATTENDANCE_SELECT)
          .single();
        if (error) throw new ApiError(500, "HR_ATTENDANCE_UPDATE_FAILED", error.message);
        return mapAttendance(data as unknown as AttendanceRow);
      }

      const status = input.status ?? "PRESENT";
      const checkInTime =
        status === "ABSENT" || status === "LEAVE"
          ? input.checkInTime?.trim() || null
          : input.checkInTime?.trim() || new Date().toISOString();
      const checkOutTime = input.checkOutTime?.trim() || null;

      const { data, error } = await client
        .from("hr_attendance")
        .insert({
          employee_id: input.employeeId,
          branch_id: input.branchId,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status,
        })
        .select(ATTENDANCE_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_ATTENDANCE_CREATE_FAILED", error.message);
      return mapAttendance(data as unknown as AttendanceRow);
    },

    async listLeaves(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let query = client
        .from("hr_leave_requests")
        .select(LEAVE_SELECT)
        .order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);
      const { data, error } = await query;
      if (error) throw new ApiError(500, "HR_LEAVE_READ_FAILED", error.message);
      return ((data ?? []) as unknown as LeaveRow[]).map(mapLeave);
    },

    async createLeave(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      await loadEmployeeInBranch(client, input.employeeId, input.branchId);

      if (input.endDate < input.startDate) {
        throw new ApiError(400, "VALIDATION_ERROR", "endDate must be on or after startDate.");
      }

      const { data, error } = await client
        .from("hr_leave_requests")
        .insert({
          employee_id: input.employeeId,
          branch_id: input.branchId,
          start_date: input.startDate,
          end_date: input.endDate,
          leave_type: input.leaveType,
          status: "PENDING",
          reason: input.reason?.trim() || null,
        })
        .select(LEAVE_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_LEAVE_CREATE_FAILED", error.message);
      return mapLeave(data as unknown as LeaveRow);
    },

    async decideLeave(scope, leaveId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_leave_requests")
        .select("id, branch_id, status")
        .eq("id", leaveId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_LEAVE_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_LEAVE_NOT_FOUND", "Leave request not found.");
      assertBranchMembership(scope, existing.branch_id);
      if (existing.status !== "PENDING") {
        throw new ApiError(409, "HR_LEAVE_ALREADY_DECIDED", "Leave request is no longer pending.");
      }

      const { data, error } = await client
        .from("hr_leave_requests")
        .update({ status: input.status })
        .eq("id", leaveId)
        .select(LEAVE_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_LEAVE_UPDATE_FAILED", error.message);
      return mapLeave(data as unknown as LeaveRow);
    },

    async listDocuments(scope, query) {
      const branchScope = resolveListBranchIds(scope, query?.branchId);
      if (branchScope === "none") return [];
      const client = supabase();

      let employeeIds: string[] | null = null;
      if (query?.employeeId) {
        const { data: emp, error: empError } = await client
          .from("hr_employees")
          .select("id, branch_id")
          .eq("id", query.employeeId)
          .maybeSingle();
        if (empError) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empError.message);
        if (!emp) return [];
        assertBranchMembership(scope, emp.branch_id);
        if (branchScope !== "all" && !branchScope.includes(emp.branch_id)) return [];
        employeeIds = [emp.id];
      } else if (branchScope !== "all") {
        const { data: emps, error: empError } = await client
          .from("hr_employees")
          .select("id")
          .in("branch_id", branchScope);
        if (empError) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empError.message);
        employeeIds = (emps ?? []).map((e) => e.id as string);
        if (employeeIds.length === 0) return [];
      }

      let docQuery = client
        .from("hr_employee_documents")
        .select(DOCUMENT_SELECT)
        .order("uploaded_at", { ascending: false });
      if (employeeIds) docQuery = docQuery.in("employee_id", employeeIds);
      const { data, error } = await docQuery;
      if (error) throw new ApiError(500, "HR_DOCUMENTS_READ_FAILED", error.message);
      return ((data ?? []) as unknown as DocumentRow[]).map(mapDocument);
    },

    async createDocument(scope, employeeId, input) {
      const client = supabase();
      const { data: emp, error: empError } = await client
        .from("hr_employees")
        .select("id, branch_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (empError) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empError.message);
      if (!emp) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
      assertBranchMembership(scope, emp.branch_id);

      const fileUrl = input.fileUrl.trim();
      if (!fileUrl) throw new ApiError(400, "VALIDATION_ERROR", "fileUrl is required.");

      const { data, error } = await client
        .from("hr_employee_documents")
        .insert({
          employee_id: employeeId,
          document_type: input.documentType,
          file_url: fileUrl,
        })
        .select(DOCUMENT_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_DOCUMENT_CREATE_FAILED", error.message);
      return mapDocument(data as unknown as DocumentRow);
    },
  };
}
