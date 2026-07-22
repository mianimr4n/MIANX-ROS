import { Link } from "wouter";

import type { AdminOrderListItem } from "@/lib/admin-api";
import { formatOrderTime, formatPkr, orderStatusLabel } from "@/lib/admin-order-format";

export function CustomerHistory({
  orders,
  branchLabelById,
}: {
  orders: AdminOrderListItem[];
  branchLabelById: Record<string, string>;
}) {
  return (
    <section aria-labelledby="crm-order-history-heading">
      <h3 id="crm-order-history-heading" className="text-sm font-semibold">
        Order history
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">Real orders from the loaded admin window only.</p>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">No orders in this window.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {orders.slice(0, 12).map((order) => (
            <li key={order.id} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono font-semibold text-[var(--brand-red)]"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {formatOrderTime(order.createdAt)} · {order.orderSource} · {order.orderType} ·{" "}
                    {branchLabelById[order.branchId] ?? order.branchCode ?? "—"}
                  </p>
                  <p className="mt-1 text-xs capitalize">
                    {orderStatusLabel(order.status)} · {order.paymentStatus} · {order.itemCount} items
                  </p>
                </div>
                <p className="tabular-nums font-semibold">{formatPkr(order.totalAmount)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
