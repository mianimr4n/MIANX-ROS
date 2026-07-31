import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lifecycle = readFileSync(
  join(root, "supabase/migrations/20260731050000_hr_employee_lifecycle.sql"),
  "utf8",
);
const shifts = readFileSync(
  join(root, "supabase/migrations/20260731060000_hr_shift_scheduling.sql"),
  "utf8",
);
const attendanceLeave = readFileSync(
  join(root, "supabase/migrations/20260731070000_hr_attendance_leave_hardening.sql"),
  "utf8",
);
const payroll = readFileSync(
  join(root, "supabase/migrations/20260731080000_hr_payroll_foundation.sql"),
  "utf8",
);

describe("RC3 workforce migrations", () => {
  it("extends employees with number uniqueness and audit events", () => {
    assert.match(lifecycle, /employee_number/);
    assert.match(lifecycle, /uq_hr_employees_branch_number/);
    assert.match(lifecycle, /deactivation_reason/);
    assert.match(lifecycle, /create table if not exists public\.hr_employee_events/);
    assert.match(lifecycle, /enable row level security/);
  });

  it("creates shift templates and overlap exclusion", () => {
    assert.match(shifts, /create table if not exists public\.hr_shift_templates/);
    assert.match(shifts, /create table if not exists public\.hr_scheduled_shifts/);
    assert.match(shifts, /hr_scheduled_shifts_no_overlap/);
    assert.match(shifts, /exclude using gist/);
    assert.match(shifts, /status in \('draft', 'published', 'confirmed', 'completed', 'cancelled'\)/);
    assert.doesNotMatch(shifts, /insert into public\.hr_shift_templates/i);
  });

  it("adds attendance corrections without silent overwrite design", () => {
    assert.match(attendanceLeave, /create table if not exists public\.hr_attendance_corrections/);
    assert.match(attendanceLeave, /original_check_in/);
    assert.match(attendanceLeave, /proposed_check_in/);
    assert.match(attendanceLeave, /scheduled_shift_id/);
    assert.match(attendanceLeave, /CANCELLED/);
    assert.match(attendanceLeave, /create table if not exists public\.hr_leave_events/);
  });

  it("adds payroll foundation without payment flags or bank credentials", () => {
    assert.match(payroll, /create table if not exists public\.hr_compensation_profiles/);
    assert.match(payroll, /create table if not exists public\.hr_pay_periods/);
    assert.match(payroll, /create table if not exists public\.hr_payroll_runs/);
    assert.match(payroll, /calculation_status/);
    assert.match(payroll, /unavailable/);
    assert.doesNotMatch(payroll, /bank_account|iban|paid_at|payment_triggered/i);
    assert.doesNotMatch(payroll, /insert into public\.hr_compensation/i);
  });
});
