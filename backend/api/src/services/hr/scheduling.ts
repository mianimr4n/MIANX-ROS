import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_SHIFT_STATUSES = ["draft", "published", "confirmed", "completed", "cancelled"] as const;
export type HrShiftStatus = (typeof HR_SHIFT_STATUSES)[number];

export interface HrShiftTemplateRecord {
  id: string;
  branchId: string;
  name: string;
  operationalRole: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  daysOfWeek: number[];
  isActive: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftTemplateInput {
  branchId: string;
  name: string;
  operationalRole?: string | null;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  daysOfWeek?: number[];
  notes?: string | null;
}

export interface PatchShiftTemplateInput {
  name?: string;
  operationalRole?: string | null;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  daysOfWeek?: number[];
  isActive?: boolean;
  notes?: string | null;
}

export interface HrScheduledShiftRecord {
  id: string;
  branchId: string;
  employeeId: string;
  employeeName: string | null;
  templateId: string | null;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  operationalRole: string | null;
  status: HrShiftStatus;
  notes: string | null;
  createdBy: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  cancelReason: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledShiftInput {
  branchId: string;
  employeeId: string;
  templateId?: string | null;
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  breakMinutes?: number;
  operationalRole?: string | null;
  notes?: string | null;
  status?: "draft" | "published";
}

export interface PatchScheduledShiftInput {
  startsAt?: string;
  endsAt?: string;
  breakMinutes?: number;
  operationalRole?: string | null;
  notes?: string | null;
  changeReason?: string | null;
}

export interface HrSchedulingService {
  listTemplates(scope: BranchActorScope, branchId?: string): Promise<HrShiftTemplateRecord[]>;
  createTemplate(
    scope: BranchActorScope,
    actorUserId: string,
    input: CreateShiftTemplateInput,
  ): Promise<HrShiftTemplateRecord>;
  patchTemplate(
    scope: BranchActorScope,
    actorUserId: string,
    templateId: string,
    input: PatchShiftTemplateInput,
  ): Promise<HrShiftTemplateRecord>;
  listShifts(
    scope: BranchActorScope,
    query?: { branchId?: string; from?: string; to?: string; status?: HrShiftStatus; employeeId?: string },
  ): Promise<HrScheduledShiftRecord[]>;
  createShift(
    scope: BranchActorScope,
    actorUserId: string,
    input: CreateScheduledShiftInput,
  ): Promise<HrScheduledShiftRecord>;
  patchShift(
    scope: BranchActorScope,
    actorUserId: string,
    shiftId: string,
    input: PatchScheduledShiftInput,
  ): Promise<HrScheduledShiftRecord>;
  publishShift(scope: BranchActorScope, actorUserId: string, shiftId: string): Promise<HrScheduledShiftRecord>;
  cancelShift(
    scope: BranchActorScope,
    actorUserId: string,
    shiftId: string,
    reason: string,
  ): Promise<HrScheduledShiftRecord>;
}

type TemplateRow = {
  id: string;
  branch_id: string;
  name: string;
  operational_role: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  days_of_week: number[] | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ShiftRow = {
  id: string;
  branch_id: string;
  employee_id: string;
  template_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  operational_role: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  cancel_reason: string | null;
  change_reason: string | null;
  created_at: string;
  updated_at: string;
  employee: { id: string; full_name: string } | null;
};

const TEMPLATE_SELECT =
  "id, branch_id, name, operational_role, start_time, end_time, break_minutes, days_of_week, is_active, notes, created_by, created_at, updated_at";

const SHIFT_SELECT =
  "id, branch_id, employee_id, template_id, shift_date, starts_at, ends_at, break_minutes, operational_role, status, notes, created_by, published_by, published_at, cancel_reason, change_reason, created_at, updated_at, employee:hr_employees(id, full_name)";

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

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

function mapTemplate(row: TemplateRow): HrShiftTemplateRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    name: row.name,
    operationalRole: row.operational_role,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: row.break_minutes,
    daysOfWeek: row.days_of_week ?? [],
    isActive: row.is_active,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShift(row: ShiftRow): HrScheduledShiftRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    templateId: row.template_id,
    shiftDate: row.shift_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    breakMinutes: row.break_minutes,
    operationalRole: row.operational_role,
    status: row.status as HrShiftStatus,
    notes: row.notes,
    createdBy: row.created_by,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    cancelReason: row.cancel_reason,
    changeReason: row.change_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Duration in minutes supporting overnight (end before/equal start → next day). */
export function shiftDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function assertValidTimes(startTime: string, endTime: string, breakMinutes: number) {
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    throw new ApiError(400, "VALIDATION_ERROR", "startTime and endTime must be HH:MM or HH:MM:SS.");
  }
  const duration = shiftDurationMinutes(startTime.slice(0, 5), endTime.slice(0, 5));
  if (duration <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Shift duration must be positive.");
  }
  if (breakMinutes < 0 || breakMinutes >= duration) {
    throw new ApiError(400, "VALIDATION_ERROR", "Break duration must be less than shift duration.");
  }
}

function assertValidWindow(startsAt: string, endsAt: string, breakMinutes: number) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new ApiError(400, "VALIDATION_ERROR", "startsAt and endsAt must be valid ISO timestamps.");
  }
  if (end <= start) {
    throw new ApiError(400, "VALIDATION_ERROR", "endsAt must be after startsAt.");
  }
  const durationMin = (end - start) / 60000;
  if (breakMinutes < 0 || breakMinutes >= durationMin) {
    throw new ApiError(400, "VALIDATION_ERROR", "Break duration must be less than shift duration.");
  }
}

async function writeShiftEvent(
  client: SupabaseClient,
  input: {
    shiftId: string;
    branchId: string;
    actorUserId: string;
    action: string;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  const { error } = await client.from("hr_shift_events").insert({
    scheduled_shift_id: input.shiftId,
    branch_id: input.branchId,
    actor_user_id: input.actorUserId,
    action: input.action,
    reason: input.reason ?? null,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
  });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return;
    throw new ApiError(500, "HR_SHIFT_EVENT_FAILED", error.message);
  }
}

function isOverlapError(error: { code?: string; message?: string }): boolean {
  return error.code === "23P01" || /hr_scheduled_shifts_no_overlap|exclusion/i.test(error.message ?? "");
}

export function createHrSchedulingService(envStatus: EnvironmentStatus): HrSchedulingService {
  const supabase = () => createServiceClient(envStatus);

  async function loadActiveEmployee(
    client: SupabaseClient,
    employeeId: string,
    branchId: string,
  ): Promise<{ id: string; branch_id: string; status: string; full_name: string }> {
    const { data, error } = await client
      .from("hr_employees")
      .select("id, branch_id, status, full_name")
      .eq("id", employeeId)
      .maybeSingle();
    if (error) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", error.message);
    if (!data) throw new ApiError(404, "HR_EMPLOYEE_NOT_FOUND", "Employee not found.");
    if (data.branch_id !== branchId) {
      throw new ApiError(400, "VALIDATION_ERROR", "Employee must belong to the same branch.");
    }
    if (data.status !== "active" && data.status !== "on_leave") {
      throw new ApiError(409, "HR_EMPLOYEE_INACTIVE", "Cannot schedule an inactive or terminated employee.");
    }
    return data;
  }

  return {
    async listTemplates(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let query = client.from("hr_shift_templates").select(TEMPLATE_SELECT).order("name", { ascending: true });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);
      const { data, error } = await query;
      if (error) throw new ApiError(500, "HR_SHIFT_TEMPLATE_READ_FAILED", error.message);
      return ((data ?? []) as unknown as TemplateRow[]).map(mapTemplate);
    },

    async createTemplate(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const name = input.name.trim();
      if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Template name is required.");
      const breakMinutes = input.breakMinutes ?? 0;
      assertValidTimes(input.startTime, input.endTime, breakMinutes);

      const days = (input.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6);

      const { data, error } = await client
        .from("hr_shift_templates")
        .insert({
          branch_id: input.branchId,
          name,
          operational_role: input.operationalRole?.trim() || null,
          start_time: input.startTime.slice(0, 8),
          end_time: input.endTime.slice(0, 8),
          break_minutes: breakMinutes,
          days_of_week: days,
          notes: input.notes?.trim() || null,
          created_by: actorUserId,
          is_active: true,
        })
        .select(TEMPLATE_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "HR_SHIFT_TEMPLATE_EXISTS", "A template with this name already exists for the branch.");
        }
        throw new ApiError(500, "HR_SHIFT_TEMPLATE_CREATE_FAILED", error.message);
      }
      return mapTemplate(data as unknown as TemplateRow);
    },

    async patchTemplate(scope, _actorUserId, templateId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_shift_templates")
        .select(TEMPLATE_SELECT)
        .eq("id", templateId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_SHIFT_TEMPLATE_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_SHIFT_TEMPLATE_NOT_FOUND", "Shift template not found.");
      const before = mapTemplate(existing as unknown as TemplateRow);
      assertBranchMembership(scope, before.branchId);

      if (input.isActive === false) {
        const { count, error: refError } = await client
          .from("hr_scheduled_shifts")
          .select("id", { count: "exact", head: true })
          .eq("template_id", templateId)
          .neq("status", "cancelled");
        if (refError) throw new ApiError(500, "HR_SHIFT_READ_FAILED", refError.message);
        // Soft-deactivate is allowed even when referenced; hard delete is not exposed.
        void count;
      }

      const startTime = input.startTime ?? before.startTime;
      const endTime = input.endTime ?? before.endTime;
      const breakMinutes = input.breakMinutes ?? before.breakMinutes;
      assertValidTimes(startTime, endTime, breakMinutes);

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Template name is required.");
        patch.name = name;
      }
      if (input.operationalRole !== undefined) patch.operational_role = input.operationalRole?.trim() || null;
      if (input.startTime !== undefined) patch.start_time = input.startTime.slice(0, 8);
      if (input.endTime !== undefined) patch.end_time = input.endTime.slice(0, 8);
      if (input.breakMinutes !== undefined) patch.break_minutes = input.breakMinutes;
      if (input.daysOfWeek !== undefined) {
        patch.days_of_week = input.daysOfWeek.filter((d) => d >= 0 && d <= 6);
      }
      if (input.isActive !== undefined) patch.is_active = input.isActive;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

      const { data, error } = await client
        .from("hr_shift_templates")
        .update(patch)
        .eq("id", templateId)
        .select(TEMPLATE_SELECT)
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "HR_SHIFT_TEMPLATE_EXISTS", "A template with this name already exists for the branch.");
        }
        throw new ApiError(500, "HR_SHIFT_TEMPLATE_UPDATE_FAILED", error.message);
      }
      return mapTemplate(data as unknown as TemplateRow);
    },

    async listShifts(scope, query) {
      const branchScope = resolveListBranchIds(scope, query?.branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let q = client.from("hr_scheduled_shifts").select(SHIFT_SELECT).order("starts_at", { ascending: true });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      if (query?.from) q = q.gte("shift_date", query.from);
      if (query?.to) q = q.lte("shift_date", query.to);
      if (query?.status) q = q.eq("status", query.status);
      if (query?.employeeId) q = q.eq("employee_id", query.employeeId);
      const { data, error } = await q;
      if (error) throw new ApiError(500, "HR_SHIFT_READ_FAILED", error.message);
      return ((data ?? []) as unknown as ShiftRow[]).map(mapShift);
    },

    async createShift(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      await loadActiveEmployee(client, input.employeeId, input.branchId);

      const breakMinutes = input.breakMinutes ?? 0;
      assertValidWindow(input.startsAt, input.endsAt, breakMinutes);
      const status = input.status ?? "draft";

      // Warn if employee has approved leave overlapping — block publish path later; soft-check on create
      const { data: leaveRows } = await client
        .from("hr_leave_requests")
        .select("id")
        .eq("employee_id", input.employeeId)
        .eq("status", "APPROVED")
        .lte("start_date", input.shiftDate)
        .gte("end_date", input.shiftDate);
      if ((leaveRows ?? []).length > 0 && status === "published") {
        throw new ApiError(
          409,
          "HR_SHIFT_LEAVE_CONFLICT",
          "Employee has approved leave on this date; cannot publish the shift.",
        );
      }

      const { data, error } = await client
        .from("hr_scheduled_shifts")
        .insert({
          branch_id: input.branchId,
          employee_id: input.employeeId,
          template_id: input.templateId ?? null,
          shift_date: input.shiftDate,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          break_minutes: breakMinutes,
          operational_role: input.operationalRole?.trim() || null,
          notes: input.notes?.trim() || null,
          status,
          created_by: actorUserId,
          published_by: status === "published" ? actorUserId : null,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .select(SHIFT_SELECT)
        .single();

      if (error) {
        if (isOverlapError(error)) {
          throw new ApiError(409, "HR_SHIFT_OVERLAP", "This employee already has an overlapping shift.", {
            conflictCode: "HR_SHIFT_OVERLAP",
          });
        }
        throw new ApiError(500, "HR_SHIFT_CREATE_FAILED", error.message);
      }

      const created = mapShift(data as unknown as ShiftRow);
      await writeShiftEvent(client, {
        shiftId: created.id,
        branchId: created.branchId,
        actorUserId,
        action: status === "published" ? "shift.create_published" : "shift.create",
        after: created,
      });
      return created;
    },

    async patchShift(scope, actorUserId, shiftId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_scheduled_shifts")
        .select(SHIFT_SELECT)
        .eq("id", shiftId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_SHIFT_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_SHIFT_NOT_FOUND", "Scheduled shift not found.");
      const before = mapShift(existing as unknown as ShiftRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "cancelled") {
        throw new ApiError(409, "HR_SHIFT_CANCELLED", "Cancelled shifts cannot be edited.");
      }
      if (before.status === "completed") {
        throw new ApiError(409, "HR_SHIFT_COMPLETED", "Completed shifts cannot be edited.");
      }

      const material =
        input.startsAt !== undefined ||
        input.endsAt !== undefined ||
        input.breakMinutes !== undefined ||
        input.operationalRole !== undefined;

      if (before.status !== "draft" && material) {
        const changeReason = input.changeReason?.trim();
        if (!changeReason) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "changeReason is required for material changes after publication.",
          );
        }
      }

      const startsAt = input.startsAt ?? before.startsAt;
      const endsAt = input.endsAt ?? before.endsAt;
      const breakMinutes = input.breakMinutes ?? before.breakMinutes;
      assertValidWindow(startsAt, endsAt, breakMinutes);

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
      if (input.endsAt !== undefined) patch.ends_at = input.endsAt;
      if (input.breakMinutes !== undefined) patch.break_minutes = input.breakMinutes;
      if (input.operationalRole !== undefined) patch.operational_role = input.operationalRole?.trim() || null;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.changeReason !== undefined) patch.change_reason = input.changeReason?.trim() || null;

      const { data, error } = await client
        .from("hr_scheduled_shifts")
        .update(patch)
        .eq("id", shiftId)
        .select(SHIFT_SELECT)
        .single();

      if (error) {
        if (isOverlapError(error)) {
          throw new ApiError(409, "HR_SHIFT_OVERLAP", "This employee already has an overlapping shift.", {
            conflictCode: "HR_SHIFT_OVERLAP",
          });
        }
        throw new ApiError(500, "HR_SHIFT_UPDATE_FAILED", error.message);
      }

      const after = mapShift(data as unknown as ShiftRow);
      await writeShiftEvent(client, {
        shiftId,
        branchId: after.branchId,
        actorUserId,
        action: "shift.update",
        reason: input.changeReason?.trim() || null,
        before,
        after,
      });
      return after;
    },

    async publishShift(scope, actorUserId, shiftId) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_scheduled_shifts")
        .select(SHIFT_SELECT)
        .eq("id", shiftId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_SHIFT_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_SHIFT_NOT_FOUND", "Scheduled shift not found.");
      const before = mapShift(existing as unknown as ShiftRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status !== "draft") {
        throw new ApiError(409, "HR_SHIFT_NOT_DRAFT", "Only draft shifts can be published.");
      }

      await loadActiveEmployee(client, before.employeeId, before.branchId);

      const { data: leaveRows } = await client
        .from("hr_leave_requests")
        .select("id")
        .eq("employee_id", before.employeeId)
        .eq("status", "APPROVED")
        .lte("start_date", before.shiftDate)
        .gte("end_date", before.shiftDate);
      if ((leaveRows ?? []).length > 0) {
        throw new ApiError(
          409,
          "HR_SHIFT_LEAVE_CONFLICT",
          "Employee has approved leave on this date; cannot publish the shift.",
        );
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_scheduled_shifts")
        .update({
          status: "published",
          published_by: actorUserId,
          published_at: now,
          updated_at: now,
        })
        .eq("id", shiftId)
        .select(SHIFT_SELECT)
        .single();

      if (error) {
        if (isOverlapError(error)) {
          throw new ApiError(409, "HR_SHIFT_OVERLAP", "This employee already has an overlapping shift.", {
            conflictCode: "HR_SHIFT_OVERLAP",
          });
        }
        throw new ApiError(500, "HR_SHIFT_PUBLISH_FAILED", error.message);
      }

      const after = mapShift(data as unknown as ShiftRow);
      await writeShiftEvent(client, {
        shiftId,
        branchId: after.branchId,
        actorUserId,
        action: "shift.publish",
        before,
        after,
      });
      return after;
    },

    async cancelShift(scope, actorUserId, shiftId, reason) {
      const cancelReason = reason.trim();
      if (!cancelReason) {
        throw new ApiError(400, "VALIDATION_ERROR", "Cancellation reason is required.");
      }
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_scheduled_shifts")
        .select(SHIFT_SELECT)
        .eq("id", shiftId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_SHIFT_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_SHIFT_NOT_FOUND", "Scheduled shift not found.");
      const before = mapShift(existing as unknown as ShiftRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "cancelled") {
        throw new ApiError(409, "HR_SHIFT_ALREADY_CANCELLED", "Shift is already cancelled.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_scheduled_shifts")
        .update({
          status: "cancelled",
          cancel_reason: cancelReason,
          updated_at: now,
        })
        .eq("id", shiftId)
        .select(SHIFT_SELECT)
        .single();
      if (error) throw new ApiError(500, "HR_SHIFT_CANCEL_FAILED", error.message);

      const after = mapShift(data as unknown as ShiftRow);
      await writeShiftEvent(client, {
        shiftId,
        branchId: after.branchId,
        actorUserId,
        action: "shift.cancel",
        reason: cancelReason,
        before,
        after,
      });
      return after;
    },
  };
}
