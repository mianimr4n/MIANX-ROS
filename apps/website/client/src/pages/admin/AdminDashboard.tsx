import { useCallback, useEffect, useMemo, useState } from "react";
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
import { canAccessAdminOrdersApi, isBranchManagerOnly, isKitchenOnly, primaryRoleLabel } from "@/lib/admin-access";
import {
  fetchAdminOperationsDashboard,
  type AdminOperationsDashboard,
  type AdminOrderListItem,
} from "@/lib/admin-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { AdminShell } from "@/pages/admin/AdminShell";

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

function kpiState(args: {
  loading: boolean;
  error: string | null;
  data: AdminOperationsDashboard | null;
  empty?: boolean;
  unavailable?: boolean;
}): AdminKpiState {
  if (args.loading && !args.data) return "loading";
  // Prefer error over stale prior payload so KPIs do not look LIVE while refresh failed.
  if (args.error) return "error";
  if (!args.data) return "unavailable";
  if (args.unavailable) return "unavailable";
  if (args.empty) return "empty";
  return "available";
}

export default function AdminDashboard() {
  const { session, permissions, isSuperAdmin, roles, profile } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<AdminOperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExecutiveDashboardFilters>(DEFAULT_EXECUTIVE_FILTERS);
  const [now] = useState(() => new Date());

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  useEffect(() => {
    if (isKitchenOnly({ roles, permissions, isSuperAdmin })) {
      setLocation("/admin/kitchen-dashboard");
      return;
    }
    if (isBranchManagerOnly({ roles, permissions, isSuperAdmin })) {
      setLocation("/admin/branch");
    }
  }, [isSuperAdmin, permissions, roles, setLocation]);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !allowed) return;
    setLoading(true);
    try {
      const next = await fetchAdminOperationsDashboard(token, { branchId: branchIdFilter });
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void load();
  }, [gateReady, load]);

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
    : error
      ? "Data unavailable"
      : dataReady
        ? "Live operations"
        : loading
          ? "Loading…"
          : "Idle";

  const baseState = { loading, error, data };

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
            onClick={() => void load()}
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

      {error ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          aria-live="assertive"
        >
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

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
              state={kpiState(baseState)}
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
              state={kpiState(baseState)}
              lastUpdated={updated}
              detail="Gross sales from today’s non-cancelled orders"
            />
            <AdminKpiCard
              title="Active Orders"
              value={formatCount(data?.kpis.activeOrders)}
              secondary="In-flight pipeline"
              source="DERIVED"
              state={kpiState(baseState)}
              lastUpdated={updated}
              detail="Orders not yet completed or cancelled"
            />
            <AdminKpiCard
              title="Kitchen Queue"
              value={formatCount(data?.kpis.kitchenWaiting)}
              secondary="Confirmed + preparing"
              source="DERIVED"
              state={kpiState(baseState)}
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
              state={kpiState(baseState)}
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
              state={kpiState({
                ...baseState,
                unavailable: data != null && data.kpis.averageOrderValue == null,
              })}
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

      <div className="mb-8">
        <OperationsModuleGrid />
      </div>

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
          <KitchenStatusPanel counts={data?.statusCounts ?? {}} />
          <DeliveryStatusPanel
            activeDeliveries={data?.kpis.activeDeliveries ?? 0}
            readyCount={data?.statusCounts.ready ?? 0}
            completedCount={data?.statusCounts.completed ?? 0}
          />
        </div>
      </section>

      <section className="mb-8" aria-label="Business analytics">
        <AdminSectionTitle
          eyebrow="Analytics"
          title="Business analytics"
          description="Verified breakdowns only. Insufficient data shows an honest empty state."
        />
        <div className="grid gap-4 xl:grid-cols-3">
          <StatusBreakdownPanel counts={data?.statusCounts ?? null} ready={dataReady} />
          <SourceBreakdownPanel rows={data?.sourceBreakdown ?? null} ready={dataReady} />
          <BranchPerformancePanel rows={data?.branchPerformance ?? null} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <AiInsightsPanel items={mianxItems} loading={loading && !data} />
          <LiveActivityPanel items={activity} />
        </div>
        <ExecutiveAside alertCount={data?.alerts.length ?? 0} />
      </div>
    </AdminShell>
  );
}
