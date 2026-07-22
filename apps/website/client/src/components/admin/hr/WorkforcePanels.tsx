import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function ShiftPlanner() {
  return (
    <AdminSurface aria-labelledby="shift-planner-heading" className="mb-6">
      <AdminSurfaceHeader title="Shift planner" description="Morning, evening, night, split — requires roster backend." />
      <AdminSurfaceBody>
        <h2 id="shift-planner-heading" className="sr-only">
          Shift planner
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Shift scheduling foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            staff.shift_name exists as text — no weekly roster, branch assignment, or split-shift planner API.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function AttendancePanel() {
  return (
    <AdminSurface aria-labelledby="attendance-panel-heading" className="mb-6">
      <AdminSurfaceHeader title="Attendance" description="Clock in/out, manual entry, biometric — verified integrations only." />
      <AdminSurfaceBody>
        <h2 id="attendance-panel-heading" className="sr-only">
          Attendance
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Attendance ledger unavailable</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No clock events, timesheets, or attendance API. Frontend will not simulate clock-in or clock-out records.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function LeaveManagement() {
  const leaveTypes = ["Annual", "Sick", "Emergency", "Casual", "Unpaid", "Maternity", "Paternity"];

  return (
    <AdminSurface aria-labelledby="leave-management-heading" className="mb-6">
      <AdminSurfaceHeader title="Leave management" description="Leave types require backend balances and approval workflow." />
      <AdminSurfaceBody>
        <h2 id="leave-management-heading" className="sr-only">
          Leave management
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="text-center font-semibold text-[var(--admin-ink)]">Leave foundation</p>
          <p className="mt-2 text-center text-sm text-[var(--admin-muted)]">
            No leave balances or approval API — types below are placeholders only.
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {leaveTypes.map((type) => (
              <li
                key={type}
                className="rounded-full border border-dashed border-[var(--admin-border)] px-3 py-1 text-xs text-[var(--admin-muted)]"
              >
                {type} · unavailable
              </li>
            ))}
          </ul>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PayrollOverview() {
  return (
    <AdminSurface aria-labelledby="payroll-overview-heading" className="mb-6">
      <AdminSurfaceHeader title="Payroll overview" description="Summary only when payroll backend exists — never calculate salaries." />
      <AdminSurfaceBody>
        <h2 id="payroll-overview-heading" className="sr-only">
          Payroll overview
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Payroll foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No payroll runs, payslips, or salary structures. Frontend cannot process or calculate payroll.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PerformancePanel() {
  return (
    <AdminSurface aria-labelledby="performance-panel-heading" className="mb-6">
      <AdminSurfaceHeader title="Performance reviews" description="Goals, reviews, warnings — verified backend only." />
      <AdminSurfaceBody>
        <h2 id="performance-panel-heading" className="sr-only">
          Performance reviews
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Performance foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No goals, review cycles, warnings, or achievement records in repository.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function TrainingCenter() {
  return (
    <AdminSurface aria-labelledby="training-center-heading" className="mb-6">
      <AdminSurfaceHeader title="Training center" description="Courses, certificates, compliance onboarding." />
      <AdminSurfaceBody>
        <h2 id="training-center-heading" className="sr-only">
          Training center
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Training not configured</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No courses, certificates, or food-safety compliance tracking API.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function EmployeeDocuments() {
  const docTypes = ["CNIC", "Passport", "Contract", "NDA", "Certificates", "Medical"];

  return (
    <AdminSurface aria-labelledby="employee-documents-heading" className="mb-6">
      <AdminSurfaceHeader title="Employee documents" description="Secure storage required — no fake document rows." />
      <AdminSurfaceBody>
        <h2 id="employee-documents-heading" className="sr-only">
          Employee documents
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="text-center font-semibold text-[var(--admin-ink)]">Document storage unavailable</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {docTypes.map((type) => (
              <li
                key={type}
                className="rounded-full border border-dashed border-[var(--admin-border)] px-3 py-1 text-xs text-[var(--admin-muted)]"
              >
                {type} · foundation
              </li>
            ))}
          </ul>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function HRAnalytics() {
  return (
    <AdminSurface aria-labelledby="hr-analytics-heading" className="mb-6">
      <AdminSurfaceHeader title="HR analytics" description="Attendance, leave, turnover — verified data only." />
      <AdminSurfaceBody>
        <h2 id="hr-analytics-heading" className="sr-only">
          HR analytics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Attendance trend", "Leave trend", "Department size", "Turnover", "Training status", "Payroll status"].map(
            (label) => (
              <div
                key={label}
                className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4 text-center text-sm"
              >
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">Foundation</p>
              </div>
            ),
          )}
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
