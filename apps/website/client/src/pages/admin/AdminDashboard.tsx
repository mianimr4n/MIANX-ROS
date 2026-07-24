import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
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
  buildAiInsightItems,
  buildLiveActivity,
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
  if (value == null || Number.isNaN(value)) return "—";
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
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

  const aiItems = useMemo(() => buildAiInsightItems(data), [data]);
  const activity = useMemo(
    () => buildLiveActivity(filteredOrders, data?.alerts ?? []),
    [data?.alerts, filteredOrders],
  );

  const whatsappEntry = data?.sourceBreakdown.find((row) => row.source === "whatsapp");
  const whatsappCount = whatsappEntry?.count;
  const dataReady = Boolean(data) && !error;
  const liveLabel = !isApiConfigured
    ? "API not configured"
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Telepizza ROS
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-ink)] sm:text-3xl">
            {greetingForNow(now)}, {profile?.fullName?.split(" ")[0] || roleLabel}
          </p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {roleLabel} · {branchLabel} · {formatHeaderDate(now)}
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
            {data ? (
              <span className="font-normal opacity-80">
                {new Date(data.generatedAt).toLocaleTimeString("en-PK")}
              </span>
            ) : null}
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
          Date range beyond today is foundation-disabled until analytics endpoints exist.
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
          description="Classified as live, derived, foundation, or unavailable. No fabricated trends."
        />
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
            {Array.from({ length: 8 }).map((_, index) => (
              <AdminKpiSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard
              title="Today’s sales"
              value={formatPkr(data?.kpis.todayGrossSales)}
              source="LIVE"
              detail="Gross sales from today’s non-cancelled orders"
            />
            <AdminKpiCard
              title="Today’s orders"
              value={String(data?.kpis.todayOrders ?? 0)}
              source="LIVE"
              detail="Order count for Asia/Karachi business day"
            />
            <AdminKpiCard
              title="Average order value"
              value={formatPkr(data?.kpis.averageOrderValue)}
              source={data?.kpis.averageOrderValue == null ? "UNAVAILABLE" : "DERIVED"}
              unavailable={data?.kpis.averageOrderValue == null}
              detail={
                data?.kpis.averageOrderValue == null
                  ? "Needs non-cancelled orders today"
                  : "Sales ÷ non-cancelled orders today"
              }
            />
            <AdminKpiCard
              title="Active deliveries"
              value={String(data?.kpis.activeDeliveries ?? 0)}
              source="DERIVED"
              detail="Orders currently in dispatched status"
            />
            <AdminKpiCard
              title="Kitchen queue"
              value={String(data?.kpis.kitchenWaiting ?? 0)}
              source="DERIVED"
              detail="Confirmed + preparing — not a KDS ticket count"
            />
            <AdminKpiCard
              title="WhatsApp-attributed orders"
              value={whatsappCount != null ? String(whatsappCount) : "—"}
              source={whatsappCount == null ? "UNAVAILABLE" : "DERIVED"}
              unavailable={whatsappCount == null}
              detail={
                whatsappCount == null
                  ? "No WhatsApp-sourced orders in the dashboard window"
                  : "Count of WhatsApp-sourced orders in window"
              }
            />
            <AdminKpiCard
              title="Inventory alerts"
              value="—"
              source="UNAVAILABLE"
              unavailable
              detail="Inventory module not live"
            />
            <AdminKpiCard
              title="Customer satisfaction"
              value="—"
              source="UNAVAILABLE"
              unavailable
              detail="Reviews analytics not live"
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
        <AdminSectionTitle eyebrow="Analytics" title="Branch performance" />
        <BranchPerformancePanel rows={data?.branchPerformance ?? null} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <AiInsightsPanel items={aiItems} />
          <LiveActivityPanel items={activity} />
        </div>
        <ExecutiveAside alertCount={data?.alerts.length ?? 0} />
      </div>
    </AdminShell>
  );
}
