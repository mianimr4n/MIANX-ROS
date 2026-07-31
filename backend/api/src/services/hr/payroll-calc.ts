/**
 * RC4-3 payroll calculation — integer minor units (paisa). No float money math.
 */

export const CALC_VERSION = "rc4-3.payroll.v1";

export type MoneyMinor = number; // integer paisa

export function toMinor(major: number): MoneyMinor {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * 100);
}

export function fromMinor(minor: MoneyMinor): number {
  return Math.round(minor) / 100;
}

export function daysInclusive(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export interface CompInput {
  id: string;
  salaryType: "monthly" | "hourly" | "daily";
  baseRateMajor: number;
  currency: string;
}

export interface AttendanceDay {
  workDate: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
}

export interface LeaveDay {
  startDate: string;
  endDate: string;
  status: string;
  leaveType: string;
}

export interface ComponentOut {
  kind: "earning" | "deduction" | "adjustment";
  code: string;
  description: string;
  amountMinor: MoneyMinor;
  taxable: boolean;
}

export interface EmployeeCalcResult {
  lineStatus: "ok" | "blocked" | "review_required" | "unavailable";
  exceptions: Array<{ code: string; severity: "blocked" | "review_required" | "unavailable" | "info"; message: string }>;
  components: ComponentOut[];
  earningsMinor: MoneyMinor;
  deductionsMinor: MoneyMinor;
  adjustmentsMinor: MoneyMinor;
  grossMinor: MoneyMinor;
  netMinor: MoneyMinor;
  formula: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
}

const STANDARD_HOURS_PER_PRESENT_DAY = 8;

/**
 * Deterministic employee payroll calc for a period.
 * - Missing compensation → blocked
 * - Hourly without attendance → review_required (does not invent hours)
 * - ABSENT days → review_required info; not auto-deducted (no silent unpaid absence)
 * - Approved leave → review_required unless leaveType explicitly UNPAID (not configured → no auto deduct)
 * - Statutory withholding → unavailable (no active configured rates)
 * - Negative net → blocked
 */
export function calculateEmployeePayroll(input: {
  periodStart: string;
  periodEnd: string;
  compensation: CompInput | null;
  attendance: AttendanceDay[];
  leaves: LeaveDay[];
  overtimeHoursApproved?: number;
  allowancesMajor?: number;
  otherDeductionsMajor?: number;
}): EmployeeCalcResult {
  const exceptions: EmployeeCalcResult["exceptions"] = [];
  const components: ComponentOut[] = [];
  const periodDays = daysInclusive(input.periodStart, input.periodEnd);

  if (!input.compensation) {
    return {
      lineStatus: "blocked",
      exceptions: [
        {
          code: "MISSING_COMPENSATION",
          severity: "blocked",
          message: "No active compensation profile for period; calculation blocked.",
        },
      ],
      components: [],
      earningsMinor: 0,
      deductionsMinor: 0,
      adjustmentsMinor: 0,
      grossMinor: 0,
      netMinor: 0,
      formula: { version: CALC_VERSION, blocked: true },
      inputSnapshot: { periodStart: input.periodStart, periodEnd: input.periodEnd, periodDays },
    };
  }

  const rateMinor = toMinor(input.compensation.baseRateMajor);
  let earningsMinor = 0;
  const formula: Record<string, unknown> = {
    version: CALC_VERSION,
    salaryType: input.compensation.salaryType,
    baseRateMajor: input.compensation.baseRateMajor,
    periodDays,
    rounding: "half-up-to-minor-units",
  };

  if (input.compensation.salaryType === "monthly") {
    // Full monthly rate for the period (period is the pay month window)
    earningsMinor = rateMinor;
    components.push({
      kind: "earning",
      code: "BASE",
      description: "Monthly base salary",
      amountMinor: earningsMinor,
      taxable: true,
    });
    formula.monthly = { amountMinor: earningsMinor };
  } else if (input.compensation.salaryType === "daily") {
    const presentDays = input.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    if (input.attendance.length === 0) {
      exceptions.push({
        code: "MISSING_ATTENDANCE",
        severity: "review_required",
        message: "Daily wage employee has no attendance rows in period.",
      });
    }
    earningsMinor = presentDays * rateMinor;
    components.push({
      kind: "earning",
      code: "BASE",
      description: `Daily wage × ${presentDays} present/late days`,
      amountMinor: earningsMinor,
      taxable: true,
    });
    formula.daily = { presentDays, rateMinor, amountMinor: earningsMinor };
  } else {
    // hourly
    const presentDays = input.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    if (input.attendance.length === 0) {
      exceptions.push({
        code: "MISSING_ATTENDANCE",
        severity: "review_required",
        message: "Hourly employee has no attendance rows; hours not invented.",
      });
    }
    const hours = presentDays * STANDARD_HOURS_PER_PRESENT_DAY;
    earningsMinor = hours * rateMinor;
    components.push({
      kind: "earning",
      code: "BASE",
      description: `Hourly wage × ${hours}h (${presentDays} days × ${STANDARD_HOURS_PER_PRESENT_DAY}h)`,
      amountMinor: earningsMinor,
      taxable: true,
    });
    formula.hourly = { presentDays, hours, rateMinor, amountMinor: earningsMinor, hoursSource: "attendance_present_x_8" };
  }

  const otHours = Math.max(0, input.overtimeHoursApproved ?? 0);
  if (otHours > 0) {
    const otMinor = otHours * rateMinor; // 1x rate unless OT multiplier configured (not invented)
    earningsMinor += otMinor;
    components.push({
      kind: "earning",
      code: "OVERTIME",
      description: `Approved overtime ${otHours}h at base rate (no OT multiplier configured)`,
      amountMinor: otMinor,
      taxable: true,
    });
    formula.overtime = { otHours, amountMinor: otMinor, multiplier: 1 };
  }

  const allowanceMinor = toMinor(input.allowancesMajor ?? 0);
  if (allowanceMinor > 0) {
    earningsMinor += allowanceMinor;
    components.push({
      kind: "earning",
      code: "ALLOWANCE",
      description: "Approved allowance",
      amountMinor: allowanceMinor,
      taxable: true,
    });
  }

  const absentDays = input.attendance.filter((a) => a.status === "ABSENT").length;
  if (absentDays > 0) {
    exceptions.push({
      code: "ABSENCE_REVIEW",
      severity: "review_required",
      message: `${absentDays} ABSENT day(s) recorded — not auto-deducted without explicit unpaid-absence policy.`,
    });
  }

  const approvedLeaves = input.leaves.filter((l) => l.status === "APPROVED");
  if (approvedLeaves.length > 0) {
    exceptions.push({
      code: "LEAVE_REVIEW",
      severity: "review_required",
      message: "Approved leave present — unpaid leave deduction not applied without explicit unpaid leave configuration.",
    });
  }

  // Statutory withholding foundation — unavailable without active configured rules
  exceptions.push({
    code: "STATUTORY_DEFERRED",
    severity: "unavailable",
    message: "Pakistan statutory withholding UNAVAILABLE until approved rule configs are activated.",
  });

  let deductionsMinor = toMinor(input.otherDeductionsMajor ?? 0);
  if (deductionsMinor > 0) {
    components.push({
      kind: "deduction",
      code: "OTHER",
      description: "Authorized other deduction",
      amountMinor: deductionsMinor,
      taxable: false,
    });
  }

  const grossMinor = earningsMinor;
  let netMinor = grossMinor - deductionsMinor;
  let lineStatus: EmployeeCalcResult["lineStatus"] = "ok";
  if (exceptions.some((e) => e.severity === "blocked")) lineStatus = "blocked";
  else if (exceptions.some((e) => e.severity === "review_required")) lineStatus = "review_required";
  else if (exceptions.some((e) => e.severity === "unavailable") && grossMinor === 0) lineStatus = "unavailable";

  if (netMinor < 0) {
    exceptions.push({
      code: "NEGATIVE_NET_PAY",
      severity: "blocked",
      message: "Net pay would be negative; blocked by policy.",
    });
    lineStatus = "blocked";
    netMinor = 0;
  }

  return {
    lineStatus,
    exceptions,
    components,
    earningsMinor,
    deductionsMinor,
    adjustmentsMinor: 0,
    grossMinor,
    netMinor,
    formula,
    inputSnapshot: {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodDays,
      attendanceCount: input.attendance.length,
      leaveCount: approvedLeaves.length,
      compensationProfileId: input.compensation.id,
      currency: input.compensation.currency,
    },
  };
}
