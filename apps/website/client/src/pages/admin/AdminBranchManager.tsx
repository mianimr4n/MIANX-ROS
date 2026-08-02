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
import {
  DashboardActionCard,
  DashboardActionGrid,
} from "@/components/admin/dashboard/DashboardActionCard";
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
    return (
      <AdminShell title="Branch dashboard">
        <p className="text-sm text-[var(--admin-muted)]">Sign in required for branch dashboard.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Branch dashboard">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-red-dark)]">
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
        branchId={scopedBranchId ?? allowedBranches[0]?.id ?? null}
        enabled={gateReady && Boolean(scopedBranchId ?? allowedBranches[0]?.id)}
        showTechnicalDetail={isSuperAdmin}
      />
      {!scopedBranchId && allowedBranches[0]?.id ? (
        <p className="mb-6 -mt-4 text-sm text-[var(--admin-muted)]">
          Opening readiness uses your first assigned branch as an anchor. Select a branch to focus
          setup blockers.
        </p>
      ) : null}

      {comingSoonBranch ? (
        <section className="mb-8" aria-label="Start here">
          <AdminSectionTitle
            eyebrow="Start here"
            title="Coming-soon branch setup"
            description="This branch is coming soon. Finish setup before treating sales or table KPIs as live. Do not inherit Royal Orchard opening percentage."
          />
          <DashboardActionGrid>
            <DashboardActionCard
              primary
              title="Open Mianx.ai Team"
              description="Owner decision queue and readiness model"
              href="/admin/ai-team"
            />
            <DashboardActionCard
              title="Review opening plan"
              description="See blockers grouped on this page"
              href="/admin/branch"
            />
            <DashboardActionCard
              title="Resolve setup blockers"
              description="Invite real staff with canonical roles"
              href="/admin/hr"
            />
          </DashboardActionGrid>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Coming soon — no live order or sales board until the branch is operating. Northern Bypass
            activation requires separate Founder authorization.
          </div>
        </section>
      ) : null}

      {!comingSoonBranch ? (
      <section aria-label="Needs attention" className="mb-8">
        <AdminSectionTitle
          eyebrow="Now"
          title="Needs attention"
          description="Orders and queues that need action right now. Missing data shows as — never as zero."
        />
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <AdminKpiSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard
              title="Pending customer orders"
              value={data && pending != null ? String(pending) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Order-derived — awaiting staff confirmation (not kitchen tickets)"
            />
            <AdminKpiCard
              title="In kitchen (orders)"
              value={data ? String(data.kpis.kitchenWaiting) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Order-derived confirmed + preparing — not a KDS ticket count"
            />
            <AdminKpiCard
              title="Ready for dispatch"
              value={data && ready != null ? String(ready) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Order-derived ready — may enter rider assignment"
            />
            <AdminKpiCard
              title="Out for delivery"
              value={data ? String(data.kpis.activeDeliveries) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Order-derived dispatched status"
            />
            <AdminKpiCard
              title="Customers awaiting staff"
              value={data && customerWaiting != null ? String(customerWaiting) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Pending + confirmed orders needing staff action"
            />
            <AdminKpiCard
              title="Cancelled today"
              value={data && cancelled != null ? String(cancelled) : null}
              source="DERIVED"
              state={kpiCardState}
              detail="Cancelled orders so far today"
            />
          </div>
        )}
      </section>
      ) : null}

      {!comingSoonBranch ? (
      <section aria-label="Today so far" className="mb-8">
        <AdminSectionTitle
          eyebrow="Today"
          title="Today so far"
          description="Totals for this branch's business day."
        />
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <AdminKpiSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard
              title="Today's orders"
              value={data ? String(data.kpis.todayOrders) : null}
              source="LIVE"
              state={kpiCardState}
              detail="Orders placed today (not counting cancelled)"
            />
            <AdminKpiCard
              title="Today's sales"
              value={data ? formatPkr(data.kpis.todayGrossSales) : null}
              source="LIVE"
              state={kpiCardState}
              detail="Gross sales from today's orders"
            />
            <AdminKpiCard
              title="Riders available"
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
                  ? "Rider list could not load for this session"
                  : riderAvailable == null
                    ? "Rider list not loaded"
                    : "Available riders on this branch's roster"
              }
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
            title="Kitchen display"
            description="Live ticket queue, prep, and delays for this branch."
            href="/admin/kitchen-dashboard"
            icon={CookingPot}
            statusLabel="Live"
            statusTone="live"
            actionLabel="Open kitchen display"
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
            description="Stock, recipes, and GRN stock posting — Partial LIVE."
            href="/admin/inventory"
            icon={Package}
            statusLabel="Partial"
            statusTone="ready"
            actionLabel="Open inventory"
            available
          />
          <AdminModuleCard
            title="Staff schedule"
            description="Directory, attendance, shifts, and payroll calc — Partial LIVE."
            href="/admin/hr"
            icon={UserRound}
            statusLabel="Partial"
            statusTone="ready"
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
        <div className="grid min-w-0 gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-1">
            <RecentOrdersPanel orders={data?.recentOrders ?? []} />
          </div>
          <div className="min-w-0">
            <KitchenStatusPanel
              counts={dataReady ? status : null}
              failed={opsFailed}
            />
          </div>
          <div className="min-w-0">
            <DeliveryStatusPanel
              activeDeliveries={dataReady ? (data?.kpis.activeDeliveries ?? null) : null}
              readyCount={dataReady ? ready : null}
              completedCount={dataReady ? (status?.completed ?? null) : null}
              failed={opsFailed}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSurface>
          <AdminSurfaceHeader
            title="Staff today"
            description="Open Admin → HR for live attendance, shifts, and payroll calc."
          />
          <AdminSurfaceBody>
            <p className="text-sm text-[var(--admin-muted)]">
              Branch home does not embed the attendance feed. Use HR for check-in status, shifts, and deactivate.
            </p>
            <Link href="/admin/hr" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-red)]">
              Open staff directory →
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
              <li>Today's sales and orders — available in Reports</li>
              <li>Hourly trends, top products, and refunds — arrive in a later release</li>
              <li>Branch comparison — Owner view only</li>
            </ul>
            <Link href="/admin/reports" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-red)]">
              Open reports →
            </Link>
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </AdminShell>
  );
}
