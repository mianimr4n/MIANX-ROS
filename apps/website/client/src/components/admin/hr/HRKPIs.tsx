import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type {
  AttendanceSummary,
  EmployeeSummary,
  LeaveSummary,
  StaffInviteSummary,
} from "@/lib/admin-hr";

export function HRKPIs({
  inviteSummary,
  employeeSummary,
  attendanceSummary,
  leaveSummary,
}: {
  inviteSummary: StaffInviteSummary | null;
  employeeSummary: EmployeeSummary | null;
  attendanceSummary: AttendanceSummary | null;
  leaveSummary: LeaveSummary | null;
}) {
  return (
    <section aria-label="HR key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Workforce"
        title="Operational KPIs"
        description="Live employee directory, attendance, and leave counts from HR APIs."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Employees"
          value={employeeSummary != null ? String(employeeSummary.total) : "—"}
          source={employeeSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={employeeSummary == null}
          detail={employeeSummary != null ? "GET /admin/hr/employees" : "Requires hr.manage"}
        />
        <AdminKpiCard
          title="Active employees"
          value={employeeSummary != null ? String(employeeSummary.active) : "—"}
          source={employeeSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={employeeSummary == null}
          detail={employeeSummary != null ? "status = active" : "Requires hr.manage"}
        />
        <AdminKpiCard
          title="Today's attendance"
          value={attendanceSummary != null ? String(attendanceSummary.todayPresent) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "PRESENT + LATE today" : "Requires attendance load"}
        />
        <AdminKpiCard
          title="Absent today"
          value={attendanceSummary != null ? String(attendanceSummary.todayAbsent) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "ABSENT status today" : "Requires attendance load"}
        />
        <AdminKpiCard
          title="Late arrivals"
          value={attendanceSummary != null ? String(attendanceSummary.todayLate) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "LATE status today" : "Requires attendance load"}
        />
        <AdminKpiCard
          title="On leave"
          value={leaveSummary != null ? String(leaveSummary.approvedActive) : "—"}
          source={leaveSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={leaveSummary == null}
          detail={leaveSummary != null ? "APPROVED leave covering today" : "Requires leave load"}
        />
        <AdminKpiCard title="Departments" value="—" source="UNAVAILABLE" unavailable detail="Planned for Phase 2 — no department master" />
        <AdminKpiCard
          title="Pending invites"
          value={inviteSummary != null ? String(inviteSummary.pending) : "—"}
          source={inviteSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={inviteSummary == null}
          detail={inviteSummary != null ? "Super-admin invite list" : "Requires super-admin"}
        />
        <AdminKpiCard title="Upcoming shifts" value="—" source="UNAVAILABLE" unavailable detail="Planned for Phase 2 — no shift roster API" />
        <AdminKpiCard title="Training completion" value="—" source="UNAVAILABLE" unavailable detail="Planned for Phase 2 — no training backend" />
        <AdminKpiCard title="Payroll status" value="—" source="UNAVAILABLE" unavailable detail="Planned for Phase 2 — no payroll runs" />
        <AdminKpiCard
          title="Pending leave"
          value={leaveSummary != null ? String(leaveSummary.pending) : "—"}
          source={leaveSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={leaveSummary == null}
          detail={leaveSummary != null ? "PENDING leave requests" : "Requires leave load"}
        />
      </div>
    </section>
  );
}
