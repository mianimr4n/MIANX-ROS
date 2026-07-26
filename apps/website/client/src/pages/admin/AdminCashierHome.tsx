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
  canAccessAdminOrdersApi,
  canAccessAdminPos,
  canAccessTableService,
  isCashierOnly,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchAdminOperationsDashboard, fetchTableServiceDashboard } from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

export default function AdminCashierHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = isCashierOnly(principal) || canAccessAdminPos(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;
  const canOps = canAccessAdminOrdersApi(principal);
  const canTable = canAccessTableService(principal);

  const opsOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId }, { signal, correlationId }),
    [token, branchId],
    { enabled: Boolean(token) && canOps && isApiConfigured && gateReady, pollMs: 30_000 },
  );

  const tableOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(token!, { branchId: branchId! }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && canTable && isApiConfigured && gateReady,
      pollMs: 30_000,
    },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Cashier home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  const opsKpi =
    opsOp.state === "LOADING"
      ? ("loading" as const)
      : opsOp.state === "ERROR" || opsOp.state === "OFFLINE"
        ? ("error" as const)
        : opsOp.state === "STALE"
          ? ("stale" as const)
          : ("available" as const);

  const tableKpi =
    tableOp.state === "LOADING"
      ? ("loading" as const)
      : tableOp.state === "ERROR" || tableOp.state === "OFFLINE"
        ? ("error" as const)
        : tableOp.state === "STALE"
          ? ("stale" as const)
          : ("available" as const);

  const bannerState = canOps
    ? opsOp.state
    : canTable
      ? tableOp.state
      : ("LIVE" as const);

  return (
    <RoleHomeShell
      title="Cashier home"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={bannerState}
      error={opsOp.error ?? tableOp.error}
      lastSuccessAt={opsOp.lastSuccessAt ?? tableOp.lastSuccessAt}
      onRetry={() => {
        opsOp.retry();
        tableOp.retry();
      }}
      correlationId={opsOp.correlationId ?? tableOp.correlationId}
      showTechnicalDetail={isSuperAdmin}
      actions={
        <DashboardActionCard title="Open POS" description="Primary cashier workstation" href="/admin/pos" primary />
      }
    >
      <AdminSectionTitle
        eyebrow="Today"
        title="Counter work"
        description="Assigned branch only. No owner finance totals."
      />

      {!canOps && !canTable ? (
        <p className="mb-6 text-sm text-[var(--admin-muted)]">
          No operational metrics permitted for this account. Use Open POS to start selling.
        </p>
      ) : null}

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canOps && opsOp.state === "LOADING" && !opsOp.data ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : null}
        {canOps && opsOp.data ? (
          <>
            <AdminKpiCard
              title="Active orders"
              value={String(opsOp.data.kpis.activeOrders)}
              source="LIVE"
              state={opsKpi}
            />
            <AdminKpiCard
              title="Pending"
              value={String(opsOp.data.statusCounts.pending ?? 0)}
              source="LIVE"
              state={opsKpi}
            />
            <AdminKpiCard
              title="Ready pickup"
              value={String(opsOp.data.statusCounts.ready ?? 0)}
              source="LIVE"
              state={opsKpi}
            />
            <AdminKpiCard
              title="Completed (loaded)"
              value={String(opsOp.data.statusCounts.completed ?? 0)}
              source="LIVE"
              state={opsKpi}
            />
          </>
        ) : null}
        {canTable && tableOp.data ? (
          <>
            <AdminKpiCard
              title="Bill requests"
              value={String(tableOp.data.floor.billRequests)}
              source="LIVE"
              state={tableKpi}
              detail={tableOp.data.definitions.billRequests}
            />
            <AdminKpiCard
              title="Payment pending"
              value={String(tableOp.data.floor.paymentPending)}
              source="LIVE"
              state={tableKpi}
              detail={tableOp.data.definitions.paymentPending}
            />
          </>
        ) : null}
      </div>

      <DashboardActionGrid>
        <DashboardActionCard title="Open POS" href="/admin/pos" primary />
        {canOps ? <DashboardActionCard title="Orders" href="/admin/orders" /> : null}
        {canTable ? <DashboardActionCard title="Live floor" href="/admin/floor" /> : null}
      </DashboardActionGrid>
    </RoleHomeShell>
  );
}
