import { Link } from "wouter";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  DashboardActionCard,
  DashboardActionGrid,
} from "@/components/admin/dashboard/DashboardActionCard";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessAdminPos,
  canAccessTableService,
  canSeatGuests,
  isWaiterOnly,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchTableServiceDashboard } from "@/lib/admin-api";
import { getLiveFloorState } from "@/lib/table-service-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

export default function AdminWaiterHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed =
    isWaiterOnly(principal) || canAccessTableService(principal) || canSeatGuests(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;
  const userId = profile?.id;

  const tableOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(token!, { branchId: branchId! }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && isApiConfigured && gateReady,
      pollMs: 20_000,
    },
  );

  const floorOp = useOperationalData(
    ({ signal, correlationId }) => getLiveFloorState(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && isApiConfigured && gateReady,
      pollMs: 15_000,
    },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Waiter home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  const sessions = floorOp.data?.activeSessions ?? [];
  // Architect: never fall back to all branch sessions when assignment filter is unavailable or empty.
  const assigned = userId
    ? sessions.filter((s) => s.primaryServerUserId === userId)
    : [];
  const visible = userId ? assigned : [];
  const waitingToOrder = visible.filter(
    (s) => s.serviceStatus === "seated" || s.serviceStatus === "ordering",
  );
  const billRequests = visible.filter((s) => s.serviceStatus === "bill_requested");
  const paymentPending = visible.filter((s) => s.serviceStatus === "payment_pending");

  const floorReady = floorOp.data != null;
  const assignmentFilterReady = Boolean(userId);
  const kpi =
    !assignmentFilterReady
      ? ("unavailable" as const)
      : floorOp.state === "LOADING"
        ? ("loading" as const)
        : floorOp.state === "ERROR" || floorOp.state === "OFFLINE"
          ? ("error" as const)
          : floorOp.state === "STALE"
            ? ("stale" as const)
            : floorReady
              ? ("available" as const)
              : ("unavailable" as const);

  return (
    <RoleHomeShell
      title="Waiter home"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={floorOp.state !== "LIVE" && floorOp.state !== "EMPTY" ? floorOp.state : tableOp.state}
      error={floorOp.error ?? tableOp.error}
      lastSuccessAt={floorOp.lastSuccessAt ?? tableOp.lastSuccessAt}
      onRetry={() => {
        floorOp.retry();
        tableOp.retry();
      }}
      correlationId={floorOp.correlationId}
      showTechnicalDetail={isSuperAdmin}
    >
      <AdminSectionTitle
        eyebrow="Floor"
        title="Your assigned sessions"
        description={
          assignmentFilterReady
            ? "Sessions where you are the primary server. Branch-wide sessions are never shown here."
            : "Profile id unavailable — assignment filter cannot run. No sessions listed."
        }
      />

      {!assignmentFilterReady ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          Assignment filter unavailable without a profile id. Ask an admin to refresh your staff profile.
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {floorOp.state === "LOADING" && !floorOp.data ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : null}
        {floorReady && assignmentFilterReady ? (
          <>
            <AdminKpiCard
              title="Assigned sessions"
              value={String(visible.length)}
              source="LIVE"
              state={kpi}
              detail="Tables/sessions where you are primary server"
            />
            <AdminKpiCard title="Waiting to order" value={String(waitingToOrder.length)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Bill requests" value={String(billRequests.length)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Payment pending" value={String(paymentPending.length)} source="LIVE" state={kpi} />
          </>
        ) : null}
        {tableOp.data && assignmentFilterReady ? (
          <AdminKpiCard
            title="Occupied tables (branch)"
            value={String(tableOp.data.floor.occupiedTables)}
            source="DERIVED"
            state={kpi}
            detail="Branch floor occupancy from table-service summary (context only)."
          />
        ) : null}
      </div>

      <ul className="mb-8 space-y-2" aria-label="Assigned sessions">
        {visible.slice(0, 12).map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium">{s.sessionNumber ?? s.id.slice(0, 8)}</span>
              {" · "}
              {s.partySize ?? "?"} covers · {s.serviceStatus ?? "unknown"}
            </span>
            <span className="flex flex-wrap gap-2 text-xs font-semibold">
              {canAccessAdminPos(principal) ? (
                <Link href="/admin/pos" className="text-[var(--brand-red)] hover:underline">
                  POS
                </Link>
              ) : null}
              <Link href="/admin/floor" className="text-[var(--brand-red)] hover:underline">
                Floor
              </Link>
            </span>
          </li>
        ))}
        {assignmentFilterReady && floorReady && visible.length === 0 ? (
          <li className="text-sm text-[var(--admin-muted)]">
            No sessions assigned to you as primary server.
          </li>
        ) : null}
        {!assignmentFilterReady ? (
          <li className="text-sm text-[var(--admin-muted)]">No sessions listed — assignment filter unavailable.</li>
        ) : null}
      </ul>

      <DashboardActionGrid>
        {canAccessAdminPos(principal) ? (
          <DashboardActionCard title="Open POS" href="/admin/pos" primary description="Orders for seated guests" />
        ) : null}
        <DashboardActionCard title="Open live floor" href="/admin/floor" />
        <DashboardActionCard title="Transfer / seat" href="/admin/floor" description="Table transfer on live floor" />
      </DashboardActionGrid>
    </RoleHomeShell>
  );
}
