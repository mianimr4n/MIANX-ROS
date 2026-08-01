import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { DocumentUploadDropzone } from "@/components/documents/DocumentUploadDropzone";
import {
  approveHrPayrollRun,
  calculateHrPayrollRun,
  cancelHrLeave,
  cancelHrShift,
  createHrAttendance,
  createHrLeave,
  createHrPayPeriod,
  createHrPayrollRun,
  createHrShift,
  createHrShiftTemplate,
  decideHrAttendanceCorrection,
  decideHrLeave,
  fetchHrDocumentDownloadUrl,
  listHrCompensation,
  listHrPayPeriods,
  listHrPayrollExceptions,
  listHrPayrollLines,
  listHrPayrollRuns,
  listHrPayslips,
  listHrShiftTemplates,
  listHrShifts,
  lockHrPayrollRun,
  markHrPayrollPaymentReady,
  publishHrShift,
  uploadHrDocument,
  type HrAttendance,
  type HrAttendanceCorrection,
  type HrAttendanceStatus,
  type HrDocumentType,
  type HrEmployee,
  type HrEmployeeDocument,
  type HrLeaveRequest,
  type HrLeaveType,
  type HrPayPeriod,
  type HrPayrollException,
  type HrPayrollLine,
  type HrPayrollRun,
  type HrPayslip,
  type HrScheduledShift,
  type HrShiftTemplate,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

function startOfWeekIso(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShiftTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ShiftPlanner({
  branchId,
  accessToken,
  canManage,
  employees,
}: {
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
  employees: HrEmployee[] | null;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());
  const weekEnd = useMemo(() => addDaysIso(weekStart, 6), [weekStart]);
  const [templates, setTemplates] = useState<HrShiftTemplate[] | null>(null);
  const [shifts, setShifts] = useState<HrScheduledShift[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateStart, setTemplateStart] = useState("09:00");
  const [templateEnd, setTemplateEnd] = useState("17:00");
  const [shiftEmployeeId, setShiftEmployeeId] = useState("");
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftStartsAt, setShiftStartsAt] = useState("09:00");
  const [shiftEndsAt, setShiftEndsAt] = useState("17:00");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !branchId) {
      setTemplates(null);
      setShifts(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [tplRows, shiftRows] = await Promise.all([
        listHrShiftTemplates(accessToken, { branchId }),
        listHrShifts(accessToken, { branchId, from: weekStart, to: weekEnd }),
      ]);
      setTemplates(tplRows);
      setShifts(shiftRows);
      setError(null);
    } catch (err) {
      setTemplates(null);
      setShifts(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load shift schedule.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId, weekEnd, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateTemplate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) return;
    setBusy(true);
    setConflictMessage(null);
    try {
      await createHrShiftTemplate(accessToken, {
        branchId,
        name: templateName,
        startTime: templateStart,
        endTime: templateEnd,
      });
      setShowTemplateForm(false);
      setTemplateName("");
      await load();
    } catch (err) {
      setConflictMessage(err instanceof ApiRequestError ? err.message : "Failed to create template.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateShift(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId || !shiftEmployeeId) return;
    setBusy(true);
    setConflictMessage(null);
    try {
      const startsAt = `${shiftDate}T${shiftStartsAt}:00`;
      const endsAt = `${shiftDate}T${shiftEndsAt}:00`;
      await createHrShift(accessToken, {
        branchId,
        employeeId: shiftEmployeeId,
        shiftDate,
        startsAt,
        endsAt,
        status: "draft",
      });
      setShowShiftForm(false);
      await load();
    } catch (err) {
      setConflictMessage(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to create shift. This employee may already have an overlapping shift.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(shiftId: string) {
    if (!accessToken) return;
    setBusy(true);
    setConflictMessage(null);
    try {
      await publishHrShift(accessToken, shiftId);
      await load();
    } catch (err) {
      setConflictMessage(err instanceof ApiRequestError ? err.message : "Failed to publish shift.");
    } finally {
      setBusy(false);
    }
  }

  async function onCancelShift(shiftId: string) {
    if (!accessToken) return;
    const reason = window.prompt("Cancellation reason?");
    if (!reason?.trim()) return;
    setBusy(true);
    setConflictMessage(null);
    try {
      await cancelHrShift(accessToken, shiftId, reason.trim());
      await load();
    } catch (err) {
      setConflictMessage(err instanceof ApiRequestError ? err.message : "Failed to cancel shift.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminSurface aria-labelledby="shift-planner-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Shift planner"
        description="Branch-scoped templates and weekly roster from live scheduling API."
        action={
          canManage && branchId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateForm((v) => !v)}
                className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
              >
                {showTemplateForm ? "Cancel template" : "Add template"}
              </button>
              <button
                type="button"
                onClick={() => setShowShiftForm((v) => !v)}
                className="min-h-9 rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-semibold text-[var(--admin-panel)]"
              >
                {showShiftForm ? "Cancel shift" : "Add shift"}
              </button>
            </div>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="shift-planner-heading" className="sr-only">
          Shift planner
        </h2>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="rounded-lg border border-[var(--admin-border)] px-3 py-1.5 font-semibold"
            onClick={() => setWeekStart((prev) => addDaysIso(prev, -7))}
          >
            Previous week
          </button>
          <span className="text-[var(--admin-muted)]">
            {weekStart} → {weekEnd}
          </span>
          <button
            type="button"
            className="rounded-lg border border-[var(--admin-border)] px-3 py-1.5 font-semibold"
            onClick={() => setWeekStart((prev) => addDaysIso(prev, 7))}
          >
            Next week
          </button>
        </div>

        {conflictMessage ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {conflictMessage}
          </p>
        ) : null}

        {showTemplateForm ? (
          <form onSubmit={(e) => void onCreateTemplate(e)} className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-3">
              Template name
              <input
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Start
              <input
                required
                type="time"
                value={templateStart}
                onChange={(e) => setTemplateStart(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              End
              <input
                required
                type="time"
                value={templateEnd}
                onChange={(e) => setTemplateEnd(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save template"}
            </button>
          </form>
        ) : null}

        {showShiftForm ? (
          <form onSubmit={(e) => void onCreateShift(e)} className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              Employee
              <select
                required
                value={shiftEmployeeId}
                onChange={(e) => setShiftEmployeeId(e.target.value)}
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
              Date
              <input
                required
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Start
              <input
                required
                type="time"
                value={shiftStartsAt}
                onChange={(e) => setShiftStartsAt(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              End
              <input
                required
                type="time"
                value={shiftEndsAt}
                onChange={(e) => setShiftEndsAt(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save draft shift"}
            </button>
          </form>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view shift schedules.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading shift schedule…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Templates</p>
              {!templates || templates.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4 text-sm text-[var(--admin-muted)]">
                  No shift templates yet
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {templates.map((tpl) => (
                    <li key={tpl.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <p className="font-semibold">
                        {tpl.name} · {tpl.startTime.slice(0, 5)}–{tpl.endTime.slice(0, 5)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {tpl.isActive ? "Active" : "Inactive"}
                        {tpl.operationalRole ? ` · ${tpl.operationalRole}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Weekly shifts</p>
              {!shifts || shifts.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4 text-sm text-[var(--admin-muted)]">
                  No shifts scheduled this week
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {shifts.map((shift) => (
                    <li key={shift.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {shift.employeeName ?? "—"} · {shift.shiftDate} · {shift.status}
                          </p>
                          <p className="mt-1 text-xs text-[var(--admin-muted)]">
                            {formatShiftTime(shift.startsAt)}–{formatShiftTime(shift.endsAt)}
                            {shift.operationalRole ? ` · ${shift.operationalRole}` : ""}
                          </p>
                          {shift.cancelReason ? (
                            <p className="mt-1 text-xs text-amber-800">Cancelled: {shift.cancelReason}</p>
                          ) : null}
                        </div>
                        {canManage && shift.status === "draft" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onPublish(shift.id)}
                              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                            >
                              Publish
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onCancelShift(shift.id)}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
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
                  {row.isUnscheduled ? " · Unscheduled" : ""}
                  {row.scheduledShiftId ? ` · Shift ${row.scheduledShiftId.slice(0, 8)}` : ""}
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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
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

  async function onDecide(leaveId: string, status: "APPROVED" | "REJECTED", reason?: string) {
    if (!accessToken) return;
    setDecideBusyId(leaveId);
    setFormError(null);
    try {
      await decideHrLeave(accessToken, leaveId, {
        status,
        rejectionReason: status === "REJECTED" ? reason ?? null : null,
      });
      setRejectingId(null);
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to update leave.");
    } finally {
      setDecideBusyId(null);
    }
  }

  async function onCancel(leaveId: string) {
    if (!accessToken) return;
    const reason = window.prompt("Cancellation reason (optional)?");
    if (reason === null) return;
    setDecideBusyId(leaveId);
    setFormError(null);
    try {
      await cancelHrLeave(accessToken, leaveId, reason.trim() || null);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to cancel leave.");
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
                    {row.leaveBalanceMessage ? (
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">{row.leaveBalanceMessage}</p>
                    ) : null}
                    {row.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-700">Rejected: {row.rejectionReason}</p>
                    ) : null}
                  </div>
                  {canManage && row.status === "PENDING" ? (
                    <div className="flex flex-col gap-2">
                      {rejectingId === row.id ? (
                        <div className="w-full min-w-[12rem] space-y-2">
                          <input
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Rejection reason (required)"
                            className="min-h-9 w-full rounded-lg border border-[var(--admin-border)] px-2 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={decideBusyId === row.id || !rejectionReason.trim()}
                              onClick={() => void onDecide(row.id, "REJECTED", rejectionReason.trim())}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Confirm reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionReason("");
                              }}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
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
                            onClick={() => {
                              setRejectingId(row.id);
                              setRejectionReason("");
                            }}
                            className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {canManage && (row.status === "PENDING" || row.status === "APPROVED") ? (
                    <button
                      type="button"
                      disabled={decideBusyId === row.id}
                      onClick={() => void onCancel(row.id)}
                      className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                    >
                      Cancel
                    </button>
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

export function AttendanceCorrectionsPanel({
  corrections,
  branchId,
  accessToken,
  canManage,
  loading,
  error,
  onRefresh,
}: {
  corrections: HrAttendanceCorrection[] | null;
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [decideBusyId, setDecideBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const pending = (corrections ?? []).filter((row) => row.status === "pending");

  async function onDecide(correctionId: string, status: "approved" | "rejected", reason?: string) {
    if (!accessToken) return;
    setDecideBusyId(correctionId);
    setFormError(null);
    try {
      await decideHrAttendanceCorrection(accessToken, correctionId, {
        status,
        rejectionReason: status === "rejected" ? reason ?? null : null,
      });
      setRejectingId(null);
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to review correction.");
    } finally {
      setDecideBusyId(null);
    }
  }

  return (
    <AdminSurface aria-labelledby="attendance-corrections-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Attendance corrections"
        description="Review pending attendance correction requests."
      />
      <AdminSurfaceBody>
        <h2 id="attendance-corrections-heading" className="sr-only">
          Attendance corrections
        </h2>

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to review corrections.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading corrections…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No pending attendance corrections
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {pending.map((row) => (
              <li key={row.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.employeeName ?? "—"} · {row.status}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">{row.reason}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      Proposed: {row.proposedStatus ?? "—"} · In {row.proposedCheckIn ? new Date(row.proposedCheckIn).toLocaleString() : "—"}
                    </p>
                  </div>
                  {canManage ? (
                    rejectingId === row.id ? (
                      <div className="w-full min-w-[12rem] space-y-2 sm:w-auto">
                        <input
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Rejection reason (required)"
                          className="min-h-9 w-full rounded-lg border border-[var(--admin-border)] px-2 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={decideBusyId === row.id || !rejectionReason.trim()}
                            onClick={() => void onDecide(row.id, "rejected", rejectionReason.trim())}
                            className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                          >
                            Confirm reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason("");
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={decideBusyId === row.id}
                          onClick={() => void onDecide(row.id, "approved")}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={decideBusyId === row.id}
                          onClick={() => {
                            setRejectingId(row.id);
                            setRejectionReason("");
                          }}
                          className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )
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

export function PayrollOverview({
  branchId,
  accessToken,
  canManage,
}: {
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
}) {
  const [compensation, setCompensation] = useState<Awaited<ReturnType<typeof listHrCompensation>> | null>(null);
  const [payPeriods, setPayPeriods] = useState<HrPayPeriod[] | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<HrPayrollRun[] | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [lines, setLines] = useState<HrPayrollLine[] | null>(null);
  const [exceptions, setExceptions] = useState<HrPayrollException[] | null>(null);
  const [payslips, setPayslips] = useState<HrPayslip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !branchId) {
      setCompensation(null);
      setPayPeriods(null);
      setPayrollRuns(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [compRows, periodRows, runRows] = await Promise.all([
        listHrCompensation(accessToken, { branchId }),
        listHrPayPeriods(accessToken, { branchId }),
        listHrPayrollRuns(accessToken, { branchId }),
      ]);
      setCompensation(compRows);
      setPayPeriods(periodRows);
      setPayrollRuns(runRows);
      setError(null);
    } catch (err) {
      setCompensation(null);
      setPayPeriods(null);
      setPayrollRuns(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load payroll.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId]);

  const loadRunDetail = useCallback(
    async (runId: string) => {
      if (!accessToken) return;
      setSelectedRunId(runId);
      try {
        const [lineRows, exRows, slipRows] = await Promise.all([
          listHrPayrollLines(accessToken, runId),
          listHrPayrollExceptions(accessToken, runId),
          listHrPayslips(accessToken, runId),
        ]);
        setLines(lineRows);
        setExceptions(exRows);
        setPayslips(slipRows);
      } catch {
        setLines([]);
        setExceptions([]);
        setPayslips([]);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreatePeriod() {
    if (!accessToken || !branchId) return;
    const periodStart = window.prompt("Period start (YYYY-MM-DD)?");
    const periodEnd = window.prompt("Period end (YYYY-MM-DD)?");
    if (!periodStart || !periodEnd) return;
    setActionError(null);
    try {
      const period = await createHrPayPeriod(accessToken, { branchId, periodStart, periodEnd });
      await createHrPayrollRun(accessToken, { payPeriodId: period.id });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to create pay period.");
    }
  }

  async function onRunAction(
    runId: string,
    action: "calculate" | "approve" | "lock" | "payment_ready",
  ) {
    if (!accessToken) return;
    setBusyRunId(runId);
    setActionError(null);
    try {
      if (action === "calculate") await calculateHrPayrollRun(accessToken, runId);
      if (action === "approve") await approveHrPayrollRun(accessToken, runId);
      if (action === "lock") await lockHrPayrollRun(accessToken, runId);
      if (action === "payment_ready") await markHrPayrollPaymentReady(accessToken, runId);
      await load();
      await loadRunDetail(runId);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Payroll action failed.");
    } finally {
      setBusyRunId(null);
    }
  }

  function honestyLabel(run: HrPayrollRun): string {
    if (run.status === "review_required") return "REVIEW_REQUIRED";
    if (run.calculationStatus === "complete") return "LIVE";
    if (run.calculationStatus === "partial") return "REVIEW_REQUIRED";
    return "UNAVAILABLE";
  }

  return (
    <AdminSurface aria-labelledby="payroll-overview-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Payroll overview"
        description="RC4-3 calculation & approval — payments never silent; GL posting DEFERRED without Finance mappings."
        action={
          canManage && branchId ? (
            <button
              type="button"
              onClick={() => void onCreatePeriod()}
              className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
            >
              New pay period
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="payroll-overview-heading" className="sr-only">
          Payroll overview
        </h2>

        <p className="mb-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]">
          paymentTriggered=false until verified settlement. Statutory withholding UNAVAILABLE without approved configs.
          Accounting status DEFERRED (RC4-8 not on main).
        </p>

        {actionError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {actionError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view payroll.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading payroll…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Compensation profiles</p>
              {!compensation || compensation.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4 text-sm text-[var(--admin-muted)]">
                  No compensation profiles yet — missing compensation blocks calculation
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {compensation.slice(0, 5).map((row) => (
                    <li key={row.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <p className="font-semibold">
                        {row.employeeName ?? "—"} · {row.salaryType} · {row.currency} {row.baseRate}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        Effective {row.effectiveFrom}
                        {row.effectiveTo ? ` → ${row.effectiveTo}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Payroll runs</p>
              {!payrollRuns || payrollRuns.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4 text-sm text-[var(--admin-muted)]">
                  No payroll runs yet
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {payrollRuns.map((run) => (
                    <li key={run.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <p className="font-semibold">
                        Run · {run.status} · calc {run.calculationStatus} · {honestyLabel(run)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {run.calculationNote ?? "Not calculated yet."}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">{run.paymentMessage}</p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        Accounting: {run.accountingStatus ?? "PENDING"}
                        {run.accrualPostingBlockedReason ? ` — ${run.accrualPostingBlockedReason}` : ""} ·
                        paymentTriggered=false
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void loadRunDetail(run.id)}
                          className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold"
                        >
                          View lines / payslips
                        </button>
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              disabled={busyRunId === run.id}
                              onClick={() => void onRunAction(run.id, "calculate")}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Calculate
                            </button>
                            <button
                              type="button"
                              disabled={busyRunId === run.id}
                              onClick={() => void onRunAction(run.id, "approve")}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyRunId === run.id}
                              onClick={() => void onRunAction(run.id, "payment_ready")}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Mark payment ready
                            </button>
                            <button
                              type="button"
                              disabled={busyRunId === run.id}
                              onClick={() => void onRunAction(run.id, "lock")}
                              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                            >
                              Lock
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {payPeriods && payPeriods.length > 0 ? (
                <p className="mt-2 text-xs text-[var(--admin-muted)]">{payPeriods.length} pay period(s) on file.</p>
              ) : null}
            </div>

            {selectedRunId ? (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Exception queue</p>
                  {!exceptions || exceptions.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--admin-muted)]">No exceptions for this run.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {exceptions.map((ex) => (
                        <li key={ex.id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                          <span className="font-semibold">{ex.severity}</span> · {ex.exceptionCode}: {ex.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Employee calculation lines
                  </p>
                  {!lines || lines.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--admin-muted)]">No lines — calculate the run first.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {lines.map((line) => (
                        <li key={line.id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                          {line.lineStatus === "blocked" || line.lineStatus === "unavailable" ? (
                            <span>
                              Employee {line.employeeId.slice(0, 8)}… · {line.lineStatus.toUpperCase()} · see exceptions
                              (amounts not invented as zero)
                            </span>
                          ) : (
                            <span>
                              Employee {line.employeeId.slice(0, 8)}… · {line.lineStatus} · gross {line.currency}{" "}
                              {line.grossPay} · net {line.currency} {line.netPay}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Payslips (printable HTML — PDF deferred)
                  </p>
                  {!payslips || payslips.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--admin-muted)]">No payslips issued yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {payslips.map((slip) => (
                        <li key={slip.id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                          Payslip · {slip.paymentStatus} · gross {slip.currency} {slip.grossPay} · net {slip.currency}{" "}
                          {slip.netPay}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onFileReady(payload: {
    dataBase64: string;
    contentType: string;
    originalFilename: string;
  }) {
    if (!accessToken) {
      setFormError("Sign in required to add documents.");
      return;
    }
    if (!employeeId) {
      setFormError("Select an employee before uploading.");
      return;
    }
    setBusy(true);
    setProgress("Uploading to secure storage…");
    setFormError(null);
    try {
      await uploadHrDocument(accessToken, employeeId, {
        documentType,
        dataBase64: payload.dataBase64,
        contentType: payload.contentType,
        originalFilename: payload.originalFilename,
      });
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to upload document.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDownload(doc: HrEmployeeDocument) {
    if (!accessToken) return;
    try {
      const { url } = await fetchHrDocumentDownloadUrl(accessToken, doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Download failed.");
    }
  }

  return (
    <AdminSurface aria-labelledby="employee-documents-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Employee documents"
        description="Secure binary uploads (CNIC, contracts, certificates, policies). Branch-scoped RBAC."
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
              {showForm ? "Cancel" : "Upload document"}
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="employee-documents-heading" className="sr-only">
          Employee documents
        </h2>

        {showForm ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
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
                <option value="CNIC">CNIC / ID</option>
                <option value="CONTRACT">Employment contract</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="POLICY">Policy acknowledgement</option>
                <option value="OTHER">Other HR record</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <DocumentUploadDropzone
                busy={busy}
                progressLabel={progress}
                onFileReady={onFileReady}
                onError={(message) => setFormError(message)}
              />
            </div>
          </div>
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
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {doc.originalFilename ?? doc.mimeType ?? (doc.hasBinary ? "Binary" : "URL reference")}
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-[var(--brand-red)] hover:underline"
                  onClick={() => void onDownload(doc)}
                >
                  Download
                </button>
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
