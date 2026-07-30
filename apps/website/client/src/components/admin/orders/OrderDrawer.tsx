import { useEffect, useId, useRef } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

import { OrderTimeline } from "@/components/admin/orders/OrderTimeline";
import type { AdminOrderDetail, AdminOrderTransitionAction } from "@/lib/admin-api";
import {
  deliveryStatusLabel,
  formatOrderDateTime,
  formatPkr,
  kitchenStatusLabel,
  orderStatusLabel,
  statusBadgeClass,
} from "@/lib/admin-order-format";
import { cn } from "@/lib/utils";

const ACTIONS: Array<{
  action: AdminOrderTransitionAction;
  label: string;
  from: string[];
  needsReason?: boolean;
}> = [
  { action: "confirm", label: "Accept", from: ["pending"] },
  { action: "preparing", label: "Start preparing", from: ["confirmed"] },
  { action: "ready", label: "Mark ready", from: ["preparing"] },
  { action: "dispatch", label: "Dispatch", from: ["ready"] },
  { action: "complete", label: "Complete", from: ["ready", "dispatched"] },
  { action: "cancel", label: "Cancel", from: ["pending", "confirmed", "preparing", "ready"], needsReason: true },
];

export function OrderDrawer({
  open,
  detail,
  loading,
  error,
  busy,
  canTransition,
  onClose,
  onRetry,
  onTransition,
}: {
  open: boolean;
  detail: AdminOrderDetail | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  canTransition: boolean;
  onClose: () => void;
  onRetry: () => void;
  onTransition: (action: AdminOrderTransitionAction, needsReason?: boolean) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const availableActions = detail
    ? ACTIONS.filter((item) => item.from.includes(detail.status))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close order details"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">
              Order details
            </p>
            <h2 id={titleId} className="mt-1 truncate font-mono text-xl font-semibold">
              {detail?.orderNumber ?? (loading ? "Loading…" : "Order")}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="rounded-md p-2 hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
            aria-label="Close drawer"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-24 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
              <div className="h-40 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              <p>{error}</p>
              <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
                Retry
              </button>
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-6">
              <section>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusBadgeClass(detail.status))}>
                    {orderStatusLabel(detail.status)}
                  </span>
                  <span className="text-sm text-[var(--admin-muted)] capitalize">
                    {detail.orderType} · {detail.orderSource}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  {detail.branchCode ?? detail.branchId} · Created {formatOrderDateTime(detail.createdAt)}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Customer</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Name</dt>
                    <dd>{detail.contactName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Phone</dt>
                    <dd>{detail.contactPhone || "—"}</dd>
                  </div>
                  {detail.deliveryAddress ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--admin-muted)]">Address</dt>
                      <dd className="text-right">{detail.deliveryAddress}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Items</h3>
                <ul className="mt-2 space-y-2">
                  {detail.items.map((item, index) => (
                    <li key={`${item.productName}-${index}`} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span>
                          {item.quantity}× {item.productName}
                          {item.variantName ? ` · ${item.variantName}` : ""}
                        </span>
                        <span className="tabular-nums font-semibold">{formatPkr(item.totalPrice)}</span>
                      </div>
                      {item.extras.length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--admin-muted)]">
                          {item.extras.map((extra) => extra.label).join(", ")}
                        </p>
                      ) : null}
                      {item.instructions ? (
                        <p className="mt-1 text-xs text-[var(--admin-muted)]">Note: {item.instructions}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Pricing & payment</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Subtotal</dt>
                    <dd className="tabular-nums">{formatPkr(detail.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Discount</dt>
                    <dd className="tabular-nums">{formatPkr(detail.discountAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Tax</dt>
                    <dd className="tabular-nums">{formatPkr(detail.taxAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Delivery fee</dt>
                    <dd className="tabular-nums">{formatPkr(detail.deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[var(--admin-border)] pt-2 font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatPkr(detail.totalAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Payment</dt>
                    <dd className="capitalize">{detail.paymentStatus}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Kitchen & delivery progress</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Kitchen</dt>
                    <dd>{kitchenStatusLabel(detail.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Delivery</dt>
                    <dd>{deliveryStatusLabel(detail.status, detail.orderType)}</dd>
                  </div>
                  {detail.delivery ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--admin-muted)]">Delivery record</dt>
                      <dd className="capitalize">{detail.delivery.status}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-2 text-xs text-[var(--admin-muted)]">
                  Derived from order status unless a delivery row exists. No GPS/ETA.
                </p>
              </section>

              {detail.notes ? (
                <section>
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <p className="mt-2 text-sm">{detail.notes}</p>
                </section>
              ) : null}

              <OrderTimeline history={detail.statusHistory} />

              <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
                  onClick={() => window.print()}
                >
                  Print
                </button>
                <Link
                  href={`/admin/orders/${detail.id}`}
                  className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
                >
                  Open full page
                </Link>
                <span
                  className="rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)]"
                  title="Rider assign arrives with Delivery module"
                >
                  Assign · Planned for Phase 2
                </span>
              </div>

              {canTransition && availableActions.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold">Status actions</h3>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Backend-supported transitions only (`order.manage`).
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableActions.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        disabled={busy}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50",
                          item.action === "cancel"
                            ? "border border-red-200 bg-red-50 text-red-900"
                            : "bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-dark)]",
                        )}
                        onClick={() => onTransition(item.action, item.needsReason)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
