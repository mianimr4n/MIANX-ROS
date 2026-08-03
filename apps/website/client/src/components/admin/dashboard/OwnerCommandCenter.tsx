import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";

import { AdminKpiCard, AdminSectionTitle, type AdminKpiState } from "@/components/admin/AdminKpiCard";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { CommandModeHeader } from "@/components/admin/dashboard/CommandModeHeader";
import { ApprovalInboxPanel } from "@/components/admin/dashboard/ApprovalInboxPanel";
import { BranchHealthPanel } from "@/components/admin/dashboard/BranchHealthPanel";
import { EodPackPanel } from "@/components/admin/dashboard/EodPackPanel";
import { ExceptionCenterPanel } from "@/components/admin/dashboard/ExceptionCenterPanel";
import { ProfitabilityTruthPanel } from "@/components/admin/dashboard/ProfitabilityTruthPanel";
import { WhatChangedPanel } from "@/components/admin/dashboard/WhatChangedPanel";
import { ReportBarChart } from "@/components/admin/reports/ReportCharts";
import {
  buildAttentionMetrics,
  buildLiveOpsMetrics,
  buildOwnerActivity,
  buildOwnerBriefLines,
  buildTodayMetrics,
  type OwnerActivityItem,
  type OwnerCommandLiveExtras,
  type OwnerCommandMetric,
  type SalesReport,
} from "@/components/admin/dashboard/owner-command-builders";
import type { AdminOperationsDashboard, AdminOrderListItem, GoodsReceiving, HrEmployee, PurchaseOrder, StockMovement, SupplierInvoice } from "@/lib/admin-api";
import {
  buildOwnerDashboardZones,
  isPrimaryOwnerZone,
} from "@/lib/owner-dashboard-hierarchy";
import { OwnerDashboardZone } from "@/components/admin/dashboard/OwnerDashboardPresentation";
import {
  getModeComposition,
  hasUnresolvedOperationsFromSignals,
  readCommandModeFromSearch,
  suggestCommandMode,
  writeCommandModeSearch,
  type CommandModeId,
} from "@/lib/command-modes";
import { buildApprovalInbox } from "@/lib/approval-inbox";
import {
  buildBranchHealthScore,
  emphasizeBranchHealthForMode,
} from "@/lib/branch-health";
import {
  buildProfitabilitySnapshot,
  emphasizeProfitabilityForMode,
} from "@/lib/profitability-truth";
import { buildEodPack, emphasizeEodPackForMode } from "@/lib/eod-pack";
import type { ProfitLossReport } from "@/lib/admin-api";
import {
  buildExceptionCenter,
  type DeliveryAssignmentLike,
  type KitchenTicketLike,
} from "@/lib/exception-center/build-exceptions";
import type { OperationalState } from "@/lib/op-status";
import {
  buildCurrentSnapshot,
  buildOperationalTimeline,
  buildWhatChangedSummary,
  clearReviewSnapshot,
  emphasizeWhatChangedForMode,
  readReviewSnapshot,
  writeReviewSnapshot,
  type WhatChangedDomain,
  type WhatChangedSeverity,
} from "@/lib/what-changed";

const QUICK_ACTIONS: Array<{ href: string; label: string }> = [
  { href: "/admin/orders", label: "Open Orders" },
  { href: "/admin/kitchen-dashboard", label: "Kitchen" },
  { href: "/admin/pos", label: "POS" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/inventory", label: "Add Stock Item" },
  { href: "/admin/purchasing", label: "Purchasing" },
  { href: "/admin/purchasing", label: "Create Purchase Order" },
  { href: "/admin/purchasing", label: "Record GRN" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/hr", label: "Open HR" },
];

function metricCardState(state: OwnerCommandMetric["state"]): AdminKpiState {
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  if (state === "unavailable") return "unavailable";
  if (state === "empty") return "empty";
  return "available";
}

import {
  buildKpiDrillDownAriaLabel,
  buildKpiDrillDownHref,
  getKpiDrillDown,
} from "@/lib/kpi-drilldown/registry";
import type { AdminKpiSource } from "@/components/admin/AdminKpiCard";

function MetricLinkCard({ metric }: { metric: OwnerCommandMetric }) {
  const drill = getKpiDrillDown(metric.id);
  const href = drill ? buildKpiDrillDownHref({ metricId: metric.id }) : metric.href;
  const source: AdminKpiSource =
    metric.state === "unavailable"
      ? "UNAVAILABLE"
      : drill?.cardSource ?? "LIVE";
  const card = (
    <AdminKpiCard
      title={metric.title}
      value={metric.value}
      source={source}
      state={metricCardState(metric.state)}
      detail={metric.detail}
      showResolvedZero={metric.state === "available" || metric.state === "empty"}
      className="h-full"
      secondary={
        drill ? `${drill.timeWindowLabel}` : undefined
      }
    />
  );

  if (!href || metric.state === "loading") {
    return (
      <div className="min-w-0" data-kpi-id={metric.id}>
        {card}
        {metric.attentionWhy ? (
          <p className="mt-2 text-xs text-[var(--admin-muted)]">{metric.attentionWhy}</p>
        ) : null}
        {drill?.limitation && metric.state !== "loading" ? (
          <p className="mt-1 text-xs text-[var(--admin-muted)]">{drill.limitation}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0" data-kpi-id={metric.id} data-kpi-maturity="DRILL_DOWN">
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
        aria-label={buildKpiDrillDownAriaLabel({
          title: metric.title,
          value: metric.value,
          metricId: metric.id,
        })}
        data-testid={`kpi-drilldown-${metric.id}`}
      >
        {card}
      </Link>
      {metric.attentionWhy ? (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">{metric.attentionWhy}</p>
      ) : null}
      {drill?.limitation ? (
        <p className="mt-1 text-xs text-[var(--admin-muted)]">{drill.limitation}</p>
      ) : null}
    </div>
  );
}

function MetricGrid({
  metrics,
  columnsClass = "sm:grid-cols-2 xl:grid-cols-4",
}: {
  metrics: OwnerCommandMetric[];
  columnsClass?: string;
}) {
  return (
    <div className={`grid min-w-0 gap-3 ${columnsClass}`}>
      {metrics.map((metric) => (
        <MetricLinkCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

function ActivitySection({
  items,
  loading,
  unavailable,
}: {
  items: OwnerActivityItem[];
  loading: boolean;
  unavailable: boolean;
}) {
  return (
    <section className="mb-8" aria-labelledby="owner-activity-heading">
      <AdminSectionTitle
        eyebrow="Activity"
        title="Recent activity (legacy list)"
        description="Supplemental list. Prefer What Changed / Operational timeline above for privacy-safe derived events."
      />
      <AdminSurface aria-labelledby="owner-activity-heading">
        <AdminSurfaceHeader
          title="Legacy recent list"
          description="Settings change history is not available yet. Employee identity is omitted from this list."
        />
        <AdminSurfaceBody>
          <h2 id="owner-activity-heading" className="sr-only">
            Recent activity
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]" role="status">
              Loading recent activity…
            </p>
          ) : unavailable ? (
            <p className="text-sm text-[var(--admin-muted)]" role="status">
              Activity data unavailable for this scope.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]" role="status">
              No recent activity in the current scope.
            </p>
          ) : (
            <ol className="space-y-3 border-l border-[var(--admin-border)] pl-4">
              {items.map((item) => (
                <li key={item.id} className="relative text-sm">
                  <span
                    className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]"
                    aria-hidden
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    {item.module}
                  </p>
                  <Link
                    href={item.href}
                    className="font-semibold text-[var(--admin-ink)] hover:text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    {new Date(item.at).toLocaleString("en-PK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                      timeZone: "Asia/Karachi",
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-[var(--admin-muted)]">
            Recent Settings Changes: data unavailable — no verified settings audit feed.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    </section>
  );
}

function SalesTrendSection({
  report7d,
  report30d,
  loading7d,
  loading30d,
  error7d,
  error30d,
  orderTrend,
  orderTrendReady,
}: {
  report7d: SalesReport | null;
  report30d: SalesReport | null;
  loading7d: boolean;
  loading30d: boolean;
  error7d: string | null;
  error30d: string | null;
  orderTrend: Array<{ label: string; value: number }> | null;
  orderTrendReady: boolean;
}) {
  const chart7 =
    report7d?.days.map((day) => ({
      label: day.date.slice(5),
      value: Math.round(day.grossSales),
    })) ?? [];
  const chart30 =
    report30d?.days.map((day) => ({
      label: day.date.slice(5),
      value: Math.round(day.grossSales),
    })) ?? [];

  return (
    <section className="mb-8" aria-labelledby="owner-sales-trend-heading">
      <AdminSectionTitle
        eyebrow="Trends"
        title="Sales trend"
        description="Verified sales reports only. No forecasting."
      />
      <h2 id="owner-sales-trend-heading" className="sr-only">
        Sales trend
      </h2>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <AdminSurface>
          <AdminSurfaceHeader
            title="Today’s hourly sales"
            description="Hourly sales breakdown is not available from a verified API yet."
          />
          <AdminSurfaceBody>
            <p className="text-sm text-[var(--admin-muted)]" role="status">
              Data unavailable — planned for a later release.
            </p>
          </AdminSurfaceBody>
        </AdminSurface>

        <AdminSurface>
          <AdminSurfaceHeader title="Last 7 days" description="Daily gross sales (Asia/Karachi)." />
          <AdminSurfaceBody>
            {loading7d ? (
              <p className="text-sm text-[var(--admin-muted)]">Loading 7-day sales…</p>
            ) : error7d ? (
              <p className="text-sm text-red-700" role="alert">
                Data unavailable
              </p>
            ) : !report7d || report7d.totals.totalOrders === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]" role="status">
                No sales in the last 7 days for this scope.
              </p>
            ) : (
              <ReportBarChart data={chart7} title="Last 7 days sales" valueLabel="PKR" />
            )}
          </AdminSurfaceBody>
        </AdminSurface>

        <AdminSurface>
          <AdminSurfaceHeader title="Last 30 days" description="Daily gross sales (Asia/Karachi)." />
          <AdminSurfaceBody>
            {loading30d ? (
              <p className="text-sm text-[var(--admin-muted)]">Loading 30-day sales…</p>
            ) : error30d ? (
              <p className="text-sm text-red-700" role="alert">
                Data unavailable
              </p>
            ) : !report30d || report30d.totals.totalOrders === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]" role="status">
                No sales in the last 30 days for this scope.
              </p>
            ) : (
              <ReportBarChart data={chart30} title="Last 30 days sales" valueLabel="PKR" />
            )}
          </AdminSurfaceBody>
        </AdminSurface>

        <AdminSurface>
          <AdminSurfaceHeader title="Order trend" description="Daily order counts from the sales report." />
          <AdminSurfaceBody>
            {!orderTrendReady ? (
              <p className="text-sm text-[var(--admin-muted)]" role="status">
                Data unavailable
              </p>
            ) : !orderTrend || orderTrend.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]" role="status">
                No order trend data for this scope.
              </p>
            ) : (
              <ReportBarChart data={orderTrend} title="Order trend" valueLabel="orders" />
            )}
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </section>
  );
}

function TopProductsSection({
  channelMix,
  averageBasket,
  ready,
}: {
  channelMix: Array<{ label: string; value: number }> | null;
  averageBasket: string | null;
  ready: boolean;
}) {
  return (
    <section className="mb-8" aria-labelledby="owner-top-products-heading">
      <AdminSectionTitle
        eyebrow="Mix"
        title="Top products & channels"
        description="Only widgets with a verified live source are shown."
      />
      <h2 id="owner-top-products-heading" className="sr-only">
        Top products and channels
      </h2>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSurface>
          <AdminSurfaceHeader title="Top selling products" description="Product ranking feed not verified." />
          <AdminSurfaceBody>
            <p className="text-sm text-[var(--admin-muted)]">Data unavailable</p>
          </AdminSurfaceBody>
        </AdminSurface>
        <AdminSurface>
          <AdminSurfaceHeader title="Top categories" description="Category ranking feed not verified." />
          <AdminSurfaceBody>
            <p className="text-sm text-[var(--admin-muted)]">Data unavailable</p>
          </AdminSurfaceBody>
        </AdminSurface>
        <AdminSurface>
          <AdminSurfaceHeader title="Average basket" description="From today’s operations KPIs." />
          <AdminSurfaceBody>
            {!ready ? (
              <p className="text-sm text-[var(--admin-muted)]">Data unavailable</p>
            ) : averageBasket == null ? (
              <p className="text-sm text-[var(--admin-muted)]">Needs non-cancelled orders today</p>
            ) : (
              <p className="text-2xl font-semibold tabular-nums text-[var(--admin-ink)]">{averageBasket}</p>
            )}
          </AdminSurfaceBody>
        </AdminSurface>
        <AdminSurface>
          <AdminSurfaceHeader title="Order channel mix" description="From live operations source breakdown." />
          <AdminSurfaceBody>
            {!ready || !channelMix ? (
              <p className="text-sm text-[var(--admin-muted)]">Data unavailable</p>
            ) : channelMix.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">No channel mix in current scope.</p>
            ) : (
              <ReportBarChart data={channelMix} title="Order channel mix" valueLabel="orders" />
            )}
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </section>
  );
}

function OwnerBriefSection({ lines, loading }: { lines: string[]; loading: boolean }) {
  return (
    <section className="mb-8" aria-labelledby="owner-brief-heading">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Owner Brief"
        description="Deterministic business language from verified counts only — no AI prediction."
      />
      <AdminSurface className="bg-gradient-to-br from-white to-[var(--admin-soft)]" aria-labelledby="owner-brief-heading">
        <AdminSurfaceHeader title="Mianx.ai Owner Brief" description="Rule-based summaries for today’s attention." />
        <AdminSurfaceBody>
          <h2 id="owner-brief-heading" className="sr-only">
            Mianx.ai Owner Brief
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]" role="status">
              Preparing owner brief…
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {lines.map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm text-[var(--admin-ink)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>
    </section>
  );
}

function QuickActionsSection() {
  return (
    <section className="mb-8" aria-labelledby="owner-quick-actions-heading">
      <AdminSectionTitle
        eyebrow="Shortcuts"
        title="Quick actions"
        description="Owner shortcuts into live workspaces."
      />
      <AdminSurface aria-labelledby="owner-quick-actions-heading">
        <AdminSurfaceHeader title="Owner shortcuts" description="Jump to today’s operational work." />
        <AdminSurfaceBody>
          <h2 id="owner-quick-actions-heading" className="sr-only">
            Quick actions
          </h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {QUICK_ACTIONS.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 w-full items-center rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 font-semibold text-[var(--brand-red)] transition-colors hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </AdminSurfaceBody>
      </AdminSurface>
    </section>
  );
}

export type OwnerCommandCenterProps = {
  data: AdminOperationsDashboard | null;
  opState: OperationalState;
  loading: boolean;
  branchId: string | null;
  branchLabel: string;
  /** Branch profile hours when a single branch is selected (read-only). */
  branchOpensAt?: string | null;
  branchClosesAt?: string | null;
  branchTimezone?: string | null;
  /** Optional injected clock for tests; defaults to Date.now(). */
  now?: Date;
  extras: OwnerCommandLiveExtras;
  kitchenTickets: KitchenTicketLike[] | null;
  kitchenState: OperationalState;
  deliveryAssignments: DeliveryAssignmentLike[] | null;
  deliveryState: OperationalState;
  financeEnabled: boolean;
  purchasingEnabled?: boolean;
  hrEnabled?: boolean;
  financeState: OperationalState;
  /** Posted P&L only — null when restricted, loading, or unavailable. */
  profitLoss: ProfitLossReport | null;
  profitLossState: OperationalState;
  onExceptionRetry?: () => void;
  orders: AdminOrderListItem[] | null;
  movements: StockMovement[] | null;
  purchaseOrders: PurchaseOrder[] | null;
  invoices: SupplierInvoice[] | null;
  receipts: GoodsReceiving[] | null;
  employees: HrEmployee[] | null;
  activityLoading: boolean;
  activityUnavailable: boolean;
  report7d: SalesReport | null;
  report30d: SalesReport | null;
  loading7d: boolean;
  loading30d: boolean;
  error7d: string | null;
  error30d: string | null;
};

export function OwnerCommandCenter({
  data,
  opState,
  loading,
  branchId,
  branchLabel,
  branchOpensAt = null,
  branchClosesAt = null,
  branchTimezone = null,
  now,
  extras,
  kitchenTickets,
  kitchenState,
  deliveryAssignments,
  deliveryState,
  financeEnabled,
  purchasingEnabled = true,
  hrEnabled = true,
  financeState,
  profitLoss,
  profitLossState,
  onExceptionRetry,
  orders,
  movements,
  purchaseOrders,
  invoices,
  receipts,
  employees,
  activityLoading,
  activityUnavailable,
  report7d,
  report30d,
  loading7d,
  loading30d,
  error7d,
  error30d,
}: OwnerCommandCenterProps) {
  const search = useSearch();
  const [locationPath, setLocation] = useLocation();
  const pathOnly = locationPath.split("?")[0] || "/admin/dashboard";

  const todayMetrics = buildTodayMetrics(data, opState, loading);
  const liveMetrics = buildLiveOpsMetrics(data, opState, extras, loading);
  const attentionMetrics = buildAttentionMetrics(data, opState, extras);
  const exceptionCenter = useMemo(
    () =>
      buildExceptionCenter({
        branchId,
        branchName: branchLabel,
        ops: { data, state: opState },
        kitchen: { tickets: kitchenTickets, state: kitchenState },
        delivery: { assignments: deliveryAssignments, state: deliveryState },
        finance: {
          enabled: financeEnabled,
          unresolvedCashVariance: extras.financeAttention?.unresolvedCashVariance ?? null,
          unavailable: Boolean(extras.financeAttention?.unavailable),
          state: financeState,
        },
      }),
    [
      branchId,
      branchLabel,
      data,
      opState,
      kitchenTickets,
      kitchenState,
      deliveryAssignments,
      deliveryState,
      financeEnabled,
      financeState,
      extras.financeAttention?.unresolvedCashVariance,
      extras.financeAttention?.unavailable,
    ],
  );
  const activity = buildOwnerActivity({
    orders,
    movements,
    ordersPurchasing: purchaseOrders,
    invoices,
    receipts,
    // DASH-08: do not surface employee identity in Owner activity lists.
    employees: null,
  });
  void employees;
  const briefLines = buildOwnerBriefLines(data, extras, branchLabel);
  const dataReady = Boolean(data) && opState !== "ERROR" && opState !== "OFFLINE" && opState !== "UNAVAILABLE";
  const channelMix =
    dataReady && data?.sourceBreakdown
      ? data.sourceBreakdown.map((row) => ({
          label: row.source,
          value: row.count,
        }))
      : null;
  const averageBasket =
    dataReady && data?.kpis.averageOrderValue != null
      ? `Rs ${Math.round(data.kpis.averageOrderValue).toLocaleString("en-PK")}`
      : null;
  const orderTrend =
    report7d && !error7d
      ? report7d.days.map((day) => ({
          label: day.date.slice(5),
          value: day.totalOrders,
        }))
      : null;

  const openKitchenTickets =
    kitchenTickets?.filter((t) => ["queued", "accepted", "preparing", "ready"].includes(String(t.status)))
      .length ?? null;
  const activeAssignments =
    deliveryAssignments?.filter((a) => ["pending", "assigned", "picked-up"].includes(String(a.status)))
      .length ?? null;

  const suggestion = useMemo(() => {
    const clock = now ?? new Date();
    return suggestCommandMode({
      now: clock,
      timeZone: branchTimezone || data?.timezone || "Asia/Karachi",
      opensAt: branchOpensAt,
      closesAt: branchClosesAt,
      hasUnresolvedOperations: hasUnresolvedOperationsFromSignals({
        activeOrders: data?.kpis.activeOrders,
        kitchenWaiting: data?.kpis.kitchenWaiting,
        activeDeliveries: data?.kpis.activeDeliveries,
        openKitchenTickets,
        activeAssignments,
      }),
    });
  }, [
    now,
    branchTimezone,
    data?.timezone,
    branchOpensAt,
    branchClosesAt,
    data?.kpis.activeOrders,
    data?.kpis.kitchenWaiting,
    data?.kpis.activeDeliveries,
    openKitchenTickets,
    activeAssignments,
  ]);

  const manualMode = readCommandModeFromSearch(search);
  const selectedMode: CommandModeId = manualMode ?? suggestion.mode;

  const setCommandMode = useCallback(
    (mode: CommandModeId | null) => {
      const nextSearch = writeCommandModeSearch(search, mode);
      setLocation(nextSearch ? `${pathOnly}${nextSearch}` : pathOnly);
    },
    [pathOnly, search, setLocation],
  );

  const composition = getModeComposition(selectedMode);

  const approvalInbox = useMemo(
    () =>
      buildApprovalInbox({
        branchId,
        branchName: branchLabel,
        financeEnabled,
        purchasingEnabled,
        hrEnabled,
        procurement: extras.procurement
          ? {
              unavailable: Boolean(extras.procurement.unavailable),
              pendingPoApprovals: extras.procurement.pendingPoApprovals,
            }
          : null,
        financeAttention: extras.financeAttention
          ? {
              unavailable: Boolean(extras.financeAttention.unavailable),
              cashClosesAwaitingApproval: extras.financeAttention.cashClosesAwaitingApproval,
              pendingExpenseApprovals: extras.financeAttention.pendingExpenseApprovals,
            }
          : null,
        workforceAttention: extras.workforceAttention
          ? {
              unavailable: Boolean(extras.workforceAttention.unavailable),
              leaveRequestsAwaitingApproval: extras.workforceAttention.leaveRequestsAwaitingApproval,
            }
          : null,
      }),
    [
      branchId,
      branchLabel,
      financeEnabled,
      purchasingEnabled,
      hrEnabled,
      extras.procurement,
      extras.financeAttention,
      extras.workforceAttention,
    ],
  );

  const branchHealthBase = useMemo(
    () =>
      buildBranchHealthScore({
        branchId,
        branchName: branchLabel,
        nowMs: (now ?? new Date()).getTime(),
        ops: { data, state: opState },
        kitchen: { tickets: kitchenTickets, state: kitchenState },
        delivery: { assignments: deliveryAssignments, state: deliveryState },
        finance: {
          enabled: financeEnabled,
          unresolvedCashVariance: extras.financeAttention?.unresolvedCashVariance ?? null,
          unavailable: Boolean(extras.financeAttention?.unavailable),
          state: financeState,
        },
      }),
    [
      branchId,
      branchLabel,
      now,
      data,
      opState,
      kitchenTickets,
      kitchenState,
      deliveryAssignments,
      deliveryState,
      financeEnabled,
      financeState,
      extras.financeAttention?.unresolvedCashVariance,
      extras.financeAttention?.unavailable,
    ],
  );

  const branchHealth = useMemo(
    () => emphasizeBranchHealthForMode(branchHealthBase, selectedMode),
    [branchHealthBase, selectedMode],
  );

  const profitabilityBase = useMemo(
    () =>
      buildProfitabilitySnapshot({
        branchId,
        branchName: branchLabel,
        nowMs: (now ?? new Date()).getTime(),
        timezone: branchTimezone || data?.timezone || "Asia/Karachi",
        financeEnabled,
        ops: { data, state: opState },
        accounting: {
          profitLoss,
          state: profitLossState,
          unavailable:
            financeEnabled &&
            (profitLossState === "ERROR" ||
              profitLossState === "OFFLINE" ||
              profitLossState === "UNAVAILABLE"),
        },
      }),
    [
      branchId,
      branchLabel,
      now,
      branchTimezone,
      data,
      opState,
      financeEnabled,
      profitLoss,
      profitLossState,
    ],
  );

  const profitability = useMemo(
    () => emphasizeProfitabilityForMode(profitabilityBase, selectedMode),
    [profitabilityBase, selectedMode],
  );

  const [eodRefreshTick, setEodRefreshTick] = useState(0);

  const eodPackBase = useMemo(
    () =>
      buildEodPack({
        branchId,
        branchName: branchLabel,
        nowMs: (now ?? new Date()).getTime(),
        timezone: branchTimezone || data?.timezone || "Asia/Karachi",
        financeEnabled,
        purchasingEnabled,
        hrEnabled,
        ops: { data, state: opState },
        kitchen: { tickets: kitchenTickets, state: kitchenState },
        delivery: { assignments: deliveryAssignments, state: deliveryState },
        exceptionCenter: {
          exceptions: exceptionCenter.exceptions.map((e) => ({
            type: e.type,
            domain: e.domain,
            severity: e.severity,
            count: e.count,
            title: e.title,
            oldestAt: e.oldestAt,
            source: e.source,
            trustState: e.trustState,
            drillDown: e.drillDown,
            limitation: e.limitation ?? e.drillDown.limitation,
          })),
          totalFailure: exceptionCenter.totalFailure,
          partialFailure: exceptionCenter.partialFailure,
          unavailableSources: exceptionCenter.unavailableSources,
        },
        approvalInbox: {
          items: approvalInbox.items.map((a) => ({
            approvalType: a.approvalType,
            domain: a.domain,
            priority: a.priority,
            count: a.count,
            title: a.title,
            source: a.source,
            destinationHref: a.destinationHref,
            destinationLabel: a.destinationLabel,
          })),
          totalPendingCount: approvalInbox.totalPendingCount,
          urgentCount: approvalInbox.urgentCount,
          totalFailure: approvalInbox.totalFailure,
          deferredDomainsNote: approvalInbox.deferredDomainsNote,
        },
        branchHealth: {
          score: branchHealthBase.score,
          scoreState: branchHealthBase.scoreState,
          statusLabel: branchHealthBase.statusLabel,
          confidence: branchHealthBase.confidence,
          coveragePercent: branchHealthBase.coveragePercent,
          freshnessState: branchHealthBase.freshnessState,
        },
        profitability: {
          operationalState: profitabilityBase.operational.state,
          accountingState: profitabilityBase.accounting.state,
          accountingPeriod: profitabilityBase.accounting.accountingPeriod,
          operationalCoverage: profitabilityBase.operational.coveragePercent,
          accountingCoverage: profitabilityBase.accounting.coveragePercent,
        },
        financeAttention: extras.financeAttention
          ? {
              unavailable: Boolean(extras.financeAttention.unavailable),
              unresolvedCashVariance: extras.financeAttention.unresolvedCashVariance,
              cashClosesAwaitingApproval: extras.financeAttention.cashClosesAwaitingApproval,
              pendingExpenseApprovals: extras.financeAttention.pendingExpenseApprovals,
            }
          : null,
      }),
    [
      branchId,
      branchLabel,
      now,
      eodRefreshTick,
      branchTimezone,
      data,
      opState,
      financeEnabled,
      purchasingEnabled,
      hrEnabled,
      kitchenTickets,
      kitchenState,
      deliveryAssignments,
      deliveryState,
      exceptionCenter,
      approvalInbox,
      branchHealthBase,
      profitabilityBase,
      extras.financeAttention,
    ],
  );

  const eodPack = useMemo(
    () => emphasizeEodPackForMode(eodPackBase, selectedMode),
    [eodPackBase, selectedMode],
  );

  const [whatChangedTick, setWhatChangedTick] = useState(0);
  const [timelineDomainFilter, setTimelineDomainFilter] = useState<WhatChangedDomain | "all">("all");
  const [timelineSeverityFilter, setTimelineSeverityFilter] = useState<WhatChangedSeverity | "all">(
    "all",
  );

  const businessWindow = useMemo(() => {
    const tz = branchTimezone || data?.timezone || "Asia/Karachi";
    const clock = now ?? new Date();
    if (data?.dayStart && /^\d{4}-\d{2}-\d{2}/.test(data.dayStart)) {
      return data.dayStart.slice(0, 10);
    }
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(clock);
  }, [branchTimezone, data?.timezone, data?.dayStart, now]);

  const currentSafeMetrics = useMemo(() => {
    const delayedKitchen =
      exceptionCenter.exceptions.find((e) => e.type === "EXC-KDS-DELAY")?.count ??
      (kitchenState !== "ERROR" && kitchenState !== "OFFLINE" && kitchenState !== "UNAVAILABLE"
        ? 0
        : null);
    const criticalExceptions = exceptionCenter.exceptions
      .filter((e) => e.severity === "CRITICAL")
      .reduce((sum, e) => sum + e.count, 0);
    const warningExceptions = exceptionCenter.exceptions
      .filter((e) => e.severity === "WARNING")
      .reduce((sum, e) => sum + e.count, 0);
    const opsOk = opState !== "ERROR" && opState !== "OFFLINE" && opState !== "UNAVAILABLE" && Boolean(data);
    return {
      metrics: {
        grossSales: opsOk ? (data?.kpis.todayGrossSales ?? null) : null,
        orderCount: opsOk ? (data?.kpis.todayOrders ?? null) : null,
        openOrders: opsOk ? (data?.kpis.activeOrders ?? null) : null,
        lowStockCount: opsOk ? (data?.kpis.lowStockCount ?? null) : null,
        delayedKitchenCount: delayedKitchen,
        pendingApprovals: approvalInbox.totalFailure ? null : approvalInbox.totalPendingCount,
        criticalExceptions: exceptionCenter.totalFailure ? null : criticalExceptions,
        warningExceptions: exceptionCenter.totalFailure ? null : warningExceptions,
        branchHealthScore:
          branchHealthBase.scoreState === "INSUFFICIENT_DATA" || branchHealthBase.score == null
            ? null
            : branchHealthBase.score,
        activeDeliveries:
          deliveryState !== "ERROR" &&
          deliveryState !== "OFFLINE" &&
          deliveryState !== "UNAVAILABLE"
            ? (deliveryAssignments?.filter((a) =>
                ["pending", "assigned", "picked-up"].includes(String(a.status)),
              ).length ?? 0)
            : null,
      },
      sourceOk: {
        ops: opsOk,
        kitchen: kitchenState !== "ERROR" && kitchenState !== "OFFLINE" && kitchenState !== "UNAVAILABLE",
        delivery:
          deliveryState !== "ERROR" &&
          deliveryState !== "OFFLINE" &&
          deliveryState !== "UNAVAILABLE",
        approvals: !approvalInbox.totalFailure,
        exceptions: !exceptionCenter.totalFailure,
        health: branchHealthBase.freshnessState !== "UNAVAILABLE",
      },
    };
  }, [
    data,
    opState,
    kitchenState,
    deliveryState,
    deliveryAssignments,
    exceptionCenter,
    approvalInbox,
    branchHealthBase,
  ]);

  const whatChangedBase = useMemo(() => {
    void whatChangedTick;
    const previous = readReviewSnapshot();
    return buildWhatChangedSummary({
      branchId,
      branchName: branchLabel,
      businessWindow,
      nowMs: (now ?? new Date()).getTime(),
      previousSnapshot: previous,
      currentMetrics: currentSafeMetrics.metrics,
      sourceOk: currentSafeMetrics.sourceOk,
    });
  }, [
    whatChangedTick,
    branchId,
    branchLabel,
    businessWindow,
    now,
    currentSafeMetrics,
  ]);

  const whatChanged = useMemo(
    () => emphasizeWhatChangedForMode(whatChangedBase, selectedMode),
    [whatChangedBase, selectedMode],
  );

  const operationalTimeline = useMemo(() => {
    void whatChangedTick;
    const windowStartMs = whatChangedBase.comparisonStart
      ? Date.parse(whatChangedBase.comparisonStart)
      : null;
    return buildOperationalTimeline({
      branchId,
      branchName: branchLabel,
      orders,
      ordersFailed: activityUnavailable,
      movements,
      movementsFailed: activityUnavailable,
      purchaseOrders,
      purchasingFailed: !purchasingEnabled || activityUnavailable,
      kitchenTickets,
      kitchenFailed:
        kitchenState === "ERROR" || kitchenState === "OFFLINE" || kitchenState === "UNAVAILABLE",
      deliveryAssignments,
      deliveryFailed:
        deliveryState === "ERROR" ||
        deliveryState === "OFFLINE" ||
        deliveryState === "UNAVAILABLE",
      hrAvailable: hrEnabled,
      hrFailed: false,
      financeRestricted: !financeEnabled,
      windowStartMs: Number.isFinite(windowStartMs) ? windowStartMs : null,
      nowMs: (now ?? new Date()).getTime(),
    });
  }, [
    whatChangedTick,
    whatChangedBase.comparisonStart,
    branchId,
    branchLabel,
    orders,
    movements,
    purchaseOrders,
    kitchenTickets,
    deliveryAssignments,
    activityUnavailable,
    activityLoading,
    purchasingEnabled,
    kitchenState,
    deliveryState,
    hrEnabled,
    financeEnabled,
    now,
  ]);

  const markReviewedOnDevice = useCallback(() => {
    const snap = buildCurrentSnapshot({
      branchId,
      businessWindow,
      reviewedAt: new Date((now ?? new Date()).getTime()).toISOString(),
      metrics: currentSafeMetrics.metrics,
      sourceOk: currentSafeMetrics.sourceOk,
    });
    writeReviewSnapshot(snap);
    setWhatChangedTick((n) => n + 1);
  }, [branchId, businessWindow, now, currentSafeMetrics]);

  const resetReviewBaseline = useCallback(() => {
    clearReviewSnapshot();
    setWhatChangedTick((n) => n + 1);
  }, []);

  const todaySection = (
    <section className="mb-6" aria-labelledby="owner-today-heading" data-mode-section="today-kpis">
      <AdminSectionTitle
        eyebrow="Pulse"
        title="Today — operational"
        description="Gross sales, orders, and AOV for the Asia/Karachi business day — not Accounting Posted."
      />
      <h2 id="owner-today-heading" className="sr-only">
        Today operational KPIs
      </h2>
      <MetricGrid metrics={todayMetrics} />
    </section>
  );

  const liveOpsSection = (
    <section className="mb-6" aria-labelledby="owner-live-ops-heading" data-mode-section="live-ops-kpis">
      <AdminSectionTitle
        eyebrow="Now"
        title="Live operations"
        description="Kitchen, delivery, and completion counts for the current window."
      />
      <h2 id="owner-live-ops-heading" className="sr-only">
        Live operations
      </h2>
      <MetricGrid metrics={liveMetrics} columnsClass="sm:grid-cols-2 xl:grid-cols-3" />
    </section>
  );

  const attentionSection = (
    <section className="mb-6" aria-labelledby="owner-attention-heading" data-mode-section="attention-kpis">
      <AdminSectionTitle
        eyebrow="Signals"
        title="Attention signals"
        description="KPI strip for supported attention counts — Exception Center remains authoritative above."
      />
      <h2 id="owner-attention-heading" className="sr-only">
        Attention signals
      </h2>
      <MetricGrid metrics={attentionMetrics} columnsClass="sm:grid-cols-2 xl:grid-cols-3" />
    </section>
  );

  const unsupportedSection =
    composition.unsupportedNote ? (
      <section
        className="mb-6 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3"
        aria-label="Mode coverage limitations"
        data-mode-section="unsupported-note"
        data-testid="command-mode-limitations"
      >
        <p className="text-sm text-[var(--admin-muted)]">{composition.unsupportedNote}</p>
      </section>
    ) : null;

  const modeSummary = (
    <p className="mb-3 text-sm text-[var(--admin-muted)]" data-mode-section="mode-summary">
      Mode reorders verified widgets only. It does not change branch hours or open/close status.
    </p>
  );

  const sectionMap: Record<string, ReactNode> = {
    "exception-center": (
      <ExceptionCenterPanel
        key="exception-center"
        result={exceptionCenter}
        loading={loading || kitchenState === "LOADING" || deliveryState === "LOADING" || financeState === "LOADING"}
        onRetry={onExceptionRetry}
      />
    ),
    "approval-inbox": (
      <ApprovalInboxPanel
        key="approval-inbox"
        result={approvalInbox}
        loading={loading}
        commandMode={selectedMode}
        onRetry={onExceptionRetry}
      />
    ),
    "branch-health": (
      <BranchHealthPanel
        key="branch-health"
        result={branchHealth}
        loading={
          loading || kitchenState === "LOADING" || deliveryState === "LOADING" || financeState === "LOADING"
        }
        commandMode={selectedMode}
      />
    ),
    "profitability-truth": (
      <ProfitabilityTruthPanel
        key="profitability-truth"
        result={profitability}
        loading={loading || (financeEnabled && profitLossState === "LOADING")}
        commandMode={selectedMode}
      />
    ),
    "eod-pack": (
      <EodPackPanel
        key="eod-pack"
        result={eodPack}
        loading={loading || kitchenState === "LOADING" || deliveryState === "LOADING"}
        commandMode={selectedMode}
        onRefresh={() => {
          setEodRefreshTick((n) => n + 1);
          onExceptionRetry?.();
        }}
      />
    ),
    "what-changed": (
      <WhatChangedPanel
        key="what-changed"
        summary={whatChanged}
        timeline={operationalTimeline}
        loading={loading || kitchenState === "LOADING" || deliveryState === "LOADING" || activityLoading}
        commandMode={selectedMode}
        onRefresh={() => {
          setWhatChangedTick((n) => n + 1);
          onExceptionRetry?.();
        }}
        onMarkReviewed={markReviewedOnDevice}
        onResetBaseline={resetReviewBaseline}
        domainFilter={timelineDomainFilter}
        severityFilter={timelineSeverityFilter}
        onDomainFilter={setTimelineDomainFilter}
        onSeverityFilter={setTimelineSeverityFilter}
      />
    ),
    "mode-summary": <div key="mode-summary">{modeSummary}</div>,
    "unsupported-note": unsupportedSection ? <div key="unsupported-note">{unsupportedSection}</div> : null,
    "today-kpis": <div key="today-kpis">{todaySection}</div>,
    "live-ops-kpis": <div key="live-ops-kpis">{liveOpsSection}</div>,
    "attention-kpis": <div key="attention-kpis">{attentionSection}</div>,
    activity: (
      <ActivitySection
        key="activity"
        items={activity}
        loading={activityLoading}
        unavailable={activityUnavailable}
      />
    ),
    "quick-actions": <QuickActionsSection key="quick-actions" />,
    "sales-trend": (
      <SalesTrendSection
        key="sales-trend"
        report7d={report7d}
        report30d={report30d}
        loading7d={loading7d}
        loading30d={loading30d}
        error7d={error7d}
        error30d={error30d}
        orderTrend={orderTrend}
        orderTrendReady={!error7d && Boolean(report7d)}
      />
    ),
    "top-products": (
      <TopProductsSection
        key="top-products"
        channelMix={channelMix}
        averageBasket={averageBasket}
        ready={dataReady}
      />
    ),
    "owner-brief": (
      <OwnerBriefSection key="owner-brief" lines={briefLines} loading={loading && !data} />
    ),
  };

  const zones = useMemo(
    () => buildOwnerDashboardZones(selectedMode, composition.sections),
    [selectedMode, composition.sections],
  );

  return (
    <div
      className="owner-command-center min-w-0"
      data-testid="owner-command-center"
      data-selected-command-mode={selectedMode}
      data-owner-hierarchy="polish-02"
    >
      <p className="mb-3 text-sm text-[var(--admin-muted)]">
        Scan top-down: attention → pulse → health → changes → closing readiness.
      </p>

      <CommandModeHeader
        selectedMode={selectedMode}
        suggestion={suggestion}
        manualOverride={Boolean(manualMode)}
        onSelectMode={(mode) => setCommandMode(mode)}
        onUseSuggested={() => setCommandMode(null)}
      />

      {zones.map((zone) => {
        const primary = isPrimaryOwnerZone(zone.id, selectedMode);
        const collapseSecondary =
          selectedMode === "CLOSING" && (zone.id === "secondary" || zone.id === "what-changed");
        return (
          <OwnerDashboardZone
            key={zone.id}
            id={zone.id}
            title={zone.title}
            purpose={zone.purpose}
            primary={primary}
            defaultCollapsed={collapseSecondary}
          >
            {zone.sections.map((id) => sectionMap[id] ?? null)}
          </OwnerDashboardZone>
        );
      })}
    </div>
  );
}

export { QUICK_ACTIONS };
