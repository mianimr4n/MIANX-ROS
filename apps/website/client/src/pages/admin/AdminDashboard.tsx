import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle, type AdminKpiState } from "@/components/admin/AdminKpiCard";
import {
  DEFAULT_EXECUTIVE_FILTERS,
  ExecutiveFilterBar,
  type ExecutiveDashboardFilters,
} from "@/components/admin/dashboard/ExecutiveFilterBar";
import {
  DeliveryStatusPanel,
  KitchenStatusPanel,
  RecentOrdersPanel,
} from "@/components/admin/dashboard/LiveOperationsPanels";
import { OperationsModuleGrid } from "@/components/admin/dashboard/OperationsModuleGrid";
import {
  AiInsightsPanel,
  BranchPerformancePanel,
  ExecutiveAside,
  LiveActivityPanel,
  SourceBreakdownPanel,
  StatusBreakdownPanel,
  buildLiveActivity,
  buildMianxInsightItems,
} from "@/components/admin/dashboard/ExecutiveWidgets";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessAdminOrdersApi,
  canAccessTableService,
  primaryRoleLabel,
  resolveStaffHome,
} from "@/lib/admin-access";
import { TableServiceSummary } from "@/components/admin/dashboard/TableServiceSummary";
import { OpeningReadinessSummary } from "@/components/admin/dashboard/OpeningReadinessSummary";
import {
  fetchAdminOperationsDashboard,
  fetchSystemHealth,
  fetchTableServiceDashboard,
  type AdminOrderListItem,
} from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData, type OperationalState } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { AdminShell } from "@/pages/admin/AdminShell";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

function formatPkr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatCount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

function greetingForNow(now = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Karachi",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart ?? "12");
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

function formatUpdatedAt(iso: string | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
}

function applyClientFilters(
  orders: AdminOrderListItem[],
  filters: ExecutiveDashboardFilters,
): AdminOrderListItem[] {
  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.channel && order.orderSource !== filters.channel) return false;
    if (filters.deliveryType && order.orderType !== filters.deliveryType) return false;
    return true;
  });
}

/** Map the canonical D2 state onto the KPI card state model. */
function kpiState(opState: OperationalState, unavailable?: boolean): AdminKpiState {
  if (opState === "LOADING") return "loading";
  if (opState === "ERROR" || opState === "OFFLINE") return "error";
  if (opState === "STALE") return "stale";
  if (opState === "UNAVAILABLE" || opState === "FOUNDATION") return "unavailable";
  if (unavailable) return "unavailable";
  if (opState === "EMPTY") return "empty";
  return "available";
}

export default function AdminDashboard() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel, setSelection, allowedBranches } = useAdminBranch();
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<ExecutiveDashboardFilters>(DEFAULT_EXECUTIVE_FILTERS);
  const [now] = useState(() => new Date());

  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessAdminOrdersApi(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  useEffect(() => {
    const home = resolveStaffHome(principal);
    if (home !== "/admin/dashboard") setLocation(home);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- principal fields listed below
  }, [isSuperAdmin, permissions, roles, branchIds, setLocation]);

  const selectedBranch = branchIdFilter
    ? allowedBranches.find((b) => b.id === branchIdFilter)
    : null;
  const comingSoonBranch = selectedBranch?.status === "coming-soon";

  const token = session?.access_token;
  const dashboard = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter],
    { enabled: Boolean(token) && allowed && gateReady && !comingSoonBranch },
  );
  const healthOp = useOperationalData(
    ({ signal, correlationId }) => fetchSystemHealth(token!, { signal, correlationId }),
    [token],
    { enabled: Boolean(token) && isSuperAdmin && gateReady && isApiConfigured, pollMs: 120_000 },
  );

  // Owner/SA occupancy comparison: API requires a branchId anchor; comparison fills occupancyByBranch for multi-branch principals.
  const occupancyAnchorBranchId =
    branchIdFilter ?? branchIds[0] ?? allowedBranches[0]?.id ?? null;
  const wantOccupancyComparison =
    isSuperAdmin || branchIds.length > 1 || (!branchIdFilter && allowedBranches.length > 1);
  const tableServiceOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(
        token!,
        {
          branchId: occupancyAnchorBranchId!,
          includeOccupancyComparison: wantOccupancyComparison,
        },
        { signal, correlationId },
      ),
    [token, occupancyAnchorBranchId, wantOccupancyComparison],
    {
      enabled:
        Boolean(token) &&
        Boolean(occupancyAnchorBranchId) &&
        gateReady &&
        !comingSoonBranch &&
        canAccessTableService({ roles, permissions, isSuperAdmin }) &&
        isApiConfigured,
      pollMs: 30_000,
    },
  );

  const { data, error, state: opState, lastSuccessAt, retry } = dashboard;
  const loading = opState === "LOADING";
  const opsFailed = Boolean(error) || (!data && (opState === "ERROR" || opState === "OFFLINE"));
  const occupancyByBranch = tableServiceOp.data?.occupancyByBranch ?? null;

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return applyClientFilters(data.recentOrders, filters);
  }, [data, filters]);

  const mianxItems = useMemo(
    () => buildMianxInsightItems(data, branchLabel),
    [branchLabel, data],
  );
  const activity = useMemo(
    () => buildLiveActivity(filteredOrders, data?.alerts ?? []),
    [data?.alerts, filteredOrders],
  );

  const dataReady = Boolean(data) && !error;
  const updated = formatUpdatedAt(data?.generatedAt);
  const liveLabel = !isApiConfigured
    ? "API not configured"
    : opState === "OFFLINE"
      ? "Offline"
      : opState === "STALE"
        ? "Stale data"
        : error
          ? "Data unavailable"
          : dataReady
            ? "Live operations"
            : loading
              ? "Loading…"
              : "Idle";

  return (
    <AdminShell title="Executive dashboard">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Telepizza ROS
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-ink)] sm:text-3xl">
            {greetingForNow(now)}, {profile?.fullName?.split(" ")[0] || roleLabel}
          </p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            <span className="font-medium text-[var(--admin-ink)]">{profile?.fullName ?? "Staff"}</span>
            {" · "}
            {roleLabel}
            {" · "}
            {branchLabel}
            {" · "}
            {formatHeaderDate(now)}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Search and notifications remain disabled in the Admin shell until those services ship.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            {liveLabel}
            {updated ? <span className="font-normal opacity-80">{updated}</span> : null}
          </span>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mb-6">
        <ExecutiveFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_EXECUTIVE_FILTERS)}
        />
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Branch reloads KPI data from the API. Status, channel, and type refine the recent-orders list only.
          Date range beyond today stays foundation-disabled until analytics endpoints exist.
        </p>
      </div>

      <OperationalStatusBanner
        state={comingSoonBranch ? "LIVE" : opState}
        error={comingSoonBranch ? null : error}
        lastSuccessAt={lastSuccessAt}
        onRetry={retry}
        correlationId={dashboard.correlationId}
        showTechnicalDetail={isSuperAdmin}
        className="mb-6"
      />

      {comingSoonBranch ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This branch is coming soon. Opening readiness is shown below — live sales and order KPIs stay
          hidden until the branch is operating.
        </div>
      ) : null}

      {!comingSoonBranch ? (
      <section aria-label="Key performance indicators" className="mb-8">
        <AdminSectionTitle
          eyebrow="Health"
          title="Executive KPIs"
          description="Approved live and derived metrics only. Missing values stay honest — never fabricated."
        />
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
            {Array.from({ length: 6 }).map((_, index) => (
              <AdminKpiSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard
              title="Today’s Orders"
              value={formatCount(data?.kpis.todayOrders)}
              secondary="Asia/Karachi business day"
              source="LIVE"
              state={kpiState(opState)}
              lastUpdated={updated}
              detail="Order count for today’s non-cancelled and cancelled rows in scope"
              action={
                <Link href="/admin/orders" className="text-xs font-semibold text-[var(--brand-red)]">
                  Open orders
                </Link>
              }
            />
            <AdminKpiCard
              title="Today’s Sales"
              value={formatPkr(data?.kpis.todayGrossSales)}
              secondary="Gross sales"
              source="LIVE"
              state={kpiState(opState)}
              lastUpdated={updated}
              detail="Gross sales from today’s non-cancelled orders"
            />
            <AdminKpiCard
              title="Active Orders"
              value={formatCount(data?.kpis.activeOrders)}
              secondary="In-flight pipeline"
              source="DERIVED"
              state={kpiState(opState)}
              lastUpdated={updated}
              detail="Orders not yet completed or cancelled"
            />
            <AdminKpiCard
              title="Kitchen Queue"
              value={formatCount(data?.kpis.kitchenWaiting)}
              secondary="Confirmed + preparing"
              source="DERIVED"
              state={kpiState(opState)}
              lastUpdated={updated}
              detail="Status-derived queue — not a live KDS ticket count"
              action={
                <Link href="/admin/kitchen" className="text-xs font-semibold text-[var(--brand-red)]">
                  Open kitchen
                </Link>
              }
            />
            <AdminKpiCard
              title="Active Deliveries"
              value={formatCount(data?.kpis.activeDeliveries)}
              secondary="Dispatched"
              source="DERIVED"
              state={kpiState(opState)}
              lastUpdated={updated}
              detail="Orders currently in dispatched status"
              action={
                <Link href="/admin/delivery" className="text-xs font-semibold text-[var(--brand-red)]">
                  Open delivery
                </Link>
              }
            />
            <AdminKpiCard
              title="Average Order Value"
              value={formatPkr(data?.kpis.averageOrderValue)}
              secondary="Sales ÷ non-cancelled orders"
              source={data?.kpis.averageOrderValue == null ? "UNAVAILABLE" : "DERIVED"}
              state={kpiState(opState, data != null && data.kpis.averageOrderValue == null)}
              lastUpdated={updated}
              detail={
                data != null && data.kpis.averageOrderValue == null
                  ? "Needs non-cancelled orders today"
                  : "Derived from today’s gross sales"
              }
            />
          </div>
        )}
      </section>
      ) : null}

      {!comingSoonBranch ? (
      <div className="mb-8">
        <OperationsModuleGrid />
      </div>
      ) : null}

      {/* D3/D4 — table service + opening readiness (branch-scoped). */}
      {branchIdFilter ? (
        <>
          <OpeningReadinessSummary
            token={token}
            branchId={branchIdFilter}
            enabled={gateReady}
            showTechnicalDetail={isSuperAdmin}
          />
          {!comingSoonBranch ? (
            <TableServiceSummary
              token={token}
              branchId={branchIdFilter}
              enabled={gateReady && canAccessTableService({ roles, permissions, isSuperAdmin })}
              showTechnicalDetail={isSuperAdmin}
            />
          ) : null}
        </>
      ) : !comingSoonBranch && canAccessTableService({ roles, permissions, isSuperAdmin }) ? (
        <p className="mb-8 rounded-xl border bg-[var(--admin-soft)] px-4 py-3 text-sm text-[var(--admin-muted)]">
          Per-branch reservation KPIs need a selected branch. Occupancy comparison below uses an assigned
          branch as the API anchor when multi-branch scope is active.
        </p>
      ) : null}

      {!comingSoonBranch && occupancyByBranch && occupancyByBranch.length > 0 ? (
        <section className="mb-8" aria-label="Occupancy by branch">
          <AdminSectionTitle
            eyebrow="Dine-in"
            title="Occupancy by branch"
            description="Live floor occupied / available / waitlist per branch. Null averages stay unavailable — never shown as zero."
          />
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <AdminKpiCard
              title="Avg wait (min)"
              value={
                tableServiceOp.data?.averages.averageWaitMinutes == null
                  ? null
                  : String(tableServiceOp.data.averages.averageWaitMinutes)
              }
              source="FOUNDATION"
              state={
                tableServiceOp.data?.averages.averageWaitMinutes == null ? "unavailable" : "available"
              }
              detail={tableServiceOp.data?.averages.note}
            />
            <AdminKpiCard
              title="Avg table turn (min)"
              value={
                tableServiceOp.data?.averages.averageTableTurnMinutes == null
                  ? null
                  : String(tableServiceOp.data.averages.averageTableTurnMinutes)
              }
              source="FOUNDATION"
              state={
                tableServiceOp.data?.averages.averageTableTurnMinutes == null
                  ? "unavailable"
                  : "available"
              }
              detail={tableServiceOp.data?.averages.note}
            />
          </div>
          <AdminSurface>
            <AdminSurfaceHeader title="Branch floor comparison" description="From table-service includeOccupancyComparison." />
            <AdminSurfaceBody className="overflow-x-auto pt-0">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[var(--admin-muted)]">
                  <tr className="border-b border-[var(--admin-border)]">
                    <th className="py-3 pr-3 font-medium">Branch</th>
                    <th className="py-3 pr-3 font-medium">Occupied</th>
                    <th className="py-3 pr-3 font-medium">Available</th>
                    <th className="py-3 font-medium">Waitlist</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancyByBranch.map((row) => (
                    <tr key={row.branchId} className="border-b border-[var(--admin-border)]/70">
                      <td className="py-3 pr-3 font-medium">
                        {row.branchCode ??
                          allowedBranches.find((b) => b.id === row.branchId)?.shortName ??
                          row.branchId.slice(0, 8)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{row.occupiedTables}</td>
                      <td className="py-3 pr-3 tabular-nums">{row.availableTables}</td>
                      <td className="py-3 tabular-nums">{row.waitlistCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminSurfaceBody>
          </AdminSurface>
        </section>
      ) : null}

      {isSuperAdmin ? (
        <section className="mb-8" aria-label="System health">
          <AdminSectionTitle
            eyebrow="Platform"
            title="System health"
            description="Technical roles only. No stack traces or credentials."
          />
          <OperationalStatusBanner
            state={healthOp.state}
            error={healthOp.error}
            lastSuccessAt={healthOp.lastSuccessAt}
            onRetry={healthOp.retry}
            correlationId={healthOp.correlationId}
            showTechnicalDetail
          />
          {healthOp.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminKpiCard
                title="API"
                value={healthOp.data.api.status}
                source="LIVE"
                detail={healthOp.data.api.supabaseConfigured ? "Supabase configured" : "Supabase not configured"}
              />
              <AdminKpiCard title="Database" value={healthOp.data.database.status} source="LIVE" detail={healthOp.data.database.note} />
              <AdminKpiCard
                title="Outbox pending"
                value={
                  healthOp.data.notifications.pendingOutboxSample == null
                    ? null
                    : String(healthOp.data.notifications.pendingOutboxSample)
                }
                source="LIVE"
                state={healthOp.data.notifications.pendingOutboxSample == null ? "unavailable" : "available"}
                detail={`Email mode: ${healthOp.data.notifications.emailMode}`}
              />
              <AdminKpiCard
                title="Config warnings"
                value={String(healthOp.data.configurationWarnings.length)}
                source="DERIVED"
                detail={healthOp.data.configurationWarnings[0] ?? "None"}
              />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/admin/settings" className="font-semibold text-red-700 underline-offset-2 hover:underline">
              Open Settings
            </Link>
            <Link href="/admin/hr" className="font-semibold text-red-700 underline-offset-2 hover:underline">
              Manage Users / Roles
            </Link>
            <Link href="/admin/branch" className="font-semibold text-red-700 underline-offset-2 hover:underline">
              Open Branch Readiness
            </Link>
          </div>
        </section>
      ) : null}

      {!comingSoonBranch ? (
      <section className="mb-8" aria-label="Live operations">
        <AdminSectionTitle
          eyebrow="Live"
          title="Operations board"
          description="Recent orders use API data. Kitchen and delivery panels are status-derived."
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <RecentOrdersPanel orders={filteredOrders} />
          </div>
          <KitchenStatusPanel
            counts={dataReady ? (data?.statusCounts ?? {}) : null}
            failed={opsFailed}
          />
          <DeliveryStatusPanel
            activeDeliveries={dataReady ? (data?.kpis.activeDeliveries ?? null) : null}
            readyCount={dataReady ? (data?.statusCounts.ready ?? null) : null}
            completedCount={dataReady ? (data?.statusCounts.completed ?? null) : null}
            failed={opsFailed}
          />
        </div>
      </section>
      ) : null}

      {!comingSoonBranch ? (
      <section className="mb-8" aria-label="Business analytics">
        <AdminSectionTitle
          eyebrow="Analytics"
          title="Business analytics"
          description="Verified breakdowns only. Insufficient data shows an honest empty state."
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <StatusBreakdownPanel counts={data?.statusCounts ?? null} ready={dataReady} />
          <SourceBreakdownPanel rows={data?.sourceBreakdown ?? null} ready={dataReady} />
          <BranchPerformancePanel
            rows={data?.branchPerformance ?? null}
            onSelectBranch={(branchId) => {
              // D2 drill-down: scope the workspace to the branch, then open its dashboard.
              setSelection({ mode: "branch", branchId });
              setLocation("/admin/branch");
            }}
          />
        </div>
      </section>
      ) : null}

      {!comingSoonBranch ? (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <AiInsightsPanel items={mianxItems} loading={loading && !data} />
          <LiveActivityPanel items={activity} />
        </div>
        <ExecutiveAside alertCount={data?.alerts.length ?? 0} />
      </div>
      ) : null}
    </AdminShell>
  );
}
