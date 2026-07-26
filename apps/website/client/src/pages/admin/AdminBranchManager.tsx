import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Bike,
  ClipboardList,
  CookingPot,
  Package,
  ShoppingBag,
  Users,
  UserRound,
  BarChart3,
  Bell,
} from "lucide-react";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { AdminModuleCard } from "@/components/admin/AdminModuleCard";
import {
  DeliveryStatusPanel,
  KitchenStatusPanel,
  RecentOrdersPanel,
} from "@/components/admin/dashboard/LiveOperationsPanels";
import { TableServiceSummary } from "@/components/admin/dashboard/TableServiceSummary";
import { OpeningReadinessSummary } from "@/components/admin/dashboard/OpeningReadinessSummary";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessBranchManagerDashboard,
  canAccessAdminDelivery,
  canAccessAdminOrdersApi,
  canAccessTableService,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchAdminOperationsDashboard } from "@/lib/admin-api";
import { listRiderRoster } from "@/lib/ops-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData, type OperationalState } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { AdminShell } from "@/pages/admin/AdminShell";

/** Map the canonical D2 state onto the KPI card state model. */
function branchKpiState(opState: OperationalState): "available" | "loading" | "error" | "stale" | "unavailable" {
  if (opState === "LOADING") return "loading";
  if (opState === "ERROR" || opState === "OFFLINE") return "error";
  if (opState === "STALE") return "stale";
  if (opState === "UNAVAILABLE" || opState === "FOUNDATION") return "unavailable";
  return "available";
}

function formatPkr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function shiftLabel(now = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Karachi",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart ?? "12");
  if (hour < 16) return "Day shift (approx.)";
  if (hour < 23) return "Evening shift (approx.)";
  return "Late shift (approx.)";
}

function formatHeaderDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(now);
}

export default function AdminBranchManager() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel, allowedBranches, selection, setSelection, canSelectAll } =
    useAdminBranch();
  const [now] = useState(() => new Date());

  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessBranchManagerDashboard(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);
  const ordersApi = canAccessAdminOrdersApi(principal);
  const deliveryApi = canAccessAdminDelivery(principal);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  // Single-branch membership stays pinned. Multi-branch managers may use Assigned Branches aggregate.
  useEffect(() => {
    if (!gateReady) return;
    if (selection.mode === "branch" && branchIdFilter) return;
    if (canSelectAll && selection.mode === "all" && (isSuperAdmin || branchIds.length > 1)) {
      return;
    }
    const preferred =
      allowedBranches.find((b) => branchIds.includes(b.id)) ?? allowedBranches[0] ?? null;
    if (preferred) {
      setSelection({ mode: "branch", branchId: preferred.id });
    }
  }, [
    allowedBranches,
    branchIdFilter,
    branchIds,
    canSelectAll,
    gateReady,
    isSuperAdmin,
    selection.mode,
    setSelection,
  ]);

  const scopedBranchId = branchIdFilter;
  const isAggregateScope = scopedBranchId == null && canSelectAll && (isSuperAdmin || branchIds.length > 1);
  const token = session?.access_token;
  const selectedBranch = scopedBranchId
    ? allowedBranches.find((b) => b.id === scopedBranchId)
    : null;
  const comingSoonBranch = selectedBranch?.status === "coming-soon";

  const dashboardOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(
        token!,
        { branchId: scopedBranchId },
        { signal, correlationId },
      ),
    [token, scopedBranchId],
    {
      enabled:
        Boolean(token) &&
        ordersApi &&
        gateReady &&
        !comingSoonBranch &&
        (Boolean(scopedBranchId) || isAggregateScope),
    },
  );

  const ridersOp = useOperationalData(
    ({ signal, correlationId }) =>
      listRiderRoster(token!, { branchId: scopedBranchId }, { signal, correlationId }),
    [token, scopedBranchId],
    {
      enabled:
        Boolean(token) &&
        deliveryApi &&
        Boolean(scopedBranchId) &&
        gateReady &&
        !comingSoonBranch,
    },
  );

  const data = dashboardOp.data;
  const error = dashboardOp.error;
  const loading = dashboardOp.state === "LOADING";
  const kpiCardState = branchKpiState(dashboardOp.state);
  const riderTotal = ridersOp.data?.length ?? null;
  const riderAvailable =
    ridersOp.data?.filter((r) => r.status === "available" || r.status === "active").length ?? null;
  const ridersError = ridersOp.state === "ERROR" || ridersOp.state === "OFFLINE";
  const opsFailed = Boolean(error) || (!data && (dashboardOp.state === "ERROR" || dashboardOp.state === "OFFLINE"));

  const status = data?.statusCounts ?? null;
  const pending = status?.pending ?? null;
  const ready = status?.ready ?? null;
  const cancelled = status?.cancelled ?? null;
  const customerWaiting =
    status == null ? null : (status.pending ?? 0) + (status.confirmed ?? 0);

  const branchName = useMemo(() => {
    if (isAggregateScope) {
      return isSuperAdmin ? "All Branches" : "Assigned Branches";
    }
    if (selection.mode === "branch") {
      return (
        allowedBranches.find((b) => b.id === selection.branchId)?.name ??
        allowedBranches.find((b) => b.id === selection.branchId)?.shortName ??
        branchLabel
      );
    }
    return branchLabel;
  }, [allowedBranches, branchLabel, isAggregateScope, isSuperAdmin, selection]);

  const dataReady = Boolean(data) && !error;

  // Per-branch comparison cards when aggregate and operations payload has branchPerformance.
  const assignedComparison = useMemo(() => {
    if (!isAggregateScope || !data?.branchPerformance) return [];
    return data.branchPerformance.filter((row) =>
      isSuperAdmin ? true : branchIds.includes(row.branchId),
    );
  }, [branchIds, data?.branchPerformance, isAggregateScope, isSuperAdmin]);

  if (isAuthLoading) {
    return (
      <AdminShell title="Branch dashboard">
        <p className="text-sm text-[var(--admin-muted)]">Loading branch session…</p>
      </AdminShell>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <AdminShell title="Branch dashboard">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Branch dashboard
          </p>
          <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-[var(--admin-ink)] sm:text-3xl">
            {branchName}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {profile?.fullName ?? "Manager"} · {roleLabel} · {shiftLabel(now)} · {formatHeaderDate(now)}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {isAggregateScope
              ? "Assigned Branches aggregate — operations scoped to your memberships. No Super Admin platform controls here."
              : "Scoped to this branch only. No organization-wide or Super Admin controls on this surface."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSelectAll && allowedBranches.length > 1 ? (
            <label className="text-xs font-medium text-[var(--admin-muted)]">
              {isSuperAdmin ? "Owner branch preview" : "Branch scope"}
              <select
                className="mt-1 block min-w-[12rem] rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-ink)]"
                value={scopedBranchId ?? "all"}
                onChange={(event) => {
                  const id = event.target.value;
                  if (id === "all") setSelection({ mode: "all" });
                  else setSelection({ mode: "branch", branchId: id });
                }}
                aria-label="Select branch scope"
              >
                <option value="all">{isSuperAdmin ? "All Branches" : "Assigned Branches"}</option>
                {allowedBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.shortName || branch.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <span
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)]"
            title="Branch notifications arrive in a later release"
          >
            <Bell className="h-4 w-4" aria-hidden />
            Notifications unavailable
          </span>

          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              dataReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-muted)]"
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${dataReady ? "bg-emerald-500" : "bg-[var(--admin-muted)]"}`}
              aria-hidden
            />
            {!isApiConfigured
              ? "API not configured"
              : dashboardOp.state === "STALE"
                ? "Stale branch data"
                : dashboardOp.state === "OFFLINE"
                  ? "Offline"
                  : error
                    ? "Data unavailable"
                    : dataReady
                      ? "Live branch data"
                      : loading
                        ? "Loading…"
                        : "Select a branch"}
          </span>

          <button
            type="button"
            onClick={() => {
              dashboardOp.retry();
              ridersOp.retry();
            }}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
          >
            Refresh
          </button>
        </div>
      </header>

      {!scopedBranchId && !isAggregateScope ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          No branch is assigned to this account. Ask the Owner to assign a branch before live KPIs can load.
        </div>
      ) : null}

      {isAggregateScope ? (
        <div className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm text-[var(--admin-muted)]" role="status">
          Viewing <span className="font-semibold text-[var(--admin-ink)]">Assigned Branches</span> aggregate.
          Select a single branch for rider roster and per-branch table-service detail.
        </div>
      ) : null}

      <OperationalStatusBanner
        state={comingSoonBranch ? "LIVE" : dashboardOp.state}
        error={comingSoonBranch ? null : error}
        lastSuccessAt={dashboardOp.lastSuccessAt}
        onRetry={dashboardOp.retry}
        correlationId={dashboardOp.correlationId}
        showTechnicalDetail={isSuperAdmin}
        className="mb-6"
      />

      <OpeningReadinessSummary
        token={token}
        branchId={scopedBranchId}
        enabled={gateReady && Boolean(scopedBranchId)}
        showTechnicalDetail={isSuperAdmin}
      />

      {comingSoonBranch ? (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This branch is coming soon. Complete opening readiness before treating sales or table KPIs as
          live. Primary action: Complete Opening Readiness.
        </div>
      ) : null}

      {!comingSoonBranch ? (
      <section aria-label="Branch KPIs" className="mb-8">
        <AdminSectionTitle
          eyebrow="Today"
          title="Branch KPIs"
          description="Classified from the operations API for this branch. No fabricated trends."
        />
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-busy="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <AdminKpiSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AdminKpiCard
              title="Today's orders"
              value={data ? String(data.kpis.todayOrders) : null}
              source="LIVE"
              state={kpiCardState}
              detail="Non-cancelled orders today (branch scope)"
            />
            <AdminKpiCard
              title="Today's sales"
              value={data ? formatPkr(data.kpis.todayGrossSales) : null}
              source="LIVE"
              state={kpiCardState}
              detail="Gross sales from today’s non-cancelled orders"
            />
            <AdminKpiCard
              title="Pending orders"
              value={data && pending != null ? String(pending) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Orders currently in pending status"
            />
            <AdminKpiCard
              title="Kitchen queue"
              value={data ? String(data.kpis.kitchenWaiting) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Confirmed + preparing — not a KDS ticket count"
            />
            <AdminKpiCard
              title="Ready orders"
              value={data && ready != null ? String(ready) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Orders in ready status"
            />
            <AdminKpiCard
              title="Dispatch queue"
              value={data ? String(data.kpis.activeDeliveries) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Orders currently dispatched"
            />
            <AdminKpiCard
              title="Cancelled orders"
              value={data && cancelled != null ? String(cancelled) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Cancelled count in today’s status map"
            />
            <AdminKpiCard
              title="Customer waiting"
              value={data && customerWaiting != null ? String(customerWaiting) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Pending + confirmed (proxy wait queue — not CSAT)"
            />
            <AdminKpiCard
              title="Driver availability"
              value={
                riderAvailable == null
                  ? "—"
                  : riderTotal != null
                    ? `${riderAvailable} / ${riderTotal}`
                    : String(riderAvailable)
              }
              source={ridersError || riderAvailable == null ? "UNAVAILABLE" : "DERIVED"}
              unavailable={ridersError || riderAvailable == null}
              detail={
                ridersError
                  ? "Rider roster API unavailable for this session"
                  : riderAvailable == null
                    ? "Roster not loaded"
                    : "Available/active riders on branch roster"
              }
            />
            <AdminKpiCard
              title="Inventory alerts"
              value="—"
              source="UNAVAILABLE"
              unavailable
              detail="Inventory alert engine not live"
            />
          </div>
        )}
      </section>
      ) : null}

      {isAggregateScope && assignedComparison.length > 0 ? (
        <section className="mb-8" aria-label="Assigned branch comparison">
          <AdminSectionTitle
            eyebrow="Assigned Branches"
            title="Branch comparison"
            description="Today’s orders and sales per assigned branch from the operations API."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assignedComparison.map((row) => (
              <AdminSurface key={row.branchId}>
                <AdminSurfaceHeader
                  title={
                    row.branchCode ??
                    allowedBranches.find((b) => b.id === row.branchId)?.shortName ??
                    row.branchId.slice(0, 8)
                  }
                  description={`${row.activeOrders} active · ${formatPkr(row.todayGrossSales)}`}
                />
                <AdminSurfaceBody>
                  <p className="text-2xl font-semibold tabular-nums">{row.todayOrders}</p>
                  <p className="text-xs text-[var(--admin-muted)]">Orders today</p>
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-[var(--brand-red)]"
                    onClick={() => setSelection({ mode: "branch", branchId: row.branchId })}
                  >
                    Open branch →
                  </button>
                </AdminSurfaceBody>
              </AdminSurface>
            ))}
          </div>
        </section>
      ) : null}

      {!comingSoonBranch && !isAggregateScope ? (
      <TableServiceSummary
        token={token}
        branchId={scopedBranchId}
        enabled={gateReady && canAccessTableService(principal)}
        showTechnicalDetail={isSuperAdmin}
      />
      ) : null}

      <section className="mb-8" aria-label="Branch operations modules">
        <AdminSectionTitle
          eyebrow="Operations"
          title="Branch modules"
          description="Deep-links into existing Admin modules with your branch permissions. Owner-only modules are hidden."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminModuleCard
            title="Orders"
            description="View, search, filter, and monitor branch orders."
            href="/admin/orders"
            icon={ClipboardList}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open orders"
            available={ordersApi}
          />
          <AdminModuleCard
            title="Kitchen"
            description="Monitor prep queue and load for this branch."
            href="/admin/kitchen"
            icon={CookingPot}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open kitchen"
            available
          />
          <AdminModuleCard
            title="POS"
            description="Counter sales for the assigned branch."
            href="/admin/pos"
            icon={ShoppingBag}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open POS"
            available
          />
          <AdminModuleCard
            title="Delivery"
            description="Riders, assign, and dispatch monitoring."
            href="/admin/delivery"
            icon={Bike}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open delivery"
            available={deliveryApi}
          />
          <AdminModuleCard
            title="CRM"
            description="Branch customer intelligence from orders."
            href="/admin/crm"
            icon={Users}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open CRM"
            available={ordersApi}
          />
          <AdminModuleCard
            title="Inventory"
            description="Stock readiness — ledger alerts pending."
            href="/admin/inventory"
            icon={Package}
            statusLabel="Foundation"
            statusTone="soon"
            actionLabel="Open inventory"
            available
          />
          <AdminModuleCard
            title="Staff schedule"
            description="Attendance and shift foundation."
            href="/admin/hr"
            icon={UserRound}
            statusLabel="Foundation"
            statusTone="soon"
            actionLabel="Open staff"
            available
          />
          <AdminModuleCard
            title="Reports"
            description="Today’s branch sales and orders — no cross-branch compare."
            href="/admin/reports"
            icon={BarChart3}
            statusLabel="Partial"
            statusTone="ready"
            actionLabel="Open reports"
            available={ordersApi}
          />
        </div>
      </section>

      <section className="mb-8" aria-label="Live branch board">
        <AdminSectionTitle
          eyebrow="Live"
          title="Operations board"
          description="Recent orders and status-derived kitchen / delivery panels for this branch."
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <RecentOrdersPanel orders={data?.recentOrders ?? []} />
          </div>
          <KitchenStatusPanel
            counts={dataReady ? status : null}
            failed={opsFailed}
          />
          <DeliveryStatusPanel
            activeDeliveries={dataReady ? (data?.kpis.activeDeliveries ?? null) : null}
            readyCount={dataReady ? ready : null}
            completedCount={dataReady ? (status?.completed ?? null) : null}
            failed={opsFailed}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSurface>
          <AdminSurfaceHeader
            title="Staff today"
            description="Attendance, late, and absent require HR APIs."
          />
          <AdminSurfaceBody>
            <p className="text-sm text-[var(--admin-muted)]">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-[var(--admin-muted)]">
                Foundation
              </span>
              <br />
              Current shift label above is approximate clock banding only. Live attendance is not wired.
            </p>
            <Link href="/admin/hr" className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-red)]">
              Open staff foundation →
            </Link>
          </AdminSurfaceBody>
        </AdminSurface>

        <AdminSurface>
          <AdminSurfaceHeader
            title="Branch reports"
            description="Use Reports for today sales and orders. Branch comparison stays Owner-only."
          />
          <AdminSurfaceBody>
            <ul className="space-y-2 text-sm text-[var(--admin-muted)]">
              <li>Today’s sales / orders — available via Reports (Partial BI)</li>
              <li>Hourly trend / top products / refunds — Foundation until analytics endpoints exist</li>
              <li>Branch comparison — Unavailable on this surface (Owner only)</li>
            </ul>
            <Link href="/admin/reports" className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-red)]">
              Open reports →
            </Link>
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </AdminShell>
  );
}
