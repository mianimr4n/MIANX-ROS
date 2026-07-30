import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { AdminOperationsDashboard, AdminOrderListItem } from "@/lib/admin-api";
import {
  AiInsightsPanel,
  MianxInsightsPanel,
  buildMianxInsightItems,
  buildDeterministicMianxInsights,
  type MianxInsightItem,
  type MianxInsightSeverity,
} from "@/components/admin/dashboard/MianxInsightsPanel";

export type { MianxInsightItem, MianxInsightSeverity };
export {
  AiInsightsPanel,
  MianxInsightsPanel,
  buildMianxInsightItems,
  buildDeterministicMianxInsights,
};

/** @deprecated Use buildMianxInsightItems — retained name shim for static tests during D1. */
export function buildAiInsightItems(data: AdminOperationsDashboard | null) {
  return buildMianxInsightItems(data, "Current scope").map((item) => ({
    id: item.ruleId,
    title: item.title,
    recommendation: item.recommendedAction,
    source: item.ruleId === "OPS.NO_SIGNAL" ? ("foundation" as const) : ("live" as const),
  }));
}

const STATUS_EVENT_LABEL: Record<string, string> = {
  pending: "Order Created",
  confirmed: "Order Confirmed",
  preparing: "Kitchen Started",
  ready: "Ready",
  dispatched: "Rider Assigned",
  completed: "Delivered",
  cancelled: "Order Cancelled",
};

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

export function ExecutiveAside({
  alertCount,
  pendingPoApprovals = null,
  procurementUnavailable = false,
}: {
  alertCount: number;
  pendingPoApprovals?: number | null;
  procurementUnavailable?: boolean;
}) {
  return (
    <aside className="space-y-4" aria-label="Executive sidebar">
      <AdminSurface>
        <AdminSurfaceHeader title="Operational alerts" description="Delay and backlog alerts in the current branch." />
        <AdminSurfaceBody>
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]">{alertCount}</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">Open alerts in current branch scope</p>
          <Link
            href="/admin/orders"
            className="mt-3 inline-flex text-xs font-semibold text-[var(--brand-red)]"
          >
            Review orders
          </Link>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Quick actions" description="Jump to today’s operational workspaces." />
        <AdminSurfaceBody>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/admin/orders" className="font-semibold text-[var(--brand-red)]">
                Orders
              </Link>
            </li>
            <li>
              <Link href="/admin/kitchen-dashboard" className="font-semibold text-[var(--brand-red)]">
                Kitchen
              </Link>
            </li>
            <li>
              <Link href="/admin/inventory" className="font-semibold text-[var(--brand-red)]">
                Inventory
              </Link>
            </li>
            <li>
              <Link href="/admin/purchasing" className="font-semibold text-[var(--brand-red)]">
                Purchasing
              </Link>
            </li>
          </ul>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Pending PO approvals" description="Draft and submitted purchase orders." />
        <AdminSurfaceBody>
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]">
            {procurementUnavailable || pendingPoApprovals == null ? "—" : pendingPoApprovals}
          </p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {procurementUnavailable || pendingPoApprovals == null
              ? "Source unavailable"
              : "Waiting for approve / reject"}
          </p>
          <Link
            href="/admin/purchasing"
            className="mt-3 inline-flex text-xs font-semibold text-[var(--brand-red)]"
          >
            Open purchasing
          </Link>
        </AdminSurfaceBody>
      </AdminSurface>
    </aside>
  );
}
