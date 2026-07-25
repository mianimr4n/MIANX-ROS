import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { AdminOperationsDashboard, AdminOrderListItem } from "@/lib/admin-api";

export type MianxInsightSeverity = "info" | "warning" | "critical";

export type MianxInsightItem = {
  ruleId: string;
  title: string;
  trigger: string;
  sourceModule: string;
  sourceTimestamp: string;
  branch: string;
  severity: MianxInsightSeverity;
  recommendedAction: string;
};

const STATUS_EVENT_LABEL: Record<string, string> = {
  pending: "Order Created",
  confirmed: "Order Confirmed",
  preparing: "Kitchen Started",
  ready: "Ready",
  dispatched: "Rider Assigned",
  completed: "Delivered",
  cancelled: "Order Cancelled",
};

function formatInsightTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Deterministic Mianx.ai panel — maps verified dashboard alerts/insights only.
 * Not generative AI. No predictions.
 */
export function buildMianxInsightItems(
  data: AdminOperationsDashboard | null,
  branchLabel: string,
): MianxInsightItem[] {
  if (!data) return [];

  const fromAlerts: MianxInsightItem[] = data.alerts.slice(0, 5).map((alert) => ({
    ruleId: `ALERT.${alert.code}`,
    title: alert.message,
    trigger: alert.code.replaceAll("_", " ").toLowerCase(),
    sourceModule: "Orders / Operations",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: alert.severity,
    recommendedAction: alert.orderId
      ? `Review order ${alert.orderNumber ?? alert.orderId} in Orders.`
      : "Open Orders and clear operational backlog.",
  }));

  const fromInsights: MianxInsightItem[] = data.insights.slice(0, 5).map((insight, index) => {
    const lower = insight.toLowerCase();
    let ruleId = `OPS.SUMMARY.${index + 1}`;
    let sourceModule = "Operations dashboard";
    let recommendedAction = "Review the live operations board.";
    let severity: MianxInsightSeverity = "info";

    if (lower.includes("pending")) {
      ruleId = "OPS.PENDING_ATTENTION";
      sourceModule = "Orders";
      recommendedAction = "Open Orders and clear pending confirmations.";
      severity = "warning";
    } else if (lower.includes("alert")) {
      ruleId = "OPS.ALERT_COUNT";
      sourceModule = "Operations alerts";
      recommendedAction = "Review critical alerts in the activity timeline.";
      severity = "warning";
    } else if (lower.includes("kitchen") || lower.includes("preparing")) {
      ruleId = "KITCHEN.QUEUE_SIGNAL";
      sourceModule = "Kitchen";
      recommendedAction = "Open Kitchen board for queue review.";
      severity = "info";
    } else if (lower.includes("no order") || lower.includes("no active")) {
      ruleId = "OPS.QUIET_SCOPE";
      recommendedAction = "No action required — scope is quiet.";
      severity = "info";
    } else if (lower.includes("highest active")) {
      ruleId = "BRANCH.VOLUME_LEADER";
      sourceModule = "Branch performance";
      recommendedAction = "Confirm staffing on the leading branch.";
      severity = "info";
    }

    return {
      ruleId,
      title: insight,
      trigger: "Deterministic dashboard rule evaluation",
      sourceModule,
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity,
      recommendedAction,
    };
  });

  const merged = [...fromAlerts, ...fromInsights];
  if (merged.length > 0) return merged.slice(0, 6);

  return [
    {
      ruleId: "OPS.NO_SIGNAL",
      title: "No live operational signals in the current scope.",
      trigger: "Empty alerts and insights arrays",
      sourceModule: "Operations dashboard",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: "info",
      recommendedAction: "Mianx.ai will surface rule-based summaries when orders or alerts exist.",
    },
  ];
}

/** @deprecated Use buildMianxInsightItems — retained name shim for static tests during D1. */
export function buildAiInsightItems(data: AdminOperationsDashboard | null) {
  return buildMianxInsightItems(data, "Current scope").map((item) => ({
    id: item.ruleId,
    title: item.title,
    recommendation: item.recommendedAction,
    source: item.ruleId === "OPS.NO_SIGNAL" ? ("foundation" as const) : ("live" as const),
  }));
}

export function AiInsightsPanel({
  items,
  loading = false,
}: {
  items: MianxInsightItem[];
  loading?: boolean;
}) {
  return (
    <AdminSurface
      className="bg-gradient-to-br from-white to-[var(--admin-soft)]"
      aria-labelledby="ai-insights-heading"
    >
      <AdminSurfaceHeader
        title="Mianx.ai Operations Insights"
        description="Deterministic rule summaries only — not generative AI and not predictive."
      />
      <AdminSurfaceBody>
        <h3 id="ai-insights-heading" className="sr-only">
          Mianx.ai Operations Insights
        </h3>
        {loading && items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading insights…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Not available yet</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.ruleId}-${item.title}`}
                className="rounded-xl border border-[var(--admin-border)] bg-white/90 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    {item.severity}
                  </span>
                </div>
                <dl className="mt-3 grid gap-1.5 text-xs text-[var(--admin-muted)] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Rule ID</dt>
                    <dd className="font-mono">{item.ruleId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Trigger</dt>
                    <dd>{item.trigger}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Source module</dt>
                    <dd>{item.sourceModule}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Branch</dt>
                    <dd>{item.branch}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Source timestamp</dt>
                    <dd>{formatInsightTime(item.sourceTimestamp)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Recommended action</dt>
                    <dd>{item.recommendedAction}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function BranchPerformancePanel({
  rows,
  onSelectBranch,
}: {
  rows: NonNullable<AdminOperationsDashboard["branchPerformance"]> | null;
  /** D2 drill-down: focus this branch and open its Branch dashboard. */
  onSelectBranch?: (branchId: string) => void;
}) {
  return (
    <AdminSurface aria-labelledby="branch-performance-heading">
      <AdminSurfaceHeader
        title="Branch performance"
        description="Revenue and orders from today’s live scope. Rating arrives with Reviews analytics."
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h3 id="branch-performance-heading" className="sr-only">
          Branch performance
        </h3>
        {!rows || rows.length === 0 ? (
          <p className="py-6 text-sm text-[var(--admin-muted)]">Not available yet</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--admin-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="py-3 pr-3 font-medium">Branch</th>
                <th className="py-3 pr-3 font-medium">Revenue</th>
                <th className="py-3 pr-3 font-medium">Orders</th>
                <th className="py-3 pr-3 font-medium">Avg rating</th>
                <th className="py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.branchId} className="border-b border-[var(--admin-border)]/70">
                  <td className="py-3 pr-3 font-medium">
                    {onSelectBranch ? (
                      <button
                        type="button"
                        onClick={() => onSelectBranch(row.branchId)}
                        className="font-medium text-[var(--brand-red)] underline-offset-2 hover:underline"
                        title="Open branch dashboard scoped to this branch"
                      >
                        {row.branchCode ?? row.branchId}
                      </button>
                    ) : (
                      (row.branchCode ?? row.branchId)
                    )}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">
                    Rs {Math.round(row.todayGrossSales).toLocaleString("en-PK")}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{row.todayOrders}</td>
                  <td className="py-3 pr-3 text-[var(--admin-muted)]">—</td>
                  <td className="py-3 tabular-nums">{row.activeOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function StatusBreakdownPanel({
  counts,
  ready,
}: {
  counts: Record<string, number> | null;
  ready: boolean;
}) {
  const rows = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "dispatched",
    "completed",
    "cancelled",
  ];

  return (
    <AdminSurface aria-labelledby="status-breakdown-heading">
      <AdminSurfaceHeader
        title="Status breakdown"
        description="Verified order status counts in the current dashboard window."
      />
      <AdminSurfaceBody>
        <h3 id="status-breakdown-heading" className="sr-only">
          Status breakdown
        </h3>
        {!ready || !counts ? (
          <p className="text-sm text-[var(--admin-muted)]">Not available yet</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
              >
                <span className="capitalize text-[var(--admin-muted)]">{key}</span>
                <span className="font-semibold tabular-nums text-[var(--admin-ink)]">{counts[key] ?? 0}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SourceBreakdownPanel({
  rows,
  ready,
}: {
  rows: AdminOperationsDashboard["sourceBreakdown"] | null;
  ready: boolean;
}) {
  return (
    <AdminSurface aria-labelledby="source-breakdown-heading">
      <AdminSurfaceHeader
        title="Order source breakdown"
        description="Verified order_source counts — no fabricated channels."
      />
      <AdminSurfaceBody>
        <h3 id="source-breakdown-heading" className="sr-only">
          Order source breakdown
        </h3>
        {!ready || !rows || rows.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Not available yet</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.source}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
              >
                <span className="capitalize text-[var(--admin-muted)]">{row.source}</span>
                <span className="font-semibold tabular-nums text-[var(--admin-ink)]">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
  href?: string;
};

export function buildLiveActivity(
  orders: AdminOrderListItem[],
  alerts: AdminOperationsDashboard["alerts"],
): ActivityItem[] {
  const orderEvents: ActivityItem[] = orders.slice(0, 8).map((order) => {
    const eventLabel = STATUS_EVENT_LABEL[order.status] ?? `Order · ${order.status}`;
    return {
      id: `order-${order.id}`,
      title: `${eventLabel} · ${order.orderNumber}`,
      detail: `${order.branchCode ?? "Branch"} · ${order.orderType} · Rs ${Math.round(order.totalAmount)}`,
      at: order.updatedAt || order.createdAt,
      href: `/admin/orders/${order.id}`,
    };
  });

  const alertEvents: ActivityItem[] = alerts.slice(0, 5).map((alert) => ({
    id: `alert-${alert.id}`,
    title: alert.message,
    detail: alert.code.replaceAll("_", " ").toLowerCase(),
    at: new Date().toISOString(),
    href: alert.orderId ? `/admin/orders/${alert.orderId}` : undefined,
  }));

  return [...orderEvents, ...alertEvents]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);
}

function formatActivityTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function LiveActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <AdminSurface aria-labelledby="live-activity-heading">
      <AdminSurfaceHeader
        title="Activity timeline"
        description="Newest-first events from verified orders and operational alerts."
      />
      <AdminSurfaceBody>
        <h3 id="live-activity-heading" className="sr-only">
          Activity timeline
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No activity in the current scope.</p>
        ) : (
          <ol className="space-y-3 border-l border-[var(--admin-border)] pl-4">
            {items.map((item) => (
              <li key={item.id} className="relative text-sm">
                <span
                  className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]"
                  aria-hidden
                />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-semibold text-[var(--admin-ink)] hover:text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-[var(--admin-ink)]">{item.title}</p>
                )}
                <p className="text-[var(--admin-muted)]">{item.detail}</p>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{formatActivityTime(item.at)}</p>
              </li>
            ))}
          </ol>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ExecutiveAside({ alertCount }: { alertCount: number }) {
  return (
    <aside className="space-y-4" aria-label="Executive sidebar">
      <AdminSurface>
        <AdminSurfaceHeader title="Critical alerts" description="Count from deterministic operational alerts." />
        <AdminSurfaceBody>
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]">{alertCount}</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">Open alerts in current branch scope</p>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Today’s goals" description="Foundation checklist — not tracked tasks." />
        <AdminSurfaceBody>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Foundation
          </p>
          <ul className="space-y-2 text-sm text-[var(--admin-muted)]">
            <li>Keep pending queue under control</li>
            <li>Clear ready orders waiting for dispatch</li>
            <li>Review critical operational alerts</li>
          </ul>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Quick notes" description="Foundation" />
        <AdminSurfaceBody>
          <p className="text-sm text-[var(--admin-muted)]">
            Staff notes and shift handoff are not available in v1.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Pending approvals" description="Foundation" />
        <AdminSurfaceBody>
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-muted)]">—</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Refund / cancel approval workflow is not implemented.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    </aside>
  );
}
