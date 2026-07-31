import { describe, expect, it } from "vitest";

import {
  CALC_VERSION,
  calculateEmployeePayroll,
  daysInclusive,
  fromMinor,
  toMinor,
} from "../src/services/hr/payroll-calc.js";

describe("payroll-calc money helpers", () => {
  it("rounds to minor units without float drift", () => {
    expect(toMinor(100.1)).toBe(10010);
    expect(toMinor(0.005)).toBe(1);
    expect(fromMinor(10010)).toBe(100.1);
  });

  it("counts inclusive period days", () => {
    expect(daysInclusive("2026-07-01", "2026-07-31")).toBe(31);
    expect(daysInclusive("2026-07-01", "2026-07-01")).toBe(1);
  });
});

describe("payroll-calc engine", () => {
  const baseComp = {
    id: "comp-1",
    salaryType: "monthly" as const,
    baseRateMajor: 50000,
    currency: "PKR",
  };

  it("calculates monthly base salary", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: baseComp,
      attendance: [],
      leaves: [],
    });
    expect(result.lineStatus).toBe("ok");
    expect(result.grossMinor).toBe(5_000_000);
    expect(result.netMinor).toBe(5_000_000);
    expect(result.formula.version).toBe(CALC_VERSION);
    expect(result.exceptions.some((e) => e.code === "STATUTORY_DEFERRED")).toBe(true);
  });

  it("calculates hourly from present days × 8h", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-07",
      compensation: { ...baseComp, salaryType: "hourly", baseRateMajor: 500 },
      attendance: [
        { workDate: "2026-07-01", status: "PRESENT" },
        { workDate: "2026-07-02", status: "LATE" },
      ],
      leaves: [],
    });
    expect(result.grossMinor).toBe(2 * 8 * 50_000);
    expect(result.lineStatus).toBe("ok");
  });

  it("marks hourly without attendance as review_required", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-07",
      compensation: { ...baseComp, salaryType: "hourly", baseRateMajor: 500 },
      attendance: [],
      leaves: [],
    });
    expect(result.lineStatus).toBe("review_required");
    expect(result.exceptions.some((e) => e.code === "MISSING_ATTENDANCE")).toBe(true);
    expect(result.grossMinor).toBe(0);
  });

  it("calculates daily wage from present/late days", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-07",
      compensation: { ...baseComp, salaryType: "daily", baseRateMajor: 2000 },
      attendance: [
        { workDate: "2026-07-01", status: "PRESENT" },
        { workDate: "2026-07-02", status: "ABSENT" },
        { workDate: "2026-07-03", status: "PRESENT" },
      ],
      leaves: [],
    });
    expect(result.grossMinor).toBe(400_000);
    expect(result.lineStatus).toBe("review_required");
    expect(result.exceptions.some((e) => e.code === "ABSENCE_REVIEW")).toBe(true);
  });

  it("adds approved overtime at 1× base without inventing multiplier", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: baseComp,
      attendance: [],
      leaves: [],
      overtimeHoursApproved: 2,
    });
    const ot = result.components.find((c) => c.code === "OVERTIME");
    expect(ot?.amountMinor).toBe(2 * 5_000_000);
  });

  it("adds allowance earning", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: baseComp,
      attendance: [],
      leaves: [],
      allowancesMajor: 1500.5,
    });
    expect(result.components.some((c) => c.code === "ALLOWANCE")).toBe(true);
    expect(result.grossMinor).toBe(5_000_000 + 150_050);
  });

  it("applies other deductions and blocks negative net", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: { ...baseComp, baseRateMajor: 1000 },
      attendance: [],
      leaves: [],
      otherDeductionsMajor: 5000,
    });
    expect(result.lineStatus).toBe("blocked");
    expect(result.exceptions.some((e) => e.code === "NEGATIVE_NET_PAY")).toBe(true);
    expect(result.netMinor).toBe(0);
  });

  it("blocks missing compensation", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: null,
      attendance: [],
      leaves: [],
    });
    expect(result.lineStatus).toBe("blocked");
    expect(result.exceptions[0]?.code).toBe("MISSING_COMPENSATION");
  });

  it("does not auto-deduct approved leave without unpaid config", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: baseComp,
      attendance: [],
      leaves: [{ startDate: "2026-07-10", endDate: "2026-07-12", status: "APPROVED", leaveType: "ANNUAL" }],
    });
    expect(result.deductionsMinor).toBe(0);
    expect(result.exceptions.some((e) => e.code === "LEAVE_REVIEW")).toBe(true);
    expect(result.lineStatus).toBe("review_required");
  });

  it("preserves compensation profile id in snapshot", () => {
    const result = calculateEmployeePayroll({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      compensation: baseComp,
      attendance: [],
      leaves: [],
    });
    expect(result.inputSnapshot.compensationProfileId).toBe("comp-1");
  });
});
