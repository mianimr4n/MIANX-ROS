import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import {
  createSignedDownloadUrl,
  uploadDocumentBytes,
  writeDocumentAccessEvent,
} from "../documents/storage.js";
import { HR_DOC_BUCKET, resolveDocMaxBytes } from "../documents/validation.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"] as const;
export type HrAttendanceStatus = (typeof HR_ATTENDANCE_STATUSES)[number];

export const HR_LEAVE_TYPES = ["CASUAL", "SICK", "ANNUAL"] as const;
export type HrLeaveType = (typeof HR_LEAVE_TYPES)[number];

export const HR_LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type HrLeaveStatus = (typeof HR_LEAVE_STATUSES)[number];

export const HR_DOCUMENT_TYPES = ["CNIC", "CONTRACT", "CERTIFICATE", "POLICY", "OTHER"] as const;
export type HrDocumentType = (typeof HR_DOCUMENT_TYPES)[number];

export const HR_CORRECTION_STATUSES = ["pending", "approved", "rejected"] as const;
export type HrCorrectionStatus = (typeof HR_CORRECTION_STATUSES)[number];

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
  scheduledShiftId: string | null;
  isUnscheduled: boolean;
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
  scheduledShiftId?: string | null;
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
  rejectionReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  leaveBalanceConfigured: false;
  leaveBalanceMessage: string;
  overlappingPublishedShifts: number;
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
  rejectionReason?: string | null;
}

export interface HrEmployeeDocumentRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  documentType: HrDocumentType;
  fileUrl: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  checksumSha256: string | null;
  originalFilename: string | null;
  hasBinary: boolean;
  status: string;
  uploadedAt: string;
  createdAt: string;
  expiryTrackingAvailable: false;
}

export interface CreateHrDocumentInput {
  documentType: HrDocumentType;
  fileUrl: string;
}

export interface UploadHrDocumentBinaryInput {
  documentType: HrDocumentType;
  dataBase64: string;
  contentType: string;
  originalFilename?: string | null;
  title?: string | null;
  requestId?: string | null;
}

export interface HrAttendanceCorrectionRecord {
  id: string;
  attendanceId: string;
  branchId: string;
  employeeId: string;
  employeeName: string | null;
  requestedBy: string | null;
  reviewedBy: string | null;
  status: HrCorrectionStatus;
  reason: string;
  rejectionReason: string | null;
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  originalStatus: string | null;
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  proposedStatus: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface CreateAttendanceCorrectionInput {
  attendanceId: string;
  reason: string;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  proposedStatus?: HrAttendanceStatus | null;
}

export interface DecideAttendanceCorrectionInput {
  status: "approved" | "rejected";
  rejectionReason?: string | null;
}

export interface WorkforceMetricsSnapshot {
  branchId: string | null;
  state: "available" | "unavailable";
  unavailableReason: string | null;
  asOfDate: string;
  activeEmployees: number;
  employeesScheduledToday: number;
  employeesClockedIn: number;
  lateArrivalsToday: number;
  absencesToday: number;
  openAttendanceSessions: number;
  shiftsRequiringCoverage: number;
  scheduledLabourHours: number | null;
  actualLabourHours: number | null;
  approvedLeaveToday: number;
  incompleteMandatoryTraining: null;
  incompleteMandatoryTrainingMessage: string;
  expiringDocuments: null;
  expiringDocumentsMessage: string;
  labourCost: null;
  labourCostMessage: string;
}

export interface WorkforceAttentionSnapshot {
  branchId: string | null;
  state: "available" | "unavailable";
  unavailableReason: string | null;
  absentEmployees: number;
  lateArrivals: number;
  uncoveredShifts: number;
  openAttendanceSessions: number;
  attendanceCorrectionsAwaitingApproval: number;
  leaveRequestsAwaitingApproval: number;
  incompleteMandatoryTraining: null;
  incompleteMandatoryTrainingMessage: string;
  expiringOrMissingDocuments: null;
  expiringOrMissingDocumentsMessage: string;
  payrollRunsAwaitingApproval: number;
}

export interface HrWorkforceService {
  listAttendance(scope: BranchActorScope, branchId?: string): Promise<HrAttendanceRecord[]>;
  createAttendance(scope: BranchActorScope, input: CreateHrAttendanceInput): Promise<HrAttendanceRecord>;
  listLeaves(scope: BranchActorScope, branchId?: string): Promise<HrLeaveRequestRecord[]>;
  createLeave(scope: BranchActorScope, actorUserId: string, input: CreateHrLeaveInput): Promise<HrLeaveRequestRecord>;
  decideLeave(
    scope: BranchActorScope,
    actorUserId: string,
    leaveId: string,
    input: DecideHrLeaveInput,
  ): Promise<HrLeaveRequestRecord>;
  cancelLeave(
    scope: BranchActorScope,
    actorUserId: string,
    leaveId: string,
    reason?: string | null,
  ): Promise<HrLeaveRequestRecord>;
  listDocuments(
    scope: BranchActorScope,
    query?: { branchId?: string; employeeId?: string },
  ): Promise<HrEmployeeDocumentRecord[]>;
  createDocument(
    scope: BranchActorScope,
    employeeId: string,
    input: CreateHrDocumentInput,
  ): Promise<HrEmployeeDocumentRecord>;
  uploadDocumentBinary(
    scope: BranchActorScope,
    actorUserId: string,
    employeeId: string,
    input: UploadHrDocumentBinaryInput,
  ): Promise<HrEmployeeDocumentRecord>;
  createDocumentDownloadUrl(
    scope: BranchActorScope,
    actorUserId: string,
    documentId: string,
    requestId?: string | null,
  ): Promise<{ url: string; expiresInSeconds: number }>;
  listCorrections(
    scope: BranchActorScope,
    query?: { branchId?: string; status?: HrCorrectionStatus },
  ): Promise<HrAttendanceCorrectionRecord[]>;
  createCorrection(
    scope: BranchActorScope,
    actorUserId: string,
    input: CreateAttendanceCorrectionInput,
  ): Promise<HrAttendanceCorrectionRecord>;
  decideCorrection(
    scope: BranchActorScope,
    actorUserId: string,
    correctionId: string,
    input: DecideAttendanceCorrectionInput,
  ): Promise<HrAttendanceCorrectionRecord>;
  getMetrics(scope: BranchActorScope, branchId?: string): Promise<WorkforceMetricsSnapshot>;
  getAttention(scope: BranchActorScope, branchId?: string): Promise<WorkforceAttentionSnapshot>;
}

type AttendanceRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  scheduled_shift_id?: string | null;
  is_unscheduled?: boolean | null;
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
  rejection_reason?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
  employee: { id: string; full_name: string } | null;
};

type DocumentRow = {
  id: string;
  employee_id: string;
  document_type: string;
  file_url: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  checksum_sha256?: string | null;
  original_filename?: string | null;
  storage_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  uploaded_at: string;
  created_at: string;
  employee: { id: string; full_name: string; branch_id: string } | null;
};

type CorrectionRow = {
  id: string;
  attendance_id: string;
  branch_id: string;
  employee_id: string;
  requested_by: string | null;
  reviewed_by: string | null;
  status: string;
  reason: string;
  rejection_reason: string | null;
  original_check_in: string | null;
  original_check_out: string | null;
  original_status: string | null;
  proposed_check_in: string | null;
  proposed_check_out: string | null;
  proposed_status: string | null;
  created_at: string;
  reviewed_at: string | null;
  employee: { id: string; full_name: string } | null;
};

const ATTENDANCE_SELECT =
  "id, employee_id, branch_id, check_in_time, check_out_time, status, scheduled_shift_id, is_unscheduled, created_at, updated_at, branch:branches(id, branch_code, name), employee:hr_employees(id, full_name)";

const LEAVE_SELECT =
  "id, employee_id, branch_id, start_date, end_date, leave_type, status, reason, rejection_reason, decided_by, decided_at, created_at, updated_at, branch:branches(id, branch_code, name), employee:hr_employees(id, full_name)";

const DOCUMENT_SELECT =
  "id, employee_id, document_type, file_url, mime_type, file_size_bytes, checksum_sha256, original_filename, storage_path, storage_bucket, status, uploaded_at, created_at, employee:hr_employees(id, full_name, branch_id)";

const CORRECTION_SELECT =
  "id, attendance_id, branch_id, employee_id, requested_by, reviewed_by, status, reason, rejection_reason, original_check_in, original_check_out, original_status, proposed_check_in, proposed_check_out, proposed_status, created_at, reviewed_at, employee:hr_employees(id, full_name)";

const LEAVE_BALANCE_MSG = "Leave balance is not configured.";
const TRAINING_MSG = "Mandatory training completion is not linked to HR employees yet.";
const DOC_EXPIRY_MSG = "Document expiry tracking is unavailable.";
const LABOUR_COST_MSG = "Labour cost is unavailable until compensation and verified time data are complete.";

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

/** Karachi calendar date YYYY-MM-DD */
export function karachiBusinessDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
    scheduledShiftId: row.scheduled_shift_id ?? null,
    isUnscheduled: Boolean(row.is_unscheduled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLeave(row: LeaveRow, overlappingPublishedShifts = 0): HrLeaveRequestRecord {
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
    rejectionReason: row.rejection_reason ?? null,
    decidedBy: row.decided_by ?? null,
    decidedAt: row.decided_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    leaveBalanceConfigured: false,
    leaveBalanceMessage: LEAVE_BALANCE_MSG,
    overlappingPublishedShifts,
  };
}

function mapDocument(row: DocumentRow): HrEmployeeDocumentRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    documentType: row.document_type as HrDocumentType,
    fileUrl: row.file_url,
    mimeType: row.mime_type ?? null,
    fileSizeBytes: row.file_size_bytes ?? null,
    checksumSha256: row.checksum_sha256 ?? null,
    originalFilename: row.original_filename ?? null,
    hasBinary: Boolean(row.storage_path),
    status: row.status ?? "active",
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    expiryTrackingAvailable: false,
  };
}

function mapCorrection(row: CorrectionRow): HrAttendanceCorrectionRecord {
  return {
    id: row.id,
    attendanceId: row.attendance_id,
    branchId: row.branch_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    requestedBy: row.requested_by,
    reviewedBy: row.reviewed_by,
    status: row.status as HrCorrectionStatus,
    reason: row.reason,
    rejectionReason: row.rejection_reason,
    originalCheckIn: row.original_check_in,
    originalCheckOut: row.original_check_out,
    originalStatus: row.original_status,
    proposedCheckIn: row.proposed_check_in,
    proposedCheckOut: row.proposed_check_out,
    proposedStatus: row.proposed_status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

async function loadEmployeeInBranch(
  client: SupabaseClient,
  employeeId: string,
  branchId: string,
): Promise<{ id: string; branch_id: string; full_name: string; status: string }> {
  const { data, error } = await client
    .from("hr_employees")
    .select("id, branch_id, full_name, status")
    .eq("id", employeeId)
    .maybeSingle();
  if (error) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", error.message);
  if (!data) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
  if (data.branch_id !== branchId) {
    throw new ApiError(400, "VALIDATION_ERROR", "Employee must belong to the same branch.");
  }
  return data;
}

async function writeLeaveEvent(
  client: SupabaseClient,
  input: {
    leaveId: string;
    branchId: string;
    actorUserId: string;
    action: string;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  const { error } = await client.from("hr_leave_events").insert({
    leave_request_id: input.leaveId,
    branch_id: input.branchId,
    actor_user_id: input.actorUserId,
    action: input.action,
    reason: input.reason ?? null,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
  });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return;
    throw new ApiError(500, "HR_LEAVE_EVENT_FAILED", error.message);
  }
}

export function hoursBetween(startIso: string | null, endIso: string | null, breakMinutes = 0): number | null {
  if (!startIso || !endIso) return null;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.max(0, (end - start) / 3_600_000 - breakMinutes / 60);
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
      const employee = await loadEmployeeInBranch(client, input.employeeId, input.branchId);

      if (employee.status !== "active" && employee.status !== "on_leave") {
        throw new ApiError(409, "HR_EMPLOYEE_INACTIVE", "Inactive or terminated employees cannot clock in.");
      }

      const action = input.action ?? (input.checkOutTime && !input.checkInTime ? "check_out" : "check_in");
      const serverNow = new Date().toISOString();

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
        const checkOutTime = input.checkOutTime?.trim() || serverNow;
        if (open.check_in_time && Date.parse(checkOutTime) < Date.parse(open.check_in_time)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Clock-out cannot precede clock-in.");
        }
        const { data, error } = await client
          .from("hr_attendance")
          .update({ check_out_time: checkOutTime, updated_at: serverNow })
          .eq("id", open.id)
          .select(ATTENDANCE_SELECT)
          .single();
        if (error) throw new ApiError(500, "HR_ATTENDANCE_UPDATE_FAILED", error.message);
        return mapAttendance(data as unknown as AttendanceRow);
      }

      // Prevent duplicate open sessions
      const { data: openExisting, error: openDupError } = await client
        .from("hr_attendance")
        .select("id")
        .eq("employee_id", input.employeeId)
        .eq("branch_id", input.branchId)
        .is("check_out_time", null)
        .limit(1);
      if (openDupError) throw new ApiError(500, "HR_ATTENDANCE_READ_FAILED", openDupError.message);
      if ((openExisting ?? []).length > 0) {
        throw new ApiError(409, "HR_ATTENDANCE_OPEN_EXISTS", "Employee already has an open attendance session.");
      }

      const status = input.status ?? "PRESENT";
      const checkInTime =
        status === "ABSENT" || status === "LEAVE"
          ? input.checkInTime?.trim() || null
          : input.checkInTime?.trim() || serverNow;
      const checkOutTime = input.checkOutTime?.trim() || null;
      if (checkInTime && checkOutTime && Date.parse(checkOutTime) < Date.parse(checkInTime)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Clock-out cannot precede clock-in.");
      }

      let scheduledShiftId = input.scheduledShiftId ?? null;
      let isUnscheduled = true;
      if (scheduledShiftId) {
        const { data: shift, error: shiftError } = await client
          .from("hr_scheduled_shifts")
          .select("id, employee_id, branch_id, status")
          .eq("id", scheduledShiftId)
          .maybeSingle();
        if (shiftError) throw new ApiError(500, "HR_SHIFT_READ_FAILED", shiftError.message);
        if (!shift || shift.employee_id !== input.employeeId || shift.branch_id !== input.branchId) {
          throw new ApiError(400, "VALIDATION_ERROR", "scheduledShiftId does not match employee/branch.");
        }
        isUnscheduled = false;
      } else {
        // Try to associate today's published shift without fabricating
        const today = karachiBusinessDate();
        const { data: todayShifts } = await client
          .from("hr_scheduled_shifts")
          .select("id")
          .eq("employee_id", input.employeeId)
          .eq("branch_id", input.branchId)
          .eq("shift_date", today)
          .in("status", ["published", "confirmed"])
          .limit(1);
        if ((todayShifts ?? []).length > 0) {
          scheduledShiftId = (todayShifts![0] as { id: string }).id;
          isUnscheduled = false;
        }
      }

      const { data, error } = await client
        .from("hr_attendance")
        .insert({
          employee_id: input.employeeId,
          branch_id: input.branchId,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          status,
          scheduled_shift_id: scheduledShiftId,
          is_unscheduled: isUnscheduled,
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
      let query = client.from("hr_leave_requests").select(LEAVE_SELECT).order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);
      const { data, error } = await query;
      if (error) throw new ApiError(500, "HR_LEAVE_READ_FAILED", error.message);
      return ((data ?? []) as unknown as LeaveRow[]).map((row) => mapLeave(row));
    },

    async createLeave(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      const employee = await loadEmployeeInBranch(client, input.employeeId, input.branchId);
      if (employee.status === "terminated" || employee.status === "inactive") {
        throw new ApiError(409, "HR_EMPLOYEE_INACTIVE", "Cannot submit leave for inactive or terminated employees.");
      }

      if (input.endDate < input.startDate) {
        throw new ApiError(400, "VALIDATION_ERROR", "endDate must be on or after startDate.");
      }

      // Overlap with approved leave
      const { data: approved, error: approvedError } = await client
        .from("hr_leave_requests")
        .select("id, start_date, end_date")
        .eq("employee_id", input.employeeId)
        .eq("status", "APPROVED");
      if (approvedError) throw new ApiError(500, "HR_LEAVE_READ_FAILED", approvedError.message);
      for (const row of approved ?? []) {
        if (row.start_date <= input.endDate && row.end_date >= input.startDate) {
          throw new ApiError(409, "HR_LEAVE_OVERLAP", "This leave overlaps an existing approved leave request.");
        }
      }

      const { data: shifts } = await client
        .from("hr_scheduled_shifts")
        .select("id")
        .eq("employee_id", input.employeeId)
        .in("status", ["published", "confirmed"])
        .gte("shift_date", input.startDate)
        .lte("shift_date", input.endDate);
      const overlappingPublishedShifts = (shifts ?? []).length;

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

      const created = mapLeave(data as unknown as LeaveRow, overlappingPublishedShifts);
      await writeLeaveEvent(client, {
        leaveId: created.id,
        branchId: created.branchId,
        actorUserId,
        action: "leave.submit",
        after: created,
      });
      return created;
    },

    async decideLeave(scope, actorUserId, leaveId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_leave_requests")
        .select(LEAVE_SELECT)
        .eq("id", leaveId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_LEAVE_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_LEAVE_NOT_FOUND", "Leave request not found.");
      const before = mapLeave(existing as unknown as LeaveRow);
      assertBranchMembership(scope, before.branchId);
      if (before.status !== "PENDING") {
        throw new ApiError(409, "HR_LEAVE_ALREADY_DECIDED", "Leave request is no longer pending.");
      }

      if (input.status === "REJECTED") {
        const rejectionReason = input.rejectionReason?.trim();
        if (!rejectionReason) {
          throw new ApiError(400, "VALIDATION_ERROR", "rejectionReason is required when rejecting leave.");
        }
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_leave_requests")
        .update({
          status: input.status,
          rejection_reason: input.status === "REJECTED" ? input.rejectionReason!.trim() : null,
          decided_by: actorUserId,
          decided_at: now,
          updated_at: now,
        })
        .eq("id", leaveId)
        .select(LEAVE_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_LEAVE_UPDATE_FAILED", error.message);

      const after = mapLeave(data as unknown as LeaveRow);
      await writeLeaveEvent(client, {
        leaveId,
        branchId: after.branchId,
        actorUserId,
        action: input.status === "APPROVED" ? "leave.approve" : "leave.reject",
        reason: input.rejectionReason?.trim() || null,
        before,
        after,
      });
      return after;
    },

    async cancelLeave(scope, actorUserId, leaveId, reason) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_leave_requests")
        .select(LEAVE_SELECT)
        .eq("id", leaveId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_LEAVE_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_LEAVE_NOT_FOUND", "Leave request not found.");
      const before = mapLeave(existing as unknown as LeaveRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "CANCELLED") {
        throw new ApiError(409, "HR_LEAVE_ALREADY_CANCELLED", "Leave request is already cancelled.");
      }
      if (before.status === "REJECTED") {
        throw new ApiError(409, "HR_LEAVE_REJECTED", "Rejected leave cannot be cancelled.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_leave_requests")
        .update({ status: "CANCELLED", updated_at: now })
        .eq("id", leaveId)
        .select(LEAVE_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_LEAVE_UPDATE_FAILED", error.message);

      const after = mapLeave(data as unknown as LeaveRow);
      await writeLeaveEvent(client, {
        leaveId,
        branchId: after.branchId,
        actorUserId,
        action: "leave.cancel",
        reason: reason?.trim() || null,
        before,
        after,
      });
      return after;
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
          status: "active",
        })
        .select(DOCUMENT_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_DOCUMENT_CREATE_FAILED", error.message);
      return mapDocument(data as unknown as DocumentRow);
    },

    async uploadDocumentBinary(scope, actorUserId, employeeId, input) {
      const client = supabase();
      const { data: emp, error: empError } = await client
        .from("hr_employees")
        .select("id, branch_id")
        .eq("id", employeeId)
        .maybeSingle();
      if (empError) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empError.message);
      if (!emp) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
      assertBranchMembership(scope, emp.branch_id);

      const stored = await uploadDocumentBytes({
        supabase: client,
        bucket: HR_DOC_BUCKET,
        tenantKey: emp.branch_id,
        dataBase64: input.dataBase64,
        contentType: input.contentType,
        originalFilename: input.originalFilename,
        maxBytes: resolveDocMaxBytes(),
        requestId: input.requestId ?? undefined,
      });

      const { data, error } = await client
        .from("hr_employee_documents")
        .insert({
          employee_id: employeeId,
          document_type: input.documentType,
          file_url: null,
          mime_type: stored.mime,
          file_size_bytes: stored.sizeBytes,
          checksum_sha256: stored.checksumSha256,
          original_filename: stored.safeOriginalFilename,
          storage_bucket: stored.bucket,
          storage_path: stored.storagePath,
          title: input.title?.trim() || null,
          uploaded_by: actorUserId,
          status: "active",
        })
        .select(DOCUMENT_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_DOCUMENT_CREATE_FAILED", error.message);

      await writeDocumentAccessEvent({
        supabase: client,
        documentDomain: "hr",
        documentId: String((data as { id: string }).id),
        action: "upload",
        actorUserId,
        branchId: emp.branch_id,
        employeeId,
        requestId: input.requestId,
        metadata: { mime: stored.mime, sizeBytes: stored.sizeBytes },
      });

      return mapDocument(data as unknown as DocumentRow);
    },

    async createDocumentDownloadUrl(scope, actorUserId, documentId, requestId) {
      const client = supabase();
      const { data, error } = await client
        .from("hr_employee_documents")
        .select(DOCUMENT_SELECT)
        .eq("id", documentId)
        .maybeSingle();
      if (error) throw new ApiError(500, "HR_DOCUMENTS_READ_FAILED", error.message);
      if (!data) throw new ApiError(404, "HR_DOCUMENT_NOT_FOUND", "Document not found.");
      const row = data as unknown as DocumentRow;
      const branchId = row.employee?.branch_id;
      if (!branchId) throw new ApiError(404, "HR_DOCUMENT_NOT_FOUND", "Document not found.");
      assertBranchMembership(scope, branchId);
      if (row.status === "archived") {
        throw new ApiError(409, "DOCUMENT_ARCHIVED", "Document is archived.");
      }

      if (!row.storage_path) {
        if (!row.file_url) throw new ApiError(404, "DOCUMENT_UNAVAILABLE", "No downloadable file.");
        await writeDocumentAccessEvent({
          supabase: client,
          documentDomain: "hr",
          documentId,
          action: "download",
          actorUserId,
          branchId,
          employeeId: row.employee_id,
          requestId,
          metadata: { mode: "url_reference" },
        });
        return { url: row.file_url, expiresInSeconds: 0 };
      }

      const url = await createSignedDownloadUrl({
        supabase: client,
        bucket: row.storage_bucket ?? HR_DOC_BUCKET,
        storagePath: row.storage_path,
        expiresInSeconds: 120,
      });
      await writeDocumentAccessEvent({
        supabase: client,
        documentDomain: "hr",
        documentId,
        action: "download",
        actorUserId,
        branchId,
        employeeId: row.employee_id,
        requestId,
        metadata: { mode: "signed" },
      });
      return { url, expiresInSeconds: 120 };
    },

    async listCorrections(scope, query) {
      const branchScope = resolveListBranchIds(scope, typeof query === "string" ? query : query?.branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let q = client
        .from("hr_attendance_corrections")
        .select(CORRECTION_SELECT)
        .order("created_at", { ascending: false });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const status = typeof query === "object" ? query?.status : undefined;
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new ApiError(500, "HR_CORRECTION_READ_FAILED", error.message);
      return ((data ?? []) as unknown as CorrectionRow[]).map(mapCorrection);
    },

    async createCorrection(scope, actorUserId, input) {
      const reason = input.reason.trim();
      if (!reason) throw new ApiError(400, "VALIDATION_ERROR", "Correction reason is required.");

      const client = supabase();
      const { data: attendance, error: attError } = await client
        .from("hr_attendance")
        .select(ATTENDANCE_SELECT)
        .eq("id", input.attendanceId)
        .maybeSingle();
      if (attError) throw new ApiError(500, "HR_ATTENDANCE_READ_FAILED", attError.message);
      if (!attendance) throw new ApiError(404, "HR_ATTENDANCE_NOT_FOUND", "Attendance record not found.");
      const att = mapAttendance(attendance as unknown as AttendanceRow);
      assertBranchMembership(scope, att.branchId);

      const proposedCheckIn = input.proposedCheckIn ?? null;
      const proposedCheckOut = input.proposedCheckOut ?? null;
      if (proposedCheckIn && proposedCheckOut && Date.parse(proposedCheckOut) < Date.parse(proposedCheckIn)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Proposed clock-out cannot precede proposed clock-in.");
      }

      const { data, error } = await client
        .from("hr_attendance_corrections")
        .insert({
          attendance_id: att.id,
          branch_id: att.branchId,
          employee_id: att.employeeId,
          requested_by: actorUserId,
          status: "pending",
          reason,
          original_check_in: att.checkInTime,
          original_check_out: att.checkOutTime,
          original_status: att.status,
          proposed_check_in: proposedCheckIn,
          proposed_check_out: proposedCheckOut,
          proposed_status: input.proposedStatus ?? null,
        })
        .select(CORRECTION_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_CORRECTION_CREATE_FAILED", error.message);
      return mapCorrection(data as unknown as CorrectionRow);
    },

    async decideCorrection(scope, actorUserId, correctionId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_attendance_corrections")
        .select(CORRECTION_SELECT)
        .eq("id", correctionId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_CORRECTION_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_CORRECTION_NOT_FOUND", "Correction request not found.");
      const before = mapCorrection(existing as unknown as CorrectionRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status !== "pending") {
        throw new ApiError(409, "HR_CORRECTION_ALREADY_DECIDED", "Correction is no longer pending.");
      }

      if (input.status === "rejected") {
        const rejectionReason = input.rejectionReason?.trim();
        if (!rejectionReason) {
          throw new ApiError(400, "VALIDATION_ERROR", "rejectionReason is required when rejecting a correction.");
        }
      }

      const now = new Date().toISOString();

      if (input.status === "approved") {
        // Apply proposed values to attendance — original values remain on the correction row
        const attPatch: Record<string, unknown> = { updated_at: now };
        if (before.proposedCheckIn !== null) attPatch.check_in_time = before.proposedCheckIn;
        if (before.proposedCheckOut !== null) attPatch.check_out_time = before.proposedCheckOut;
        if (before.proposedStatus !== null) attPatch.status = before.proposedStatus;

        const { error: applyError } = await client
          .from("hr_attendance")
          .update(attPatch)
          .eq("id", before.attendanceId);
        if (applyError) throw new ApiError(500, "HR_ATTENDANCE_UPDATE_FAILED", applyError.message);
      }

      const { data, error } = await client
        .from("hr_attendance_corrections")
        .update({
          status: input.status,
          rejection_reason: input.status === "rejected" ? input.rejectionReason!.trim() : null,
          reviewed_by: actorUserId,
          reviewed_at: now,
        })
        .eq("id", correctionId)
        .select(CORRECTION_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_CORRECTION_UPDATE_FAILED", error.message);
      return mapCorrection(data as unknown as CorrectionRow);
    },

    async getMetrics(scope, branchId) {
      try {
        const branchScope = resolveListBranchIds(scope, branchId);
        if (branchScope === "none") {
          return emptyMetrics(branchId ?? null);
        }
        const client = supabase();
        const today = karachiBusinessDate();

        let empQ = client.from("hr_employees").select("id, status");
        let shiftQ = client
          .from("hr_scheduled_shifts")
          .select("id, employee_id, starts_at, ends_at, break_minutes, status")
          .eq("shift_date", today);
        let attQ = client
          .from("hr_attendance")
          .select("id, employee_id, check_in_time, check_out_time, status, created_at");
        let leaveQ = client
          .from("hr_leave_requests")
          .select("id, status, start_date, end_date")
          .eq("status", "APPROVED")
          .lte("start_date", today)
          .gte("end_date", today);

        if (branchScope !== "all") {
          empQ = empQ.in("branch_id", branchScope);
          shiftQ = shiftQ.in("branch_id", branchScope);
          attQ = attQ.in("branch_id", branchScope);
          leaveQ = leaveQ.in("branch_id", branchScope);
        }

        const [empRes, shiftRes, attRes, leaveRes] = await Promise.all([empQ, shiftQ, attQ, leaveQ]);
        if (empRes.error) throw empRes.error;
        if (shiftRes.error) throw shiftRes.error;
        if (attRes.error) throw attRes.error;
        if (leaveRes.error) throw leaveRes.error;

        const employees = empRes.data ?? [];
        const shifts = shiftRes.data ?? [];
        const attendance = attRes.data ?? [];
        const leaves = leaveRes.data ?? [];

        const activeEmployees = employees.filter((e) => e.status === "active").length;
        const activeShifts = shifts.filter((s) => s.status !== "cancelled");
        const scheduledIds = new Set(activeShifts.map((s) => s.employee_id as string));
        const publishedUncovered = activeShifts.filter(
          (s) => s.status === "published" || s.status === "confirmed",
        );

        const todayAtt = attendance.filter((a) => {
          const t = a.check_in_time ?? a.created_at;
          return t && String(t).slice(0, 10) === today;
        });

        const openSessions = attendance.filter((a) => a.check_in_time && !a.check_out_time).length;
        const lateArrivalsToday = todayAtt.filter((a) => a.status === "LATE").length;
        const absencesToday = todayAtt.filter((a) => a.status === "ABSENT").length;
        const clockedIn = new Set(
          attendance.filter((a) => a.check_in_time && !a.check_out_time).map((a) => a.employee_id as string),
        ).size;

        let scheduledLabourHours = 0;
        for (const s of activeShifts) {
          const h = hoursBetween(s.starts_at as string, s.ends_at as string, Number(s.break_minutes ?? 0));
          if (h != null) scheduledLabourHours += h;
        }

        let actualLabourHours = 0;
        let actualComplete = true;
        for (const a of todayAtt) {
          if (!a.check_in_time || !a.check_out_time) {
            if (a.status !== "ABSENT" && a.status !== "LEAVE") actualComplete = false;
            continue;
          }
          const h = hoursBetween(a.check_in_time as string, a.check_out_time as string, 0);
          if (h != null) actualLabourHours += h;
        }

        return {
          branchId: branchId ?? null,
          state: "available" as const,
          unavailableReason: null,
          asOfDate: today,
          activeEmployees,
          employeesScheduledToday: scheduledIds.size,
          employeesClockedIn: clockedIn,
          lateArrivalsToday,
          absencesToday,
          openAttendanceSessions: openSessions,
          shiftsRequiringCoverage: publishedUncovered.length, // coverage gaps need richer roster; count published shifts as coverage demand signal
          scheduledLabourHours: Math.round(scheduledLabourHours * 100) / 100,
          actualLabourHours: actualComplete ? Math.round(actualLabourHours * 100) / 100 : null,
          approvedLeaveToday: leaves.length,
          incompleteMandatoryTraining: null,
          incompleteMandatoryTrainingMessage: TRAINING_MSG,
          expiringDocuments: null,
          expiringDocumentsMessage: DOC_EXPIRY_MSG,
          labourCost: null,
          labourCostMessage: LABOUR_COST_MSG,
        };
      } catch (error) {
        return {
          ...emptyMetrics(branchId ?? null),
          state: "unavailable" as const,
          unavailableReason: error instanceof Error ? error.message : "Workforce metrics unavailable.",
        };
      }
    },

    async getAttention(scope, branchId) {
      try {
        const metrics = await this.getMetrics(scope, branchId);
        if (metrics.state === "unavailable") {
          return {
            branchId: branchId ?? null,
            state: "unavailable" as const,
            unavailableReason: metrics.unavailableReason,
            absentEmployees: 0,
            lateArrivals: 0,
            uncoveredShifts: 0,
            openAttendanceSessions: 0,
            attendanceCorrectionsAwaitingApproval: 0,
            leaveRequestsAwaitingApproval: 0,
            incompleteMandatoryTraining: null,
            incompleteMandatoryTrainingMessage: TRAINING_MSG,
            expiringOrMissingDocuments: null,
            expiringOrMissingDocumentsMessage: DOC_EXPIRY_MSG,
            payrollRunsAwaitingApproval: 0,
          };
        }

        const branchScope = resolveListBranchIds(scope, branchId);
        const client = supabase();
        let corrQ = client.from("hr_attendance_corrections").select("id").eq("status", "pending");
        let leaveQ = client.from("hr_leave_requests").select("id").eq("status", "PENDING");
        let payQ = client.from("hr_payroll_runs").select("id").in("status", ["under_review", "calculated"]);

        if (branchScope !== "all" && branchScope !== "none") {
          corrQ = corrQ.in("branch_id", branchScope);
          leaveQ = leaveQ.in("branch_id", branchScope);
          payQ = payQ.in("branch_id", branchScope);
        }

        const [corrRes, leaveRes, payRes] = await Promise.all([
          branchScope === "none" ? Promise.resolve({ data: [], error: null }) : corrQ,
          branchScope === "none" ? Promise.resolve({ data: [], error: null }) : leaveQ,
          branchScope === "none" ? Promise.resolve({ data: [], error: null }) : payQ,
        ]);

        return {
          branchId: branchId ?? null,
          state: "available" as const,
          unavailableReason: null,
          absentEmployees: metrics.absencesToday,
          lateArrivals: metrics.lateArrivalsToday,
          uncoveredShifts: metrics.shiftsRequiringCoverage,
          openAttendanceSessions: metrics.openAttendanceSessions,
          attendanceCorrectionsAwaitingApproval: (corrRes.data ?? []).length,
          leaveRequestsAwaitingApproval: (leaveRes.data ?? []).length,
          incompleteMandatoryTraining: null,
          incompleteMandatoryTrainingMessage: TRAINING_MSG,
          expiringOrMissingDocuments: null,
          expiringOrMissingDocumentsMessage: DOC_EXPIRY_MSG,
          payrollRunsAwaitingApproval: payRes.error ? 0 : (payRes.data ?? []).length,
        };
      } catch (error) {
        return {
          branchId: branchId ?? null,
          state: "unavailable" as const,
          unavailableReason: error instanceof Error ? error.message : "Workforce attention unavailable.",
          absentEmployees: 0,
          lateArrivals: 0,
          uncoveredShifts: 0,
          openAttendanceSessions: 0,
          attendanceCorrectionsAwaitingApproval: 0,
          leaveRequestsAwaitingApproval: 0,
          incompleteMandatoryTraining: null,
          incompleteMandatoryTrainingMessage: TRAINING_MSG,
          expiringOrMissingDocuments: null,
          expiringOrMissingDocumentsMessage: DOC_EXPIRY_MSG,
          payrollRunsAwaitingApproval: 0,
        };
      }
    },
  };
}

function emptyMetrics(branchId: string | null): WorkforceMetricsSnapshot {
  return {
    branchId,
    state: "available",
    unavailableReason: null,
    asOfDate: karachiBusinessDate(),
    activeEmployees: 0,
    employeesScheduledToday: 0,
    employeesClockedIn: 0,
    lateArrivalsToday: 0,
    absencesToday: 0,
    openAttendanceSessions: 0,
    shiftsRequiringCoverage: 0,
    scheduledLabourHours: 0,
    actualLabourHours: 0,
    approvedLeaveToday: 0,
    incompleteMandatoryTraining: null,
    incompleteMandatoryTrainingMessage: TRAINING_MSG,
    expiringDocuments: null,
    expiringDocumentsMessage: DOC_EXPIRY_MSG,
    labourCost: null,
    labourCostMessage: LABOUR_COST_MSG,
  };
}
