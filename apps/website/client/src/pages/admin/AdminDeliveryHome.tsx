import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { DashboardActionCard } from "@/components/admin/dashboard/DashboardActionCard";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessAdminDelivery, isRiderOnly, primaryRoleLabel } from "@/lib/admin-access";
import { listDeliveryAssignments } from "@/lib/ops-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

export default function AdminDeliveryHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = isRiderOnly(principal) || canAccessAdminDelivery(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;
  const assignmentsOp = useOperationalData(
    ({ signal, correlationId }) =>
      listDeliveryAssignments(
        token!,
        { branchId, limit: 100 },
        { signal, correlationId },
      ),
    [token, branchId],
    { enabled: Boolean(token) && isApiConfigured && gateReady, pollMs: 15_000 },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Delivery home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  const rows = assignmentsOp.data ?? [];
  const waiting = rows.filter((r) => r.status === "ready" || r.status === "pending");
  const assigned = rows.filter((r) => r.status === "assigned");
  const inTransit = rows.filter(
    (r) => r.status === "dispatched" || r.status === "picked-up" || r.status === "picked_up" || r.status === "in_transit",
  );
  const delivered = rows.filter((r) => r.status === "delivered" || r.status === "completed");
  const exceptions = rows.filter(
    (r) =>
      r.status === "failed" ||
      r.status === "cancelled" ||
      r.status === "exception" ||
      r.status === "returned",
  );
  const canOpenOpsDispatch = isSuperAdmin || roles.includes("super-admin") || roles.includes("branch-manager");

  const kpi =
    assignmentsOp.state === "LOADING"
      ? ("loading" as const)
      : assignmentsOp.state === "ERROR" || assignmentsOp.state === "OFFLINE"
        ? ("error" as const)
        : assignmentsOp.state === "STALE"
          ? ("stale" as const)
          : ("available" as const);

  const hasData = assignmentsOp.data != null;

  return (
    <RoleHomeShell
      title="Delivery home"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={assignmentsOp.state}
      error={assignmentsOp.error}
      lastSuccessAt={assignmentsOp.lastSuccessAt}
      onRetry={assignmentsOp.retry}
      correlationId={assignmentsOp.correlationId}
      showTechnicalDetail={isSuperAdmin}
      primaryAction={
        <DashboardActionCard
          title="Open delivery console"
          description="Assign and track deliveries"
          href="/admin/delivery"
          primary
        />
      }
      secondaryActions={
        canOpenOpsDispatch ? (
          <DashboardActionCard title="Open rider dispatch" description="Assign riders to orders" href="/ops/dispatch" />
        ) : null
      }
    >
      <AdminSectionTitle
        eyebrow="Dispatch"
        title="Your branch deliveries"
        description="Deliveries for your branch only. Orders waiting for a rider come first."
      />

      {hasData && rows.length === 0 ? (
        <p className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm text-[var(--admin-muted)]" role="status">
          No deliveries are assigned for this branch right now. New ready orders will appear here.
        </p>
      ) : null}

      {(assignmentsOp.state === "ERROR" || assignmentsOp.state === "OFFLINE") && !hasData ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Delivery counts could not be loaded. Use Refresh or open the delivery console — zeros are not shown while the API is down.
        </p>
      ) : null}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignmentsOp.state === "LOADING" && !hasData ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : null}
        {hasData ? (
          <>
            <AdminKpiCard
              title="Waiting for a rider"
              value={String(waiting.length)}
              source="LIVE"
              state={kpi}
              detail="Ready or pending orders with no rider yet"
            />
            <AdminKpiCard title="Assigned" value={String(assigned.length)} source="LIVE" state={kpi} />
            <AdminKpiCard title="On the road" value={String(inTransit.length)} source="LIVE" state={kpi} />
            <AdminKpiCard
              title="Problems / failed"
              value={String(exceptions.length)}
              source="LIVE"
              state={kpi}
              detail="Failed, cancelled, or returned deliveries"
            />
            <AdminKpiCard
              title="Delivered so far"
              value={String(delivered.length)}
              source="LIVE"
              state={kpi}
              detail="Delivered orders in the loaded list"
            />
            <AdminKpiCard
              title="All loaded deliveries"
              value={String(rows.length)}
              source="LIVE"
              state={kpi}
            />
          </>
        ) : null}
      </div>
    </RoleHomeShell>
  );
}
