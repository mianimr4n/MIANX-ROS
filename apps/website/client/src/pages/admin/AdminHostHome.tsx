import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { DashboardActionCard } from "@/components/admin/dashboard/DashboardActionCard";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessTableService,
  canManageReservations,
  canSeatGuests,
  isHostOnly,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchTableServiceDashboard } from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

export default function AdminHostHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = isHostOnly(principal) || canAccessTableService(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;
  const tableOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(token!, { branchId: branchId! }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && isApiConfigured && gateReady,
      pollMs: 20_000,
    },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Host home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  const d = tableOp.data;
  const kpi =
    tableOp.state === "LOADING"
      ? ("loading" as const)
      : tableOp.state === "ERROR" || tableOp.state === "OFFLINE"
        ? ("error" as const)
        : tableOp.state === "STALE"
          ? ("stale" as const)
          : ("available" as const);

  const canSeat = canSeatGuests(principal);
  const canReserve = canManageReservations(principal);
  const quietDay =
    d != null &&
    d.reservations.todayTotal === 0 &&
    d.floor.upcomingArrivals === 0 &&
    d.floor.waitlistCount === 0;

  return (
    <RoleHomeShell
      title="Host / Front desk"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={tableOp.state}
      error={tableOp.error}
      lastSuccessAt={tableOp.lastSuccessAt}
      onRetry={tableOp.retry}
      correlationId={tableOp.correlationId}
      showTechnicalDetail={isSuperAdmin}
      primaryAction={
        canSeat ? (
          <DashboardActionCard
            title="Seat a guest"
            description="Open the live floor"
            href="/admin/floor"
            primary
          />
        ) : (
          <DashboardActionCard
            title="Open live floor"
            description="Tables and seating"
            href="/admin/floor"
            primary
          />
        )
      }
      secondaryActions={
        canReserve ? (
          <>
            <DashboardActionCard title="Create reservation" description="Book a table" href="/admin/reservations" />
            <DashboardActionCard title="Add to waitlist" description="Walk-in guests" href="/admin/waitlist" />
          </>
        ) : null
      }
    >
      <AdminSectionTitle
        eyebrow="Today"
        title="Arrivals & seating"
        description="Who is arriving, who is waiting, and which tables are free at your branch."
      />

      {!branchId ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Select an assigned branch to see today's arrivals and tables.
        </p>
      ) : null}

      {quietDay ? (
        <p className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm text-[var(--admin-muted)]">
          No reservations or waitlist entries yet today.{" "}
          {canReserve ? "A good next step: create a reservation for an expected party." : "Walk-ins can be seated from the live floor."}
        </p>
      ) : null}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tableOp.state === "LOADING" && !d ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : null}
        {d ? (
          <>
            <AdminKpiCard title="Upcoming arrivals" value={String(d.floor.upcomingArrivals)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Waitlist" value={String(d.floor.waitlistCount)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Available tables" value={String(d.floor.availableTables)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Reservations today" value={String(d.reservations.todayTotal)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Unconfirmed" value={String(d.reservations.pending)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Arrived" value={String(d.reservations.arrived)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Seating conflicts" value={String(d.floor.seatingConflicts)} source="LIVE" state={kpi} />
            <AdminKpiCard title="No-shows" value={String(d.reservations.noShows)} source="LIVE" state={kpi} />
            <AdminKpiCard
              title="Avg wait (min)"
              value={d.averages.averageWaitMinutes == null ? null : String(d.averages.averageWaitMinutes)}
              source="FOUNDATION"
              state={d.averages.averageWaitMinutes == null ? "unavailable" : "available"}
              detail={d.averages.note}
            />
          </>
        ) : null}
      </div>
    </RoleHomeShell>
  );
}
