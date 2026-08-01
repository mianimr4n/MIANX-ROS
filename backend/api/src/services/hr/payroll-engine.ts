/**
 * RC4-3 payroll run calculation orchestration (writes lines, exceptions, payslips).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import {
  CALC_VERSION,
  calculateEmployeePayroll,
  fromMinor,
  type CompInput,
} from "./payroll-calc.js";

const PAYMENT_MSG =
  "paymentTriggered=false. Approved/locked/payment_ready does not pay employees. Settlement required.";

export { PAYMENT_MSG };

export async function executePayrollCalculation(
  client: SupabaseClient,
  input: {
    runId: string;
    branchId: string;
    periodStart: string;
    periodEnd: string;
    actorUserId: string;
  },
): Promise<{
  calculationStatus: "complete" | "partial" | "unavailable";
  calculationNote: string;
  status: "review_required" | "calculated";
  lineCount: number;
  exceptionCount: number;
}> {
  // Clear prior draft lines/exceptions/payslips for recalculation (only when not approved+)
  await client.from("hr_payroll_exceptions").delete().eq("payroll_run_id", input.runId);
  const { data: priorLines } = await client
    .from("hr_payroll_lines")
    .select("id")
    .eq("payroll_run_id", input.runId);
  const priorIds = (priorLines ?? []).map((l) => l.id);
  if (priorIds.length) {
    await client.from("hr_payroll_line_components").delete().in("payroll_line_id", priorIds);
    await client.from("hr_payslips").delete().eq("payroll_run_id", input.runId);
    await client.from("hr_payroll_lines").delete().eq("payroll_run_id", input.runId);
  }

  const { data: employees, error: empErr } = await client
    .from("hr_employees")
    .select("id, full_name, status, branch_id")
    .eq("branch_id", input.branchId)
    .in("status", ["active", "on_leave"]);
  if (empErr) throw new ApiError(500, "HR_EMPLOYEE_READ_FAILED", empErr.message);

  const { data: comps, error: compErr } = await client
    .from("hr_compensation_profiles")
    .select("id, employee_id, salary_type, base_rate, currency, effective_from, effective_to, is_active")
    .eq("branch_id", input.branchId)
    .eq("is_active", true);
  if (compErr) throw new ApiError(500, "HR_COMPENSATION_READ_FAILED", compErr.message);

  // Attendance has check_in_time (no work_date column) — filter by period in-process.
  const { data: attendanceRaw, error: attErr } = await client
    .from("hr_attendance")
    .select("employee_id, check_in_time, status, created_at")
    .eq("branch_id", input.branchId);
  if (attErr) throw new ApiError(500, "HR_ATTENDANCE_READ_FAILED", attErr.message);

  const attendance = (attendanceRaw ?? [])
    .map((a) => {
      const ts = (a.check_in_time as string | null) ?? (a.created_at as string);
      const workDate = ts ? ts.slice(0, 10) : null;
      if (!workDate || workDate < input.periodStart || workDate > input.periodEnd) return null;
      return {
        employee_id: a.employee_id as string,
        work_date: workDate,
        status: a.status as string,
      };
    })
    .filter((row): row is { employee_id: string; work_date: string; status: string } => row !== null);

  const { data: leaves, error: leaveErr } = await client
    .from("hr_leave_requests")
    .select("employee_id, start_date, end_date, status, leave_type")
    .eq("branch_id", input.branchId)
    .lte("start_date", input.periodEnd)
    .gte("end_date", input.periodStart);
  if (leaveErr) throw new ApiError(500, "HR_LEAVE_READ_FAILED", leaveErr.message);

  let okCount = 0;
  let blockedCount = 0;
  let reviewCount = 0;
  let exceptionCount = 0;

  for (const emp of employees ?? []) {
    const profile = (comps ?? []).find((c) => {
      if (c.employee_id !== emp.id) return false;
      if (c.effective_from > input.periodEnd) return false;
      if (c.effective_to && c.effective_to < input.periodStart) return false;
      return true;
    });

    const compInput: CompInput | null = profile
      ? {
          id: profile.id,
          salaryType: profile.salary_type as CompInput["salaryType"],
          baseRateMajor: Number(profile.base_rate),
          currency: profile.currency || "PKR",
        }
      : null;

    const empAttendance = attendance
      .filter((a) => a.employee_id === emp.id)
      .map((a) => ({
        workDate: a.work_date,
        status: a.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
      }));
    const empLeaves = (leaves ?? [])
      .filter((l) => l.employee_id === emp.id)
      .map((l) => ({
        startDate: l.start_date as string,
        endDate: l.end_date as string,
        status: String(l.status),
        leaveType: String(l.leave_type),
      }));

    const result = calculateEmployeePayroll({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      compensation: compInput,
      attendance: empAttendance,
      leaves: empLeaves,
    });

    if (result.lineStatus === "ok") okCount += 1;
    else if (result.lineStatus === "blocked") blockedCount += 1;
    else reviewCount += 1;

    const { data: line, error: lineErr } = await client
      .from("hr_payroll_lines")
      .insert({
        payroll_run_id: input.runId,
        employee_id: emp.id,
        earnings: fromMinor(result.earningsMinor),
        deductions: fromMinor(result.deductionsMinor),
        adjustments: fromMinor(result.adjustmentsMinor),
        gross_pay: fromMinor(result.grossMinor),
        net_pay: fromMinor(result.netMinor),
        currency: compInput?.currency ?? "PKR",
        line_status: result.lineStatus,
        compensation_profile_id: profile?.id ?? null,
        input_snapshot: result.inputSnapshot,
        formula_snapshot: result.formula,
        notes: result.lineStatus === "ok" ? null : result.exceptions.map((e) => e.code).join(","),
      })
      .select("id")
      .single();
    if (lineErr) throw new ApiError(500, "HR_PAYROLL_LINE_WRITE_FAILED", lineErr.message);

    if (result.components.length) {
      const { error: compWriteErr } = await client.from("hr_payroll_line_components").insert(
        result.components.map((c) => ({
          payroll_line_id: line.id,
          component_kind: c.kind,
          component_code: c.code,
          description: c.description,
          amount: fromMinor(c.amountMinor),
          taxable: c.taxable,
        })),
      );
      if (compWriteErr) throw new ApiError(500, "HR_PAYROLL_COMPONENT_WRITE_FAILED", compWriteErr.message);
    }

    for (const ex of result.exceptions) {
      exceptionCount += 1;
      await client.from("hr_payroll_exceptions").insert({
        payroll_run_id: input.runId,
        branch_id: input.branchId,
        employee_id: emp.id,
        exception_code: ex.code,
        severity: ex.severity,
        message: ex.message,
        metadata: {},
        status: "open",
      });
    }

    if (result.lineStatus !== "blocked") {
      await client.from("hr_payslips").insert({
        payroll_run_id: input.runId,
        payroll_line_id: line.id,
        employee_id: emp.id,
        branch_id: input.branchId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        gross_pay: fromMinor(result.grossMinor),
        net_pay: fromMinor(result.netMinor),
        currency: compInput?.currency ?? "PKR",
        payment_status: "unpaid",
        payload: {
          employeeName: emp.full_name,
          components: result.components.map((c) => ({
            kind: c.kind,
            code: c.code,
            description: c.description,
            amount: fromMinor(c.amountMinor),
          })),
          formula: result.formula,
          calculationVersion: CALC_VERSION,
          paymentTriggered: false,
          paymentMessage: PAYMENT_MSG,
        },
      });
    }
  }

  const total = (employees ?? []).length;
  let calculationStatus: "complete" | "partial" | "unavailable" = "complete";
  let status: "review_required" | "calculated" = "calculated";
  let note = `Calculated ${total} employee(s) with ${CALC_VERSION}. ${PAYMENT_MSG}`;

  if (total === 0) {
    calculationStatus = "unavailable";
    status = "review_required";
    note = "No active employees in branch for this period.";
  } else if (blockedCount > 0 || reviewCount > 0) {
    calculationStatus = "partial";
    status = "review_required";
    note = `Partial: ok=${okCount} review=${reviewCount} blocked=${blockedCount}. ${PAYMENT_MSG}`;
  }

  // Emit accrual posting-ready (GL deferred — RC4-8 not on this baseline)
  await client.from("hr_payroll_posting_events").upsert(
    {
      payroll_run_id: input.runId,
      branch_id: input.branchId,
      event_type: "payroll_accrual_ready",
      status: "deferred",
      idempotency_key: `payroll_accrual_ready:${input.runId}`,
      payload: { calculationVersion: CALC_VERSION, lineCount: total },
      deferred_reason:
        "Payroll accrual posting runs on approve when salary_expense and payroll_payable mappings exist; until then event remains deferred.",
    },
    { onConflict: "idempotency_key" },
  );

  void input.actorUserId;
  return {
    calculationStatus,
    calculationNote: note,
    status,
    lineCount: total,
    exceptionCount,
  };
}
