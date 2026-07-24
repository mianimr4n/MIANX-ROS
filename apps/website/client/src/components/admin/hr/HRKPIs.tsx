import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { StaffInviteSummary } from "@/lib/admin-hr";

export function HRKPIs({ inviteSummary }: { inviteSummary: StaffInviteSummary | null }) {
  return (
    <section aria-label="Workforce key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Workforce"
        title="HR KPIs"
        description="Workforce metrics require employee and attendance backends — no fabricated headcount."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard title="Total employees" value="—" source="FOUNDATION" unavailable detail="No employee directory API" />
        <AdminKpiCard title="Active employees" value="—" source="FOUNDATION" unavailable detail="No staff list endpoint" />
        <AdminKpiCard title="Today's attendance" value="—" source="FOUNDATION" unavailable detail="No attendance ledger" />
        <AdminKpiCard title="Absent today" value="—" source="FOUNDATION" unavailable detail="No clock events" />
        <AdminKpiCard title="Late arrivals" value="—" source="FOUNDATION" unavailable detail="No timesheet API" />
        <AdminKpiCard title="On leave" value="—" source="FOUNDATION" unavailable detail="No leave backend" />
        <AdminKpiCard title="Departments" value="—" source="FOUNDATION" unavailable detail="No department master" />
        <AdminKpiCard
          title="Pending invites"
          value={inviteSummary != null ? String(inviteSummary.pending) : "—"}
          source={inviteSummary == null ? "UNAVAILABLE" : "LIVE"}
          unavailable={inviteSummary == null}
          detail={
            inviteSummary == null
              ? "Super-admin invite API only"
              : "From GET /admin/staff/invites"
          }
        />
        <AdminKpiCard title="Upcoming shifts" value="—" source="FOUNDATION" unavailable detail="No shift roster API" />
        <AdminKpiCard title="Training completion" value="—" source="FOUNDATION" unavailable detail="No training backend" />
        <AdminKpiCard title="Payroll status" value="—" source="FOUNDATION" unavailable detail="No payroll runs" />
      </div>
    </section>
  );
}
