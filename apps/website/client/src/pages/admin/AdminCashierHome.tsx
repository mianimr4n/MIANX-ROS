import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { DashboardActionCard } from "@/components/admin/dashboard/DashboardActionCard";
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
  if (!allowed) {
    return <AdminShell title="Cashier home">{null}</AdminShell>;
  }

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
      primaryAction={
        <DashboardActionCard
          title="Open POS"
          description="Take orders and payments"
          href="/admin/pos"
          primary
        />
      }
      secondaryActions={
        <>
          {canOps ? (
            <DashboardActionCard title="Review orders" description="Today's order list" href="/admin/orders" />
          ) : null}
          {canTable ? (
            <DashboardActionCard title="Open live floor" description="Tables and bills" href="/admin/floor" />
          ) : null}
        </>
      }
    >
      <AdminSectionTitle
        eyebrow="Today"
        title="Counter work"
        description="Your branch only. Pickups and bills that need you come first."
      />

      {!canOps && !canTable ? (
        <p className="mb-6 text-sm text-[var(--admin-muted)]">
          No counter numbers are available for this account. Use Open POS to start selling.
        </p>
      ) : null}

      {(opsOp.state === "ERROR" || opsOp.state === "OFFLINE" || tableOp.state === "ERROR" || tableOp.state === "OFFLINE") &&
      !opsOp.data &&
      !tableOp.data ? (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Counter metrics could not be loaded. Open POS to keep taking orders — live counts are hidden while the API is down.
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
          <AdminKpiCard
            title="Ready for pickup"
            value={String(opsOp.data.statusCounts.ready ?? 0)}
            source="LIVE"
            state={opsKpi}
            detail="Orders waiting at the counter"
          />
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
              title="Completed so far"
              value={String(opsOp.data.statusCounts.completed ?? 0)}
              source="LIVE"
              state={opsKpi}
              detail="Completed orders in the loaded list"
            />
          </>
        ) : null}
      </div>
    </RoleHomeShell>
  );
}
