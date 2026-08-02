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
    assert.match(page, /AttendanceCorrectionsPanel/);
    assert.match(page, /LeaveManagement/);
    assert.match(page, /PayrollOverview/);
    assert.match(page, /PerformancePanel/);
    assert.match(page, /TrainingCenter/);
    assert.match(page, /EmployeeDocuments/);
    assert.match(page, /HRAnalytics/);
    assert.doesNotMatch(page, /HRFoundationPanel|HRReadinessSections|Integration readiness/);
    assert.match(page, /WorkforceInsights/);
    assert.match(page, /canAccessAdminHr/);
    assert.match(page, /listHrAttendance/);
    assert.match(page, /listHrLeaves/);
    assert.match(page, /listHrDocuments/);
  });

  it("does not fabricate employees or attendance records", () => {
    const directory = read("apps/website/client/src/components/admin/hr/EmployeeDirectory.tsx");
    assert.match(directory, /Welcome! No staff added yet/);
    assert.match(directory, /Add Employee/);
    assert.doesNotMatch(directory, /EMP-\d+|employeeCode:\s*"|fakeStaff/i);
    const attendance = read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx");
    assert.match(attendance, /No attendance records yet/);
    assert.match(attendance, /createHrAttendance/);
    assert.match(attendance, /Mark Attendance/);
    assert.doesNotMatch(attendance, /Attendance ledger unavailable|will not simulate clock-in/);
    const assignments = read("apps/website/client/src/components/admin/hr/StaffAssignmentsPanel.tsx");
    assert.match(assignments, /Staff assignment data unavailable/);
    assert.match(assignments, /loadFailed/);
    assert.doesNotMatch(assignments, /const empty = !loading && \(rows\?\.length \?\? 0\) === 0/);
  });

  it("wires leave and documents with honest payroll calculation UI", () => {
    const panels = read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx");
    assert.match(panels, /paymentTriggered=false/);
    assert.match(panels, /calculationStatus/);
    assert.match(panels, /paymentMessage/);
    assert.match(panels, /No payroll runs yet/);
    assert.match(panels, /Exception queue/);
    assert.match(panels, /Mark payment ready/);
    assert.match(panels, /No leave requests/);
    assert.match(panels, /createHrLeave/);
    assert.match(panels, /decideHrLeave/);
    assert.match(panels, /rejectionReason/);
    assert.match(panels, /leaveBalanceMessage/);
    assert.match(panels, /Approve/);
    assert.match(panels, /Reject/);
    assert.match(panels, /No employee documents yet/);
    assert.match(panels, /uploadHrDocument/);
    assert.match(panels, /fetchHrDocumentDownloadUrl/);
    assert.match(panels, /DocumentUploadDropzone/);
    assert.match(panels, /Performance reviews — Planned for Phase 2/);
    assert.doesNotMatch(panels, /leaveBalance:\s*\d/);
    assert.doesNotMatch(panels, /placeholders only|Document storage unavailable|Attendance ledger unavailable/);
  });

  it("roles panel uses seeded permissions only", () => {
    const roles = read("apps/website/client/src/components/admin/hr/RolesPermissionPanel.tsx");
    assert.match(roles, /SEEDED_PERMISSIONS/);
    assert.match(roles, /SEEDED_ROLES/);
    assert.match(roles, /no invented permission/i);
    const helper = read("apps/website/client/src/lib/admin-hr.ts");
    assert.match(helper, /staff\.read/);
    assert.match(helper, /staff\.create/);
    assert.match(helper, /hr\.manage/);
  });

  it("Mianx workforce insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/hr/WorkforceInsights.tsx");
    assert.match(insights, /Mianx\.ai Workforce Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Live attendance, leave, documents, shifts, and payroll calc/);
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

  it("integration checks document live attendance/leave/documents and RC4-3 payroll", () => {
    const helper = read("apps/website/client/src/lib/admin-hr.ts");
    assert.match(helper, /hr_attendance/);
    assert.match(helper, /hr_leave_requests/);
    assert.match(helper, /hr_employee_documents/);
    assert.match(helper, /GET\/POST \/admin\/hr\/employees/);
    assert.match(helper, /hr_employees/);
    assert.match(helper, /id: "attendance"[\s\S]*status: "present"/);
    assert.match(helper, /id: "leave"[\s\S]*status: "present"/);
    assert.match(helper, /id: "documents"[\s\S]*status: "present"/);
    assert.match(helper, /id: "payroll"[\s\S]*status: "present"/);
    assert.match(helper, /paymentTriggered=false/);
  });
});
