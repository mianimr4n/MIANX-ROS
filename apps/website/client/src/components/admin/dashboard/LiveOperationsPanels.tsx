import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { RecentOrdersList } from "@/components/admin/dashboard/RecentOrdersList";
import type { AdminOrderListItem } from "@/lib/admin-api";

export function RecentOrdersPanel({
  orders,
  unavailable = false,
}: {
  orders: AdminOrderListItem[] | null;
  unavailable?: boolean;
}) {
  return (
    <RecentOrdersList
      orders={orders}
      unavailable={unavailable}
      sourceLabel="Source: Orders API"
    />
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
    { key: "preparing", label: "Preparing (orders)", tone: "bg-amber-50 text-amber-950" },
    { key: "ready", label: "Ready (orders)", tone: "bg-emerald-50 text-emerald-900" },
    { key: "confirmed", label: "Confirmed (orders)", tone: "bg-sky-50 text-sky-950" },
    { key: "pending", label: "Pending confirmation (orders)", tone: "bg-orange-50 text-orange-950" },
  ];

  if (failed || counts == null) {
    return (
      <AdminSurface aria-labelledby="kitchen-status-heading">
        <AdminSurfaceHeader
          title="Kitchen status (order-derived)"
          description="Order-derived counts from order.status — not kitchen_tickets / KDS live feed."
        />
        <AdminSurfaceBody>
          <h3 id="kitchen-status-heading" className="sr-only">
            Kitchen status order-derived
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
        title="Kitchen status (order-derived)"
        description="Order-derived counts from order.status — not kitchen_tickets / KDS live feed."
      />
      <AdminSurfaceBody>
        <h3 id="kitchen-status-heading" className="sr-only">
          Kitchen status order-derived
        </h3>
        <p className="mb-3 rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-xs text-[var(--admin-muted)]">
          Pending confirmation is a customer order waiting for staff — not a kitchen ticket.
        </p>
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
      tone: "bg-[var(--admin-soft)] text-[var(--admin-ink)]",
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
                <span className="mt-0.5 block text-[11px] font-normal text-[var(--admin-ink)]/80">{row.note}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
