import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const HR_PAYROLL_STATUSES = [
  "draft",
  "calculated",
  "under_review",
  "approved",
  "locked",
  "cancelled",
] as const;
export type HrPayrollStatus = (typeof HR_PAYROLL_STATUSES)[number];

export const HR_SALARY_TYPES = ["monthly", "hourly", "daily"] as const;
export type HrSalaryType = (typeof HR_SALARY_TYPES)[number];

export interface CompensationProfileRecord {
  id: string;
  employeeId: string;
  employeeName: string | null;
  branchId: string;
  salaryType: HrSalaryType;
  baseRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  approvedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayPeriodRecord {
  id: string;
  branchId: string;
  periodStart: string;
  periodEnd: string;
  status: HrPayrollStatus;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunRecord {
  id: string;
  payPeriodId: string;
  branchId: string;
  status: HrPayrollStatus;
  calculationStatus: "unavailable" | "partial" | "complete";
  calculationNote: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentTriggered: false;
  paymentMessage: string;
}

export interface HrPayrollService {
  listCompensation(scope: BranchActorScope, branchId?: string): Promise<CompensationProfileRecord[]>;
  createCompensation(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      employeeId: string;
      branchId: string;
      salaryType: HrSalaryType;
      baseRate: number;
      currency?: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
    },
  ): Promise<CompensationProfileRecord>;
  listPayPeriods(scope: BranchActorScope, branchId?: string): Promise<PayPeriodRecord[]>;
  createPayPeriod(
    scope: BranchActorScope,
    actorUserId: string,
    input: { branchId: string; periodStart: string; periodEnd: string },
  ): Promise<PayPeriodRecord>;
  listPayrollRuns(scope: BranchActorScope, branchId?: string): Promise<PayrollRunRecord[]>;
  createPayrollRun(
    scope: BranchActorScope,
    actorUserId: string,
    input: { payPeriodId: string },
  ): Promise<PayrollRunRecord>;
  calculatePayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  approvePayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  lockPayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
}

const PAYMENT_MSG = "Payroll foundation does not trigger payments.";
const CALC_UNAVAILABLE_MSG =
  "Payroll calculation is not available until compensation rules are configured and Pakistan payroll rules are approved.";

type CompRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  salary_type: string;
  base_rate: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employee: { id: string; full_name: string } | null;
};

type PeriodRow = {
  id: string;
  branch_id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

type RunRow = {
  id: string;
  pay_period_id: string;
  branch_id: string;
  status: string;
  calculation_status: string;
  calculation_note: string | null;
  created_by: string | null;
  approved_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

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

function mapComp(row: CompRow): CompensationProfileRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? null,
    branchId: row.branch_id,
    salaryType: row.salary_type as HrSalaryType,
    baseRate: Number(row.base_rate),
    currency: row.currency,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    isActive: row.is_active,
    approvedBy: row.approved_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPeriod(row: PeriodRow): PayPeriodRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status as HrPayrollStatus,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow): PayrollRunRecord {
  return {
    id: row.id,
    payPeriodId: row.pay_period_id,
    branchId: row.branch_id,
    status: row.status as HrPayrollStatus,
    calculationStatus: row.calculation_status as PayrollRunRecord["calculationStatus"],
    calculationNote: row.calculation_note,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentTriggered: false,
    paymentMessage: PAYMENT_MSG,
  };
}

async function writePayrollEvent(
  client: SupabaseClient,
  input: {
    runId: string;
    branchId: string;
    actorUserId: string;
    action: string;
    reason?: string | null;
    before?: unknown;
    after?: unknown;
  },
) {
  const { error } = await client.from("hr_payroll_events").insert({
    payroll_run_id: input.runId,
    branch_id: input.branchId,
    actor_user_id: input.actorUserId,
    action: input.action,
    reason: input.reason ?? null,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
  });
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) return;
    throw new ApiError(500, "HR_PAYROLL_EVENT_FAILED", error.message);
  }
}

export function createHrPayrollService(envStatus: EnvironmentStatus): HrPayrollService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listCompensation(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let q = client
        .from("hr_compensation_profiles")
        .select(
          "id, employee_id, branch_id, salary_type, base_rate, currency, effective_from, effective_to, is_active, approved_by, created_by, created_at, updated_at, employee:hr_employees(id, full_name)",
        )
        .order("effective_from", { ascending: false });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const { data, error } = await q;
      if (error) throw new ApiError(500, "HR_COMPENSATION_READ_FAILED", error.message);
      return ((data ?? []) as unknown as CompRow[]).map(mapComp);
    },

    async createCompensation(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      if (input.baseRate < 0) throw new ApiError(400, "VALIDATION_ERROR", "baseRate must be >= 0.");
      if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
        throw new ApiError(400, "VALIDATION_ERROR", "effectiveTo must be on or after effectiveFrom.");
      }

      const client = supabase();
      await loadBranchRow(client, input.branchId);
      const { data: emp, error: empError } = await client
        .from("hr_employees")
        .select("id, branch_id")
        .eq("id", input.employeeId)
        .maybeSingle();
      if (empError) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empError.message);
      if (!emp || emp.branch_id !== input.branchId) {
        throw new ApiError(400, "VALIDATION_ERROR", "Employee must belong to the branch.");
      }

      // Close prior open active profile to avoid overlap
      if (!input.effectiveTo) {
        await client
          .from("hr_compensation_profiles")
          .update({
            is_active: false,
            effective_to: input.effectiveFrom,
            updated_at: new Date().toISOString(),
          })
          .eq("employee_id", input.employeeId)
          .eq("is_active", true)
          .is("effective_to", null);
      }

      const { data, error } = await client
        .from("hr_compensation_profiles")
        .insert({
          employee_id: input.employeeId,
          branch_id: input.branchId,
          salary_type: input.salaryType,
          base_rate: input.baseRate,
          currency: input.currency ?? "PKR",
          effective_from: input.effectiveFrom,
          effective_to: input.effectiveTo ?? null,
          is_active: true,
          approved_by: actorUserId,
          created_by: actorUserId,
        })
        .select(
          "id, employee_id, branch_id, salary_type, base_rate, currency, effective_from, effective_to, is_active, approved_by, created_by, created_at, updated_at, employee:hr_employees(id, full_name)",
        )
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "HR_COMPENSATION_OVERLAP",
            "An active open-ended compensation profile already exists for this employee.",
          );
        }
        throw new ApiError(500, "HR_COMPENSATION_CREATE_FAILED", error.message);
      }
      return mapComp(data as unknown as CompRow);
    },

    async listPayPeriods(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let q = client.from("hr_pay_periods").select("*").order("period_start", { ascending: false });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const { data, error } = await q;
      if (error) throw new ApiError(500, "HR_PAY_PERIOD_READ_FAILED", error.message);
      return ((data ?? []) as unknown as PeriodRow[]).map(mapPeriod);
    },

    async createPayPeriod(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      if (input.periodEnd < input.periodStart) {
        throw new ApiError(400, "VALIDATION_ERROR", "periodEnd must be on or after periodStart.");
      }
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      const { data, error } = await client
        .from("hr_pay_periods")
        .insert({
          branch_id: input.branchId,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          status: "draft",
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "HR_PAY_PERIOD_EXISTS", "This pay period already exists for the branch.");
        }
        throw new ApiError(500, "HR_PAY_PERIOD_CREATE_FAILED", error.message);
      }
      return mapPeriod(data as unknown as PeriodRow);
    },

    async listPayrollRuns(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];
      const client = supabase();
      let q = client.from("hr_payroll_runs").select("*").order("created_at", { ascending: false });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const { data, error } = await q;
      if (error) throw new ApiError(500, "HR_PAYROLL_RUN_READ_FAILED", error.message);
      return ((data ?? []) as unknown as RunRow[]).map(mapRun);
    },

    async createPayrollRun(scope, actorUserId, input) {
      const client = supabase();
      const { data: period, error: periodError } = await client
        .from("hr_pay_periods")
        .select("*")
        .eq("id", input.payPeriodId)
        .maybeSingle();
      if (periodError) throw new ApiError(500, "HR_PAY_PERIOD_READ_FAILED", periodError.message);
      if (!period) throw new ApiError(404, "HR_PAY_PERIOD_NOT_FOUND", "Pay period not found.");
      assertBranchMembership(scope, period.branch_id);

      const { data, error } = await client
        .from("hr_payroll_runs")
        .insert({
          pay_period_id: period.id,
          branch_id: period.branch_id,
          status: "draft",
          calculation_status: "unavailable",
          calculation_note: CALC_UNAVAILABLE_MSG,
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_RUN_CREATE_FAILED", error.message);

      const run = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId: run.id,
        branchId: run.branchId,
        actorUserId,
        action: "payroll.create",
        after: run,
      });
      return run;
    },

    async calculatePayrollRun(scope, actorUserId, runId) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_payroll_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_PAYROLL_RUN_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
      const before = mapRun(existing as unknown as RunRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "locked") {
        throw new ApiError(409, "HR_PAYROLL_LOCKED", "Locked payroll runs are immutable.");
      }

      // Honest unavailable calculation — do not invent Pakistan payroll rules
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({
          status: "under_review",
          calculation_status: "unavailable",
          calculation_note: CALC_UNAVAILABLE_MSG,
          updated_at: now,
        })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_CALCULATE_FAILED", error.message);

      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.calculate_unavailable",
        before,
        after,
      });
      return after;
    },

    async approvePayrollRun(scope, actorUserId, runId) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_payroll_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_PAYROLL_RUN_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
      const before = mapRun(existing as unknown as RunRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status === "locked") {
        throw new ApiError(409, "HR_PAYROLL_LOCKED", "Locked payroll runs are immutable.");
      }
      if (before.status !== "under_review" && before.status !== "calculated") {
        throw new ApiError(409, "HR_PAYROLL_NOT_REVIEWABLE", "Payroll run must be under review before approval.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "approved", approved_by: actorUserId, updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_APPROVE_FAILED", error.message);

      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.approve",
        before,
        after,
      });
      return after;
    },

    async lockPayrollRun(scope, actorUserId, runId) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("hr_payroll_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (readError) throw new ApiError(500, "HR_PAYROLL_RUN_READ_FAILED", readError.message);
      if (!existing) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
      const before = mapRun(existing as unknown as RunRow);
      assertBranchMembership(scope, before.branchId);

      if (before.status !== "approved") {
        throw new ApiError(409, "HR_PAYROLL_NOT_APPROVED", "Payroll run must be approved before lock.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "locked", locked_at: now, updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_LOCK_FAILED", error.message);

      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.lock",
        before,
        after,
      });
      // Explicitly never trigger payment
      return { ...after, paymentTriggered: false as const, paymentMessage: PAYMENT_MSG };
    },
  };
}
