import type { AdminOrderListItem } from "@/lib/admin-api";
import { formatOrderTime, formatPkr, orderStatusLabel } from "@/lib/admin-order-format";

export function WhatsAppOrderQueue({
  orders,
  loading,
  error,
  selectedId,
  onSelect,
  onRetry,
  branchLabelById,
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
  onSelect: (order: AdminOrderListItem) => void;
  onRetry: () => void;
  branchLabelById: Record<string, string>;
  pageStart: number;
  pageEnd: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section aria-label="WhatsApp-attributed orders" className="flex h-full min-h-[24rem] flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]">
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">WhatsApp-attributed orders</h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">Order queue — not a conversation inbox.</p>
      </div>

      {error ? (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-2" aria-busy={loading}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
            ))}
          </div>
        ) : null}

        {!loading && orders.length === 0 && !error ? (
          <p className="p-4 text-center text-sm text-[var(--admin-muted)]">
            No WhatsApp-attributed orders in the loaded window.
          </p>
        ) : null}

        {!loading && orders.length > 0 ? (
          <ul className="space-y-2" role="listbox" aria-label="WhatsApp order queue">
            {orders.map((order) => {
              const selected = selectedId === order.id;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${
                      selected
                        ? "border-[var(--brand-red)] bg-[var(--admin-soft)]"
                        : "border-[var(--admin-border)] bg-white hover:bg-[var(--admin-soft)]/60"
                    }`}
                    onClick={() => onSelect(order)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-semibold">{order.orderNumber}</p>
                        <p className="mt-1 truncate">{order.contactName || "Guest"}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-[var(--admin-muted)]">{order.contactPhone || "—"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular-nums font-semibold">{formatPkr(order.totalAmount)}</p>
                        <p className="mt-1 text-xs capitalize">{orderStatusLabel(order.status)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[var(--admin-muted)]">
                      {formatOrderTime(order.createdAt)} · {order.orderType} ·{" "}
                      {branchLabelById[order.branchId] ?? order.branchCode ?? "—"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-[var(--admin-border)] px-3 py-2 text-xs text-[var(--admin-muted)]">
        <div className="flex items-center justify-between gap-2">
          <span>
            {pageStart}–{pageEnd} of {total}
          </span>
          <div className="flex gap-1">
            <button type="button" disabled={!canPrev} className="rounded px-2 py-1 font-semibold disabled:opacity-40" onClick={onPrev}>
              Prev
            </button>
            <button type="button" disabled={!canNext} className="rounded px-2 py-1 font-semibold disabled:opacity-40" onClick={onNext}>
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
