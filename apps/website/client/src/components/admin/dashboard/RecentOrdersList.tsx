import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { AdminOrderListItem } from "@/lib/admin-api";

function formatPkr(value: number) {
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

export type RecentOrdersListProps = {
  orders: AdminOrderListItem[] | null;
  loading?: boolean;
  unavailable?: boolean;
  errorMessage?: string | null;
  sourceLabel?: string;
  lastUpdated?: string | null;
};

/**
 * LIVE recent orders list from Orders API (or operations dashboard recentOrders).
 * Never invents empty rows as success zeros when the source failed.
 */
export function RecentOrdersList({
  orders,
  loading = false,
  unavailable = false,
  errorMessage = null,
  sourceLabel = "Source: Orders API",
  lastUpdated = null,
}: RecentOrdersListProps) {
  return (
    <AdminSurface aria-labelledby="recent-orders-heading">
      <AdminSurfaceHeader
        title="Recent orders"
        description={`${sourceLabel}${lastUpdated ? ` · Updated ${lastUpdated}` : ""}`}
        action={
          <Link href="/admin/orders" className="text-sm font-semibold text-[var(--brand-red)]">
            View all
          </Link>
        }
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h3 id="recent-orders-heading" className="sr-only">
          Recent orders
        </h3>
        {unavailable ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="status">
            Data Unavailable{errorMessage ? ` — ${errorMessage}` : ""}. Order rows are not shown as zero.
          </p>
        ) : loading && orders == null ? (
          <p className="py-6 text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading recent orders…
          </p>
        ) : !orders || orders.length === 0 ? (
          <p className="py-6 text-sm text-[var(--admin-muted)]">No orders match the current filters.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--admin-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="py-3 pr-3 font-medium">Order</th>
                <th className="py-3 pr-3 font-medium">Status</th>
                <th className="py-3 pr-3 font-medium">Amount</th>
                <th className="py-3 pr-3 font-medium">Branch</th>
                <th className="py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id} className="border-b border-[var(--admin-border)]/70">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-semibold text-[var(--brand-red)]"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 capitalize">{order.status}</td>
                  <td className="py-3 pr-3 tabular-nums">{formatPkr(order.totalAmount)}</td>
                  <td className="py-3 pr-3">{order.branchCode ?? "—"}</td>
                  <td className="py-3 text-[var(--admin-muted)]">{formatTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
