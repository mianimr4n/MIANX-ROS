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

export function RecentOrdersPanel({ orders }: { orders: AdminOrderListItem[] }) {
  return (
    <AdminSurface aria-labelledby="recent-orders-heading">
      <AdminSurfaceHeader
        title="Recent orders"
        description="Newest orders in the current branch and filter scope."
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
        {orders.length === 0 ? (
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
                    <Link href={`/admin/orders/${order.id}`} className="font-mono font-semibold text-[var(--brand-red)]">
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

export function KitchenStatusPanel({
  counts,
  failed = false,
}: {
  /** Null when ops data failed/unavailable — never invent zeros. */
  counts: Record<string, number> | null;
  failed?: boolean;
}) {
  const rows = [
    { key: "preparing", label: "Preparing", tone: "bg-amber-50 text-amber-950" },
    { key: "ready", label: "Ready", tone: "bg-emerald-50 text-emerald-900" },
    { key: "confirmed", label: "Confirmed", tone: "bg-sky-50 text-sky-950" },
    { key: "pending", label: "Pending", tone: "bg-orange-50 text-orange-950" },
  ];

  if (failed || counts == null) {
    return (
      <AdminSurface aria-labelledby="kitchen-status-heading">
        <AdminSurfaceHeader
          title="Kitchen status"
          description="Derived from current order statuses. Not a live KDS feed."
        />
        <AdminSurfaceBody>
          <h3 id="kitchen-status-heading" className="sr-only">
            Kitchen status
          </h3>
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="status">
            ERROR — kitchen status unavailable. Counts are not shown as zero.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    );
  }

  return (
    <AdminSurface aria-labelledby="kitchen-status-heading">
      <AdminSurfaceHeader
        title="Kitchen status"
        description="Derived from current order statuses. Not a live KDS feed."
      />
      <AdminSurfaceBody>
        <h3 id="kitchen-status-heading" className="sr-only">
          Kitchen status
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm ${row.tone}`}>
              <span className="font-medium">{row.label}</span>
              <span className="text-lg font-semibold tabular-nums">{counts[row.key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function DeliveryStatusPanel({
  activeDeliveries,
  readyCount,
  completedCount,
  failed = false,
}: {
  activeDeliveries: number | null;
  readyCount: number | null;
  completedCount: number | null;
  failed?: boolean;
}) {
  const unavailable = failed || activeDeliveries == null || readyCount == null || completedCount == null;

  if (unavailable) {
    return (
      <AdminSurface aria-labelledby="delivery-status-heading">
        <AdminSurfaceHeader
          title="Delivery status"
          description="Derived from current order statuses. No GPS or ETA prediction."
        />
        <AdminSurfaceBody>
          <h3 id="delivery-status-heading" className="sr-only">
            Delivery status
          </h3>
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="status">
            ERROR — delivery status unavailable. Counts are not shown as zero.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    );
  }

  const rows = [
    {
      label: "Dispatched",
      value: activeDeliveries,
      tone: "bg-sky-50 text-sky-950",
      note: "From order status dispatched",
    },
    {
      label: "Ready (awaiting dispatch)",
      value: readyCount,
      tone: "bg-amber-50 text-amber-950",
      note: "Derived — not rider assignment",
    },
    {
      label: "Completed",
      value: completedCount,
      tone: "bg-emerald-50 text-emerald-900",
      note: "Delivered / collected / closed",
    },
    {
      label: "Late deliveries",
      value: "—",
      tone: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
      note: "Unavailable — no ETA tracking yet",
    },
  ];

  return (
    <AdminSurface aria-labelledby="delivery-status-heading">
      <AdminSurfaceHeader
        title="Delivery status"
        description="Derived from current order statuses. No GPS or ETA prediction."
      />
      <AdminSurfaceBody>
        <h3 id="delivery-status-heading" className="sr-only">
          Delivery status
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.label} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm ${row.tone}`}>
              <span className="font-medium">
                {row.label}
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">{row.note}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
