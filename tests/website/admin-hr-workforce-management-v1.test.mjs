/**
 * HR & Workforce Management V1 — composition and honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("HR & Workforce Management V1 (static)", () => {
  it("composes /admin/hr from reusable workforce components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminHr.tsx");
    assert.match(page, /HRHeader/);
    assert.match(page, /HRStatusBanner/);
    assert.match(page, /HRKPIs/);
    assert.match(page, /OrganizationTree/);
    assert.match(page, /DepartmentManager/);
    assert.match(page, /EmployeeDirectory/);
    assert.match(page, /EmployeeDrawer/);
    assert.match(page, /RolesPermissionPanel/);
    assert.match(page, /ShiftPlanner/);
    assert.match(page, /AttendancePanel/);
    assert.match(page, /LeaveManagement/);
    assert.match(page, /PayrollOverview/);
    assert.match(page, /PerformancePanel/);
    assert.match(page, /TrainingCenter/);
    assert.match(page, /EmployeeDocuments/);
    assert.match(page, /HRAnalytics/);
    assert.match(page, /HRFoundationPanel/);
    assert.match(page, /WorkforceInsights/);
    assert.match(page, /canAccessAdminHr/);
  });

  it("does not fabricate employees or attendance records", () => {
    const directory = read("apps/website/client/src/components/admin/hr/EmployeeDirectory.tsx");
    assert.match(directory, /No employees added yet/);
    assert.match(directory, /listHrEmployees|HrEmployee|GET \/admin\/hr\/employees/);
    assert.doesNotMatch(directory, /EMP-\d+|employeeCode:\s*"|fakeStaff/i);
    const attendance = read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx");
    assert.match(attendance, /will not simulate clock-in/);
    assert.doesNotMatch(attendance, /clockIn|clockOut|attendanceRecord/i);
    const assignments = read("apps/website/client/src/components/admin/hr/StaffAssignmentsPanel.tsx");
    assert.match(assignments, /Staff assignment data unavailable/);
    assert.match(assignments, /loadFailed/);
    assert.doesNotMatch(assignments, /const empty = !loading && \(rows\?\.length \?\? 0\) === 0/);
  });

  it("does not calculate payroll or leave balances", () => {
    const payroll = read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx");
    assert.match(payroll, /Payroll foundation/);
    assert.match(payroll, /cannot process or calculate payroll/);
    assert.match(payroll, /No leave balances/);
    assert.doesNotMatch(payroll, /salaryAmount|netPay|leaveBalance:\s*\d/i);
  });

  it("roles panel uses seeded permissions only", () => {
    const roles = read("apps/website/client/src/components/admin/hr/RolesPermissionPanel.tsx");
    assert.match(roles, /SEEDED_PERMISSIONS/);
    assert.match(roles, /SEEDED_ROLES/);
    assert.match(roles, /no invented permission/i);
    const helper = read("apps/website/client/src/lib/admin-hr.ts");
    assert.match(helper, /staff\.read/);
    assert.match(helper, /staff\.create/);
    assert.doesNotMatch(helper, /hr\.manage|permissions\.includes\("hr\./);
  });

  it("Mianx workforce insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/hr/WorkforceInsights.tsx");
    assert.match(insights, /Mianx\.ai Workforce Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Missing documents/);
    assert.doesNotMatch(insights, /employee scoring|hiring recommendations|salary recommendations|termination recommendations/i);
  });

  it("gates /admin/hr with canAccessAdminHr (staff.read)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminHr/);
    assert.match(access, /staff\.read/);
    assert.match(access, /requiresHr/);
    assert.match(access, /href: "\/admin\/hr"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminHr/);
    assert.match(app, /path="\/admin\/hr"/);
    const page = read("apps/website/client/src/pages/admin/AdminHr.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document missing workforce backend", () => {
    const helper = read("apps/website/client/src/lib/admin-hr.ts");
    assert.match(helper, /attendance_events/);
    assert.match(helper, /leave_balances/);
    assert.match(helper, /payroll_runs/);
    assert.match(helper, /GET\/POST \/admin\/hr\/employees/);
    assert.match(helper, /hr_employees/);
  });
});
