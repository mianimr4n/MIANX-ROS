import { Link } from "wouter";

import type { AdminOrderDetail } from "@/lib/admin-api";
import {
  formatOrderDateTime,
  formatPkr,
  orderStatusLabel,
  statusBadgeClass,
} from "@/lib/admin-order-format";
import { cn } from "@/lib/utils";

export function LinkedOrderPanel({
  detail,
  loading,
  error,
  onRetry,
  branchLabelById,
}: {
  detail: AdminOrderDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  branchLabelById: Record<string, string>;
}) {
  return (
    <section aria-labelledby="linked-order-heading" className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <h2 id="linked-order-heading" className="text-sm font-semibold">
        Linked order
      </h2>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">Real order data from admin orders API.</p>

      {loading ? (
        <div className="mt-3 h-32 animate-pulse rounded-xl bg-[var(--admin-soft)]" aria-busy="true" />
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && !detail ? (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">Select an order from the queue.</p>
      ) : null}

      {detail ? (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-lg font-semibold">{detail.orderNumber}</p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {formatOrderDateTime(detail.createdAt)} · {detail.orderType} · {detail.orderSource}
              </p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", statusBadgeClass(detail.status))}>
              {orderStatusLabel(detail.status)}
            </span>
          </div>

          <dl className="grid gap-1">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Branch</dt>
              <dd>{branchLabelById[detail.branchId] ?? detail.branchCode ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Payment</dt>
              <dd className="capitalize">{detail.paymentStatus}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Total</dt>
              <dd className="tabular-nums font-semibold">{formatPkr(detail.totalAmount)}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Items</p>
            <ul className="mt-2 space-y-1">
              {detail.items.slice(0, 8).map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex justify-between gap-2">
                  <span>
                    {item.quantity}× {item.productName}
                    {item.variantName ? ` (${item.variantName})` : ""}
                  </span>
                  <span className="tabular-nums">{formatPkr(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
          </div>

          {detail.delivery ? (
            <p className="text-xs text-[var(--admin-muted)]">
              Delivery: {detail.delivery.status}
              {detail.delivery.deliveryAddress ? ` · ${detail.delivery.deliveryAddress}` : ""}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={`/admin/orders/${detail.id}`}
              className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
            >
              Open full order
            </Link>
            <Link
              href="/admin/kitchen"
              className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
            >
              View kitchen
            </Link>
            <Link
              href="/admin/delivery"
              className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
            >
              View delivery
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
