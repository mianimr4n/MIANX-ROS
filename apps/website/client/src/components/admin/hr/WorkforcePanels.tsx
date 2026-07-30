import { useState, type FormEvent } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import {
  createHrAttendance,
  createHrDocument,
  createHrLeave,
  decideHrLeave,
  type HrAttendance,
  type HrAttendanceStatus,
  type HrDocumentType,
  type HrEmployee,
  type HrEmployeeDocument,
  type HrLeaveRequest,
  type HrLeaveType,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

export function ShiftPlanner() {
  return (
    <AdminSurface aria-labelledby="shift-planner-heading" className="mb-6">
      <AdminSurfaceHeader title="Shift planner" description="Morning, evening, night, split — requires roster backend." />
      <AdminSurfaceBody>
        <h2 id="shift-planner-heading" className="sr-only">
          Shift planner
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Shift scheduling — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            staff.shift_name exists as text — no weekly roster, branch assignment, or split-shift planner API.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function AttendancePanel({
  attendance,
  employees,
  branchId,
  accessToken,
  canManage,
  loading,
  error,
  onRefresh,
}: {
  attendance: HrAttendance[] | null;
  employees: HrEmployee[] | null;
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [action, setAction] = useState<"check_in" | "check_out">("check_in");
  const [status, setStatus] = useState<HrAttendanceStatus>("PRESENT");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to mark attendance.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createHrAttendance(accessToken, {
        branchId,
        employeeId,
        action,
        status: action === "check_in" ? status : undefined,
      });
      setShowForm(false);
      setEmployeeId("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to record attendance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminSurface aria-labelledby="attendance-panel-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Attendance"
        description="Record check-in and check-out for staff today."
        action={
          canManage && branchId ? (
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
              }}
              className="min-h-9 rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-semibold text-[var(--admin-panel)]"
            >
              {showForm ? "Cancel" : "Mark Attendance"}
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="attendance-panel-heading" className="sr-only">
          Attendance
        </h2>

        {showForm ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Employee
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} · {emp.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Action
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as "check_in" | "check_out")}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="check_in">Check in</option>
                <option value="check_out">Check out</option>
              </select>
            </label>
            {action === "check_in" ? (
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as HrAttendanceStatus)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">On leave</option>
                </select>
              </label>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
        ) : null}

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view attendance.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading attendance…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : !attendance || attendance.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No attendance records yet
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {attendance.slice(0, 12).map((row) => (
              <li key={row.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <p className="font-semibold">
                  {row.employeeName ?? "—"} · {row.status}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  In: {row.checkInTime ? new Date(row.checkInTime).toLocaleString() : "—"} · Out:{" "}
                  {row.checkOutTime ? new Date(row.checkOutTime).toLocaleString() : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function LeaveManagement({
  leaves,
  employees,
  branchId,
  accessToken,
  canManage,
  loading,
  error,
  onRefresh,
}: {
  leaves: HrLeaveRequest[] | null;
  employees: HrEmployee[] | null;
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<HrLeaveType>("CASUAL");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [decideBusyId, setDecideBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to apply for leave.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createHrLeave(accessToken, {
        branchId,
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason: reason || null,
      });
      setShowForm(false);
      setReason("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create leave request.");
    } finally {
      setBusy(false);
    }
  }

  async function onDecide(leaveId: string, status: "APPROVED" | "REJECTED") {
    if (!accessToken) return;
    setDecideBusyId(leaveId);
    setFormError(null);
    try {
      await decideHrLeave(accessToken, leaveId, status);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to update leave.");
    } finally {
      setDecideBusyId(null);
    }
  }

  return (
    <AdminSurface aria-labelledby="leave-management-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Leave management"
        description="Review and decide staff leave requests."
        action={
          canManage && branchId ? (
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
              }}
              className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
            >
              {showForm ? "Cancel" : "Apply leave"}
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="leave-management-heading" className="sr-only">
          Leave management
        </h2>

        {showForm ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              Employee
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as HrLeaveType)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="CASUAL">CASUAL</option>
                <option value="SICK">SICK</option>
                <option value="ANNUAL">ANNUAL</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Start
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              End
              <input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Submit request"}
            </button>
          </form>
        ) : null}

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view leave requests.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading leave requests…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : !leaves || leaves.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No leave requests
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {leaves.map((row) => (
              <li key={row.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {row.employeeName ?? "—"} · {row.leaveType} · {row.status}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {row.startDate} → {row.endDate}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </p>
                  </div>
                  {canManage && row.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={decideBusyId === row.id}
                        onClick={() => void onDecide(row.id, "APPROVED")}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={decideBusyId === row.id}
                        onClick={() => void onDecide(row.id, "REJECTED")}
                        className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
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
          <p className="font-semibold text-[var(--admin-ink)]">Payroll overview — Planned for Phase 2</p>
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
          <p className="font-semibold text-[var(--admin-ink)]">Performance reviews — Planned for Phase 2</p>
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
          <p className="font-semibold text-[var(--admin-ink)]">Training — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No courses, certificates, or food-safety compliance tracking API.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function EmployeeDocuments({
  documents,
  employees,
  accessToken,
  canManage,
  loading,
  error,
  onRefresh,
}: {
  documents: HrEmployeeDocument[] | null;
  employees: HrEmployee[] | null;
  accessToken: string | undefined;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [documentType, setDocumentType] = useState<HrDocumentType>("CNIC");
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) {
      setFormError("Sign in required to add documents.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createHrDocument(accessToken, employeeId, { documentType, fileUrl });
      setShowForm(false);
      setFileUrl("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to add document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminSurface aria-labelledby="employee-documents-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Employee documents"
        description="Store document links for employee records."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
              }}
              className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
            >
              {showForm ? "Cancel" : "Add document"}
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="employee-documents-heading" className="sr-only">
          Employee documents
        </h2>

        {showForm ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Employee
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(employees ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as HrDocumentType)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="CNIC">CNIC</option>
                <option value="CONTRACT">CONTRACT</option>
                <option value="CERTIFICATE">CERTIFICATE</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              File URL
              <input
                required
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save document"}
            </button>
          </form>
        ) : null}

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading documents…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : !documents || documents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No employee documents yet
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <p className="font-semibold">
                  {doc.employeeName ?? "—"} · {doc.documentType}
                </p>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs font-medium text-[var(--brand-red)] hover:underline"
                >
                  {doc.fileUrl}
                </a>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
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
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">HR analytics — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Trend charts and turnover metrics require dedicated analytics APIs beyond raw attendance/leave lists.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
