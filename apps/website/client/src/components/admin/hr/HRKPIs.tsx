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
          detail={employeeSummary != null ? "Staff in the selected branch" : "Workforce access required"}
        />
        <AdminKpiCard
          title="Active employees"
          value={employeeSummary != null ? String(employeeSummary.active) : "—"}
          source={employeeSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={employeeSummary == null}
          detail={employeeSummary != null ? "Currently active staff" : "Workforce access required"}
        />
        <AdminKpiCard
          title="Today's attendance"
          value={attendanceSummary != null ? String(attendanceSummary.todayPresent) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "Present or late today" : "Attendance data unavailable"}
        />
        <AdminKpiCard
          title="Absent today"
          value={attendanceSummary != null ? String(attendanceSummary.todayAbsent) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "Marked absent today" : "Attendance data unavailable"}
        />
        <AdminKpiCard
          title="Late arrivals"
          value={attendanceSummary != null ? String(attendanceSummary.todayLate) : "—"}
          source={attendanceSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={attendanceSummary == null}
          detail={attendanceSummary != null ? "Arrived late today" : "Attendance data unavailable"}
        />
        <AdminKpiCard
          title="On leave"
          value={leaveSummary != null ? String(leaveSummary.approvedActive) : "—"}
          source={leaveSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={leaveSummary == null}
          detail={leaveSummary != null ? "Approved leave covering today" : "Leave data unavailable"}
        />
        <AdminKpiCard title="Departments" value="—" source="UNAVAILABLE" unavailable detail="No department master yet" />
        <AdminKpiCard
          title="Pending invites"
          value={inviteSummary != null ? String(inviteSummary.pending) : "—"}
          source={inviteSummary != null ? "LIVE" : "UNAVAILABLE"}
          unavailable={inviteSummary == null}
          detail={inviteSummary != null ? "Staff invitations waiting" : "Invite list unavailable"}
        />
        <AdminKpiCard title="Upcoming shifts" value="—" source="UNAVAILABLE" unavailable detail="No shift roster API yet" />
        <AdminKpiCard title="Training completion" value="—" source="UNAVAILABLE" unavailable detail="No training backend yet" />
        <AdminKpiCard
          title="Payroll"
          value="See payroll panel"
          source="LIVE"
          detail="Payroll runs are managed below — open Payroll overview for status"
        />
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
