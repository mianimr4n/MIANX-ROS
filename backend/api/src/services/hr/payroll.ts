import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";
import { CALC_VERSION } from "./payroll-calc.js";
import { executePayrollCalculation, PAYMENT_MSG } from "./payroll-engine.js";
import type { FinancePhase2Service } from "../finance/phase2.js";

export const HR_PAYROLL_STATUSES = [
  "draft",
  "calculated",
  "under_review",
  "review_required",
  "approved",
  "payment_ready",
  "paid",
  "cancelled",
  "reversed",
  "locked",
] as const;
export type HrPayrollStatus = (typeof HR_PAYROLL_STATUSES)[number];

export const HR_SALARY_TYPES = ["monthly", "hourly", "daily"] as const;
export type HrSalaryType = (typeof HR_SALARY_TYPES)[number];

const IMMUTABLE_STATUSES = new Set<string>(["approved", "payment_ready", "paid", "locked", "reversed"]);
const CALCULABLE_STATUSES = new Set<string>(["draft", "calculated", "under_review", "review_required"]);

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
  payDate: string | null;
  status: HrPayrollStatus;
  createdBy: string | null;
  approvedBy: string | null;
  lockedAt: string | null;
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
  calculationVersion: string | null;
  calculatedAt: string | null;
  paymentReadyAt: string | null;
  accrualPostingStatus: string | null;
  accrualPostingBlockedReason: string | null;
  accrualJournalEntryId: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentTriggered: false;
  paymentMessage: string;
  accountingStatus: "DEFERRED" | "LIVE" | "BLOCKED" | "PENDING";
}

export interface PayrollLineRecord {
  id: string;
  payrollRunId: string;
  employeeId: string;
  earnings: number;
  deductions: number;
  adjustments: number;
  grossPay: number;
  netPay: number;
  currency: string;
  lineStatus: string;
  notes: string | null;
  compensationProfileId: string | null;
  formulaSnapshot: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
}

export interface PayrollExceptionRecord {
  id: string;
  payrollRunId: string;
  branchId: string;
  employeeId: string | null;
  exceptionCode: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface PayslipRecord {
  id: string;
  payrollRunId: string;
  payrollLineId: string;
  employeeId: string;
  branchId: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  netPay: number;
  currency: string;
  paymentStatus: string;
  payload: Record<string, unknown>;
  issuedAt: string;
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
    input: { branchId: string; periodStart: string; periodEnd: string; payDate?: string | null },
  ): Promise<PayPeriodRecord>;
  listPayrollRuns(scope: BranchActorScope, branchId?: string): Promise<PayrollRunRecord[]>;
  createPayrollRun(
    scope: BranchActorScope,
    actorUserId: string,
    input: { payPeriodId: string },
  ): Promise<PayrollRunRecord>;
  calculatePayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  approvePayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  rejectPayrollRun(
    scope: BranchActorScope,
    actorUserId: string,
    runId: string,
    reason?: string,
  ): Promise<PayrollRunRecord>;
  markPaymentReady(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  lockPayrollRun(scope: BranchActorScope, actorUserId: string, runId: string): Promise<PayrollRunRecord>;
  cancelPayrollRun(
    scope: BranchActorScope,
    actorUserId: string,
    runId: string,
    reason?: string,
  ): Promise<PayrollRunRecord>;
  reversePayrollRun(
    scope: BranchActorScope,
    actorUserId: string,
    runId: string,
    reason?: string,
  ): Promise<PayrollRunRecord>;
  recordSettlement(
    scope: BranchActorScope,
    actorUserId: string,
    input: {
      payrollRunId: string;
      employeeId: string;
      amount: number;
      paymentReference: string;
      settledAt: string;
      provider?: string;
      idempotencyKey: string;
    },
    requestId?: string | null,
  ): Promise<{
    settlementId: string;
    run: PayrollRunRecord;
    paymentTriggered: false;
    postingStatus: string;
    postingBlockedReason: string | null;
  }>;
  listPayrollLines(scope: BranchActorScope, runId: string): Promise<PayrollLineRecord[]>;
  listPayrollExceptions(scope: BranchActorScope, runId: string): Promise<PayrollExceptionRecord[]>;
  listPayslips(scope: BranchActorScope, runId: string): Promise<PayslipRecord[]>;
  getPayslip(scope: BranchActorScope, payslipId: string): Promise<PayslipRecord>;
}

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
  pay_date?: string | null;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  locked_at?: string | null;
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
  calculation_version?: string | null;
  calculated_at?: string | null;
  payment_ready_at?: string | null;
  accrual_posting_status?: string | null;
  accrual_posting_blocked_reason?: string | null;
  accrual_journal_entry_id?: string | null;
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
    payDate: row.pay_date ?? null,
    status: row.status as HrPayrollStatus,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    lockedAt: row.locked_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: RunRow): PayrollRunRecord {
  const accrualStatus = row.accrual_posting_status ?? "pending";
  let accountingStatus: PayrollRunRecord["accountingStatus"] = "PENDING";
  if (accrualStatus === "posted" || accrualStatus === "already_posted") accountingStatus = "LIVE";
  else if (accrualStatus === "blocked") accountingStatus = "BLOCKED";
  else if (accrualStatus === "deferred") accountingStatus = "DEFERRED";

  return {
    id: row.id,
    payPeriodId: row.pay_period_id,
    branchId: row.branch_id,
    status: row.status as HrPayrollStatus,
    calculationStatus: row.calculation_status as PayrollRunRecord["calculationStatus"],
    calculationNote: row.calculation_note,
    calculationVersion: row.calculation_version ?? null,
    calculatedAt: row.calculated_at ?? null,
    paymentReadyAt: row.payment_ready_at ?? null,
    accrualPostingStatus: row.accrual_posting_status ?? null,
    accrualPostingBlockedReason: row.accrual_posting_blocked_reason ?? null,
    accrualJournalEntryId: row.accrual_journal_entry_id ?? null,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentTriggered: false,
    paymentMessage: PAYMENT_MSG,
    accountingStatus,
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

async function loadRun(client: SupabaseClient, runId: string): Promise<PayrollRunRecord> {
  const { data, error } = await client.from("hr_payroll_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw new ApiError(500, "HR_PAYROLL_RUN_READ_FAILED", error.message);
  if (!data) throw new ApiError(404, "HR_PAYROLL_RUN_NOT_FOUND", "Payroll run not found.");
  return mapRun(data as unknown as RunRow);
}

export function createHrPayrollService(
  envStatus: EnvironmentStatus,
  financePhase2?: FinancePhase2Service,
): HrPayrollService {
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

      const { data: existingPeriods, error: overlapErr } = await client
        .from("hr_pay_periods")
        .select("id, period_start, period_end, status")
        .eq("branch_id", input.branchId)
        .neq("status", "cancelled");
      if (overlapErr) throw new ApiError(500, "HR_PAY_PERIOD_READ_FAILED", overlapErr.message);
      const overlap = (existingPeriods ?? []).find(
        (p) => !(input.periodEnd < p.period_start || input.periodStart > p.period_end),
      );
      if (overlap) {
        throw new ApiError(
          409,
          "HR_PAY_PERIOD_OVERLAP",
          `Overlapping pay period exists (${overlap.period_start}–${overlap.period_end}).`,
        );
      }

      const { data, error } = await client
        .from("hr_pay_periods")
        .insert({
          branch_id: input.branchId,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          pay_date: input.payDate ?? null,
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
          calculation_note: "Draft — not yet calculated.",
          created_by: actorUserId,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "HR_PAYROLL_RUN_EXISTS",
            "An active payroll run already exists for this period. Cancel or reverse before creating another root run.",
          );
        }
        throw new ApiError(500, "HR_PAYROLL_RUN_CREATE_FAILED", error.message);
      }

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
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);

      if (IMMUTABLE_STATUSES.has(before.status)) {
        throw new ApiError(
          409,
          "HR_PAYROLL_IMMUTABLE",
          "Approved/locked/paid/reversed runs cannot be recalculated in place. Create a controlled revision after reverse/cancel policy.",
        );
      }
      if (!CALCULABLE_STATUSES.has(before.status)) {
        throw new ApiError(409, "HR_PAYROLL_NOT_CALCULABLE", `Cannot calculate run in status ${before.status}.`);
      }

      const { data: period, error: periodError } = await client
        .from("hr_pay_periods")
        .select("period_start, period_end")
        .eq("id", before.payPeriodId)
        .single();
      if (periodError) throw new ApiError(500, "HR_PAY_PERIOD_READ_FAILED", periodError.message);

      const result = await executePayrollCalculation(client, {
        runId,
        branchId: before.branchId,
        periodStart: period.period_start,
        periodEnd: period.period_end,
        actorUserId,
      });

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({
          status: result.status,
          calculation_status: result.calculationStatus,
          calculation_note: result.calculationNote,
          calculation_version: CALC_VERSION,
          calculated_at: now,
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
        action: "payroll.calculate",
        before,
        after: { ...after, lineCount: result.lineCount, exceptionCount: result.exceptionCount },
      });
      return after;
    },

    async approvePayrollRun(scope, actorUserId, runId) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);

      if (IMMUTABLE_STATUSES.has(before.status) && before.status !== "approved") {
        throw new ApiError(409, "HR_PAYROLL_IMMUTABLE", "Run cannot be approved in its current status.");
      }
      if (
        before.status !== "under_review" &&
        before.status !== "calculated" &&
        before.status !== "review_required"
      ) {
        throw new ApiError(409, "HR_PAYROLL_NOT_REVIEWABLE", "Payroll run must be calculated/reviewed before approval.");
      }
      if (before.calculationStatus === "unavailable") {
        throw new ApiError(409, "HR_PAYROLL_NOT_CALCULATED", "Cannot approve a run that was never calculated.");
      }

      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "approved", approved_by: actorUserId, updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_APPROVE_FAILED", error.message);

      const afterBase = mapRun(data as unknown as RunRow);
      let after = afterBase;
      if (financePhase2) {
        const post = await financePhase2.postPayrollAccrual(scope, actorUserId, runId, null);
        after = await loadRun(client, runId);
        after = {
          ...after,
          accrualPostingStatus: post.postingStatus,
          accrualPostingBlockedReason: post.postingBlockedReason,
          accrualJournalEntryId: post.journalEntryId,
          accountingStatus:
            post.postingStatus === "posted" || post.postingStatus === "already_posted"
              ? "LIVE"
              : post.postingStatus === "blocked"
                ? "BLOCKED"
                : "DEFERRED",
        };
      }
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.approve",
        before,
        after,
      });
      return { ...after, paymentTriggered: false as const, paymentMessage: PAYMENT_MSG };
    },

    async rejectPayrollRun(scope, actorUserId, runId, reason) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);
      if (!["calculated", "under_review", "review_required"].includes(before.status)) {
        throw new ApiError(409, "HR_PAYROLL_NOT_REJECTABLE", "Only calculated/review runs can be rejected to draft.");
      }
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({
          status: "draft",
          calculation_status: "unavailable",
          calculation_note: reason ? `Rejected: ${reason}` : "Rejected — returned to draft for recalculation.",
          updated_at: now,
        })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_REJECT_FAILED", error.message);
      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.reject",
        reason: reason ?? null,
        before,
        after,
      });
      return after;
    },

    async markPaymentReady(scope, actorUserId, runId) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);
      if (before.status !== "approved" && before.status !== "locked") {
        throw new ApiError(409, "HR_PAYROLL_NOT_APPROVED", "Run must be approved (or locked) before payment_ready.");
      }
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "payment_ready", payment_ready_at: now, updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_PAYMENT_READY_FAILED", error.message);

      await client
        .from("hr_payslips")
        .update({ payment_status: "payment_ready" })
        .eq("payroll_run_id", runId)
        .eq("payment_status", "unpaid");

      await client.from("hr_payroll_posting_events").upsert(
        {
          payroll_run_id: runId,
          branch_id: before.branchId,
          event_type: "payroll_payment_ready",
          status: "deferred",
          idempotency_key: `payroll_payment_ready:${runId}`,
          payload: { note: "Payment instruction export only — no settlement applied." },
          deferred_reason:
            "Payment execution DEFERRED. No bank provider authorized. paymentTriggered remains false without hr_payroll_settlements.",
        },
        { onConflict: "idempotency_key" },
      );

      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.payment_ready",
        before,
        after,
      });
      // Explicit: never paid
      return { ...after, paymentTriggered: false as const, paymentMessage: PAYMENT_MSG };
    },

    async lockPayrollRun(scope, actorUserId, runId) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);

      if (before.status !== "approved" && before.status !== "payment_ready") {
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

      await client
        .from("hr_pay_periods")
        .update({ status: "locked", locked_at: now, updated_at: now })
        .eq("id", before.payPeriodId);

      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.lock",
        before,
        after,
      });
      return { ...after, paymentTriggered: false as const, paymentMessage: PAYMENT_MSG };
    },

    async cancelPayrollRun(scope, actorUserId, runId, reason) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);
      if (before.status === "paid") {
        throw new ApiError(409, "HR_PAYROLL_PAID", "Paid runs cannot be cancelled; use reversal policy.");
      }
      if (before.status === "cancelled" || before.status === "reversed") {
        throw new ApiError(409, "HR_PAYROLL_ALREADY_CLOSED", "Run is already cancelled or reversed.");
      }
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_CANCEL_FAILED", error.message);
      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.cancel",
        reason: reason ?? null,
        before,
        after,
      });
      return after;
    },

    async reversePayrollRun(scope, actorUserId, runId, reason) {
      const client = supabase();
      const before = await loadRun(client, runId);
      assertBranchMembership(scope, before.branchId);
      if (!["approved", "payment_ready", "locked"].includes(before.status)) {
        throw new ApiError(
          409,
          "HR_PAYROLL_NOT_REVERSIBLE",
          "Only approved/payment_ready/locked runs can be reversed (paid requires settlement void — deferred).",
        );
      }
      if (!reason || reason.trim().length < 3) {
        throw new ApiError(400, "VALIDATION_ERROR", "Reversal requires an explicit reason.");
      }
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("hr_payroll_runs")
        .update({ status: "reversed", updated_at: now })
        .eq("id", runId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "HR_PAYROLL_REVERSE_FAILED", error.message);
      const after = mapRun(data as unknown as RunRow);
      await writePayrollEvent(client, {
        runId,
        branchId: after.branchId,
        actorUserId,
        action: "payroll.reverse",
        reason,
        before,
        after,
      });
      return after;
    },

    async recordSettlement(scope, actorUserId, input, requestId) {
      const client = supabase();
      const before = await loadRun(client, input.payrollRunId);
      assertBranchMembership(scope, before.branchId);

      if (!["approved", "payment_ready", "locked", "paid"].includes(before.status)) {
        throw new ApiError(
          409,
          "HR_PAYROLL_NOT_SETTLEABLE",
          "Settlement requires approved, payment_ready, locked, or partially paid run.",
        );
      }
      if (input.amount <= 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Settlement amount must be > 0.");
      }

      const { data: existing } = await client
        .from("hr_payroll_settlements")
        .select("id")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existing) {
        const run = await loadRun(client, input.payrollRunId);
        return {
          settlementId: existing.id as string,
          run,
          paymentTriggered: false as const,
          postingStatus: "already_posted",
          postingBlockedReason: null,
        };
      }

      const { data: settlement, error } = await client
        .from("hr_payroll_settlements")
        .insert({
          payroll_run_id: input.payrollRunId,
          employee_id: input.employeeId,
          amount: input.amount,
          currency: "PKR",
          payment_reference: input.paymentReference,
          settled_at: input.settledAt,
          actor_user_id: actorUserId,
          provider: input.provider ?? "manual_verified",
          idempotency_key: input.idempotencyKey,
          status: "settled",
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "HR_SETTLEMENT_DUPLICATE", "Duplicate settlement idempotency key.");
        }
        throw new ApiError(500, "HR_SETTLEMENT_CREATE_FAILED", error.message);
      }

      await client
        .from("hr_payslips")
        .update({ payment_status: "paid" })
        .eq("payroll_run_id", input.payrollRunId)
        .eq("employee_id", input.employeeId);

      let postingStatus = "deferred";
      let postingBlockedReason: string | null =
        "Finance posting deferred — mappings or phase2 service unavailable.";
      if (financePhase2) {
        const post = await financePhase2.postPayrollSettlement(
          scope,
          actorUserId,
          settlement.id as string,
          requestId,
        );
        postingStatus = post.postingStatus;
        postingBlockedReason = post.postingBlockedReason;
      }

      // Run becomes paid only when every payslip is paid
      const { data: slips } = await client
        .from("hr_payslips")
        .select("payment_status")
        .eq("payroll_run_id", input.payrollRunId);
      const allPaid = (slips ?? []).length > 0 && (slips ?? []).every((s) => s.payment_status === "paid");
      if (allPaid) {
        await client
          .from("hr_payroll_runs")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", input.payrollRunId);
      }

      const run = await loadRun(client, input.payrollRunId);
      await writePayrollEvent(client, {
        runId: input.payrollRunId,
        branchId: run.branchId,
        actorUserId,
        action: "payroll.settlement",
        reason: input.paymentReference,
        before,
        after: { run, settlementId: settlement.id, postingStatus, paymentTriggered: false },
      });

      // Explicit: settlement recorded does not flip paymentTriggered API flag semantics for unsafe auto-pay
      return {
        settlementId: settlement.id as string,
        run: { ...run, paymentTriggered: false as const, paymentMessage: PAYMENT_MSG },
        paymentTriggered: false as const,
        postingStatus,
        postingBlockedReason: postingBlockedReason,
      };
    },

    async listPayrollLines(scope, runId) {
      const client = supabase();
      const run = await loadRun(client, runId);
      assertBranchMembership(scope, run.branchId);
      const { data, error } = await client
        .from("hr_payroll_lines")
        .select("*")
        .eq("payroll_run_id", runId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "HR_PAYROLL_LINES_READ_FAILED", error.message);
      return (data ?? []).map((row) => ({
        id: row.id as string,
        payrollRunId: row.payroll_run_id as string,
        employeeId: row.employee_id as string,
        earnings: Number(row.earnings),
        deductions: Number(row.deductions),
        adjustments: Number(row.adjustments),
        grossPay: Number(row.gross_pay ?? 0),
        netPay: Number(row.net_pay ?? 0),
        currency: (row.currency as string) ?? "PKR",
        lineStatus: (row.line_status as string) ?? "ok",
        notes: (row.notes as string | null) ?? null,
        compensationProfileId: (row.compensation_profile_id as string | null) ?? null,
        formulaSnapshot: (row.formula_snapshot as Record<string, unknown>) ?? {},
        inputSnapshot: (row.input_snapshot as Record<string, unknown>) ?? {},
      }));
    },

    async listPayrollExceptions(scope, runId) {
      const client = supabase();
      const run = await loadRun(client, runId);
      assertBranchMembership(scope, run.branchId);
      const { data, error } = await client
        .from("hr_payroll_exceptions")
        .select("*")
        .eq("payroll_run_id", runId)
        .order("created_at", { ascending: true });
      if (error) throw new ApiError(500, "HR_PAYROLL_EXCEPTIONS_READ_FAILED", error.message);
      return (data ?? []).map((row) => ({
        id: row.id as string,
        payrollRunId: row.payroll_run_id as string,
        branchId: row.branch_id as string,
        employeeId: (row.employee_id as string | null) ?? null,
        exceptionCode: row.exception_code as string,
        severity: row.severity as string,
        message: row.message as string,
        status: row.status as string,
        createdAt: row.created_at as string,
      }));
    },

    async listPayslips(scope, runId) {
      const client = supabase();
      const run = await loadRun(client, runId);
      assertBranchMembership(scope, run.branchId);
      const { data, error } = await client
        .from("hr_payslips")
        .select("*")
        .eq("payroll_run_id", runId)
        .order("issued_at", { ascending: true });
      if (error) throw new ApiError(500, "HR_PAYSLIPS_READ_FAILED", error.message);
      return (data ?? []).map((row) => ({
        id: row.id as string,
        payrollRunId: row.payroll_run_id as string,
        payrollLineId: row.payroll_line_id as string,
        employeeId: row.employee_id as string,
        branchId: row.branch_id as string,
        periodStart: row.period_start as string,
        periodEnd: row.period_end as string,
        grossPay: Number(row.gross_pay),
        netPay: Number(row.net_pay),
        currency: row.currency as string,
        paymentStatus: row.payment_status as string,
        payload: (row.payload as Record<string, unknown>) ?? {},
        issuedAt: row.issued_at as string,
      }));
    },

    async getPayslip(scope, payslipId) {
      const client = supabase();
      const { data, error } = await client.from("hr_payslips").select("*").eq("id", payslipId).maybeSingle();
      if (error) throw new ApiError(500, "HR_PAYSLIP_READ_FAILED", error.message);
      if (!data) throw new ApiError(404, "HR_PAYSLIP_NOT_FOUND", "Payslip not found.");
      assertBranchMembership(scope, data.branch_id as string);
      return {
        id: data.id as string,
        payrollRunId: data.payroll_run_id as string,
        payrollLineId: data.payroll_line_id as string,
        employeeId: data.employee_id as string,
        branchId: data.branch_id as string,
        periodStart: data.period_start as string,
        periodEnd: data.period_end as string,
        grossPay: Number(data.gross_pay),
        netPay: Number(data.net_pay),
        currency: data.currency as string,
        paymentStatus: data.payment_status as string,
        payload: (data.payload as Record<string, unknown>) ?? {},
        issuedAt: data.issued_at as string,
      };
    },
  };
}
