import { AdminDataState, AdminErrorState } from "@/components/admin/AdminDataState";
import type { AdminOrderListItem } from "@/lib/admin-api";
import {
  deliveryStatusLabel,
  formatOrderTime,
  formatPkr,
  kitchenStatusLabel,
  orderStatusLabel,
  statusBadgeClass,
} from "@/lib/admin-order-format";
import { cn } from "@/lib/utils";

export type OrderSortKey = "createdAt" | "totalAmount" | "orderNumber" | "status";

export function OrderGrid({
  orders,
  loading,
  error,
  selectedId,
  sortKey,
  sortDir,
  onSort,
  onRetry,
  onView,
  onOpenFullPage,
  pageStart,
  pageEnd,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  orders: AdminOrderListItem[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  sortKey: OrderSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: OrderSortKey) => void;
  onRetry: () => void;
  onView: (orderId: string) => void;
  onOpenFullPage: (orderId: string) => void;
  pageStart: number;
  pageEnd: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  function sortIndicator(key: OrderSortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <section aria-label="Orders data grid" className="mb-6">
      {error ? (
        <AdminErrorState
          className="mb-4"
          title="Orders could not be loaded"
          description="Retry when ready. Technical details stay hidden from this panel."
          action={
            <button type="button" className="text-sm font-semibold underline" onClick={onRetry}>
              Retry
            </button>
          }
        />
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {!loading && orders.length === 0 && !error ? (
        <AdminDataState
          state="FILTERED_EMPTY"
          title="No matching orders"
          description="No orders match the current filters for this branch scope."
          compact
        />
      ) : null}

      {!loading && orders.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]">
            <table className="min-w-[72rem] w-full text-left text-sm" aria-label="Orders for current filters">
              <caption className="sr-only">
                Orders for the current branch scope and filters. Sortable columns expose sort direction in the header
                label.
              </caption>
              <thead className="sticky top-0 z-10 border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("orderNumber")}>
                      Order #{sortIndicator("orderNumber")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Channel</th>
                  <th className="px-3 py-3 font-medium">Order type</th>
                  <th className="px-3 py-3 font-medium">Branch</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("totalAmount")}>
                      Amount{sortIndicator("totalAmount")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Payment</th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("status")}>
                      Status{sortIndicator("status")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Kitchen</th>
                  <th className="px-3 py-3 font-medium">Delivery</th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("createdAt")}>
                      Created{sortIndicator("createdAt")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const selected = selectedId === order.id;
                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        "border-b border-[var(--admin-border)]/70",
                        selected ? "bg-[var(--admin-soft)]" : "hover:bg-[var(--admin-soft)]/60",
                      )}
                    >
                      <td className="px-3 py-3 font-mono font-semibold">{order.orderNumber}</td>
                      <td className="px-3 py-3">
                        <div>{order.contactName || "—"}</div>
                        <div className="text-xs text-[var(--admin-muted)]">{order.contactPhone || ""}</div>
                      </td>
                      <td className="px-3 py-3 capitalize">{order.orderSource}</td>
                      <td className="px-3 py-3 capitalize">{order.orderType}</td>
                      <td className="px-3 py-3">{order.branchCode ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums">{order.itemCount}</td>
                      <td className="px-3 py-3 tabular-nums">{formatPkr(order.totalAmount)}</td>
                      <td className="px-3 py-3 capitalize">{order.paymentStatus}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            statusBadgeClass(order.status),
                          )}
                          aria-label={`Order status ${orderStatusLabel(order.status)}`}
                        >
                          {orderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span aria-label={`Kitchen status ${kitchenStatusLabel(order.status)}`}>
                          {kitchenStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span
                          aria-label={`Delivery status ${deliveryStatusLabel(order.status, order.orderType)}`}
                        >
                          {deliveryStatusLabel(order.status, order.orderType)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--admin-muted)]">{formatOrderTime(order.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                            onClick={() => onView(order.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                            onClick={() => onOpenFullPage(order.id)}
                          >
                            Full page
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">
            Sorting applies to the current page only. Column resizing is not available in this table.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-[var(--admin-muted)]">
              Showing {pageStart}–{pageEnd} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={onPrev}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canNext}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={onNext}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
