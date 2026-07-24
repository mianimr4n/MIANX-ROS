import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { AdminOperationsDashboard, AdminOrderListItem } from "@/lib/admin-api";

export type AiInsightItem = {
  id: string;
  title: string;
  recommendation: string;
  source: "live" | "foundation";
};

/** Live deterministic insights only — no demand/inventory forecasts without data. */
export function buildAiInsightItems(data: AdminOperationsDashboard | null): AiInsightItem[] {
  const live =
    data?.insights.map((insight, index) => ({
      id: `live-${index}`,
      title: insight,
      recommendation: "Rule-based summary from current dashboard counts and alerts.",
      source: "live" as const,
    })) ?? [];

  if (live.length > 0) {
    return live.slice(0, 5);
  }

  return [
    {
      id: "foundation-empty",
      title: "No live operational signals in the current scope.",
      recommendation: "Mianx.ai insights will surface rule-based summaries when orders and alerts exist.",
      source: "foundation",
    },
  ];
}

export function AiInsightsPanel({ items }: { items: AiInsightItem[] }) {
  return (
    <AdminSurface
      className="bg-gradient-to-br from-white to-[var(--admin-soft)]"
      aria-labelledby="ai-insights-heading"
    >
      <AdminSurfaceHeader
        title="Mianx.ai Operations Insights"
        description="Rule-based summary only. Forecasts and model-driven predictions are out of scope for v1."
      />
      <AdminSurfaceBody>
        <h3 id="ai-insights-heading" className="sr-only">
          Mianx.ai Operations Insights
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--admin-border)] bg-white/90 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.source === "live" ? "Rule-based summary" : "Foundation"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--admin-muted)]">{item.recommendation}</p>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function BranchPerformancePanel({
  rows,
}: {
  rows: NonNullable<AdminOperationsDashboard["branchPerformance"]> | null;
}) {
  return (
    <AdminSurface aria-labelledby="branch-performance-heading">
      <AdminSurfaceHeader
        title="Top performing branches"
        description="Revenue and orders from today’s live scope. Rating arrives with Reviews analytics."
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h3 id="branch-performance-heading" className="sr-only">
          Branch performance
        </h3>
        {!rows || rows.length === 0 ? (
          <p className="py-6 text-sm text-[var(--admin-muted)]">
            Branch ranking appears when All Branches is selected and activity exists.
          </p>
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
                  <td className="py-3 pr-3 font-medium">{row.branchCode ?? row.branchId}</td>
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
  const orderEvents: ActivityItem[] = orders.slice(0, 8).map((order) => ({
    id: `order-${order.id}`,
    title: `Order ${order.orderNumber} · ${order.status}`,
    detail: `${order.branchCode ?? "Branch"} · ${order.orderType} · Rs ${Math.round(order.totalAmount)}`,
    at: order.updatedAt || order.createdAt,
    href: `/admin/orders/${order.id}`,
  }));

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
        title="Live activity"
        description="Newest-first operational timeline from orders and alerts."
      />
      <AdminSurfaceBody>
        <h3 id="live-activity-heading" className="sr-only">
          Live activity
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No activity in the current scope.</p>
        ) : (
          <ol className="space-y-3 border-l border-[var(--admin-border)] pl-4">
            {items.map((item) => (
              <li key={item.id} className="relative text-sm">
                <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]" />
                {item.href ? (
                  <Link href={item.href} className="font-semibold text-[var(--admin-ink)] hover:text-[var(--brand-red)]">
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
        <AdminSurfaceHeader title="Today’s goals" description="Foundation checklist — not tracked tasks." />
        <AdminSurfaceBody>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Foundation</p>
          <ul className="space-y-2 text-sm text-[var(--admin-muted)]">
            <li>Keep pending queue under control</li>
            <li>Clear ready orders waiting for dispatch</li>
            <li>Review critical operational alerts</li>
          </ul>
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface>
        <AdminSurfaceHeader title="Critical alerts" description="Count from deterministic operational alerts." />
        <AdminSurfaceBody>
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]">{alertCount}</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">Open alerts in current branch scope</p>
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
          <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]">—</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Refund / cancel approval workflow is not implemented.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    </aside>
  );
}
