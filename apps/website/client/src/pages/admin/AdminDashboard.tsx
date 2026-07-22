import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminOrdersApi } from "@/lib/admin-access";
import {
  fetchAdminOperationsDashboard,
  type AdminOperationsDashboard,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

const STATUS_LABELS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "dispatched", label: "Dispatched" },
  { key: "completed", label: "Completed / collected" },
  { key: "cancelled", label: "Cancelled" },
];

function formatPkr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatTime(iso: string) {
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

export default function AdminDashboard() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter } = useAdminBranch();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<AdminOperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });

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
    if (!allowed) {
      setLocation("/admin/unauthorized");
      return;
    }
    void load();
  }, [allowed, load, setLocation]);

  return (
    <AdminShell title="Operations overview">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--admin-muted)]">
            Pakistan business day · Asia/Karachi
            {data ? ` · updated ${formatTime(data.generatedAt)}` : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
          >
            Refresh
          </button>
          <Link
            href="/admin/orders"
            className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
          >
            Open orders
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading KPIs">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {data && !loading && data.kpis.todayOrders === 0 && data.kpis.activeOrders === 0 ? (
        <div className="mb-6 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3 text-sm text-[var(--admin-muted)]">
          No orders in the current branch scope for today or in active status.
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key performance indicators">
            {[
              { label: "Today’s orders", value: String(data.kpis.todayOrders) },
              { label: "Today’s gross sales", value: formatPkr(data.kpis.todayGrossSales) },
              { label: "Active orders", value: String(data.kpis.activeOrders) },
              {
                label: "Average order value",
                value: data.kpis.averageOrderValue == null ? "Not available yet" : formatPkr(data.kpis.averageOrderValue),
              },
              { label: "Kitchen waiting", value: String(data.kpis.kitchenWaiting) },
              { label: "Active deliveries", value: String(data.kpis.activeDeliveries) },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-[0_8px_30px_rgba(31,31,31,0.04)]"
              >
                <p className="text-sm text-[var(--admin-muted)]">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
              </article>
            ))}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Order status overview</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Counts from today’s orders plus currently active orders in scope.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {STATUS_LABELS.map((status) => (
                  <li
                    key={status.key}
                    className="flex items-center justify-between rounded-lg bg-[var(--admin-soft)] px-3 py-2 text-sm"
                  >
                    <span>{status.label}</span>
                    <span className="font-semibold tabular-nums">{data.statusCounts[status.key] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Order source breakdown</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">Within the dashboard data window.</p>
              {data.sourceBreakdown.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--admin-muted)]">No source data yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.sourceBreakdown.map((row) => (
                    <li key={row.source} className="flex justify-between text-sm">
                      <span className="capitalize">{row.source}</span>
                      <span className="font-semibold tabular-nums">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Recent orders</h2>
              <Link href="/admin/orders" className="text-sm font-semibold text-[var(--brand-red)]">
                View all
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--admin-muted)]">No recent orders in scope.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Order</th>
                      <th className="py-2 pr-3 font-medium">Time</th>
                      <th className="py-2 pr-3 font-medium">Branch</th>
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Customer</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Total</th>
                      <th className="py-2 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-[var(--admin-border)]/70">
                        <td className="py-2.5 pr-3 font-mono font-semibold">{order.orderNumber}</td>
                        <td className="py-2.5 pr-3">{formatTime(order.createdAt)}</td>
                        <td className="py-2.5 pr-3">{order.branchCode ?? "—"}</td>
                        <td className="py-2.5 pr-3 capitalize">{order.orderSource}</td>
                        <td className="py-2.5 pr-3 capitalize">{order.orderType}</td>
                        <td className="py-2.5 pr-3">{order.contactName || "—"}</td>
                        <td className="py-2.5 pr-3 capitalize">{order.status}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{formatPkr(order.totalAmount)}</td>
                        <td className="py-2.5">
                          <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[var(--brand-red)]">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.branchPerformance ? (
            <section className="mt-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Branch performance</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">Shown for All Branches scope.</p>
              {data.branchPerformance.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--admin-muted)]">No branch activity in window.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Branch</th>
                        <th className="py-2 pr-3 font-medium">Today orders</th>
                        <th className="py-2 pr-3 font-medium">Gross sales</th>
                        <th className="py-2 font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branchPerformance.map((row) => (
                        <tr key={row.branchId} className="border-b border-[var(--admin-border)]/70">
                          <td className="py-2.5 pr-3">{row.branchCode ?? row.branchId}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{row.todayOrders}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{formatPkr(row.todayGrossSales)}</td>
                          <td className="py-2.5 tabular-nums">{row.activeOrders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Operational alerts</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Deterministic rules only — not AI predictions.
              </p>
              {data.alerts.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--admin-muted)]">No operational alerts right now.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        alert.severity === "critical"
                          ? "bg-red-50 text-red-900"
                          : alert.severity === "warning"
                            ? "bg-amber-50 text-amber-950"
                            : "bg-[var(--admin-soft)]"
                      }`}
                    >
                      <p>{alert.message}</p>
                      {alert.orderId ? (
                        <Link
                          href={`/admin/orders/${alert.orderId}`}
                          className="mt-1 inline-block text-xs font-semibold text-[var(--brand-red)]"
                        >
                          Open order
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white to-[var(--admin-soft)] p-5 shadow-[0_12px_40px_rgba(31,31,31,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
                Mianx Operations Insight
              </p>
              <h2 className="mt-1 text-base font-semibold">Deterministic summary</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Based on current dashboard data. No LLM calls. No autonomous claims.
              </p>
              <ul className="mt-4 space-y-2">
                {data.insights.map((insight) => (
                  <li key={insight} className="rounded-lg bg-white/80 px-3 py-2 text-sm">
                    {insight}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
