import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { DeliveryTimeline } from "@/components/admin/delivery/DeliveryTimeline";
import type { AdminOrderDetail } from "@/lib/admin-api";
import { deliveryStatusBadgeClass, deliveryStatusLabel } from "@/lib/admin-delivery";
import { formatOrderDateTime, formatPkr } from "@/lib/admin-order-format";
import type { DeliveryAssignment } from "@/lib/ops-api";
import { cn } from "@/lib/utils";

export function DeliveryDrawer({
  open,
  assignment,
  detail,
  detailLoading,
  detailError,
  busy,
  canUpdate,
  onClose,
  onRetryDetail,
  onPickedUp,
  onDelivered,
}: {
  open: boolean;
  assignment: DeliveryAssignment | null;
  detail: AdminOrderDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  busy: boolean;
  canUpdate: boolean;
  onClose: () => void;
  onRetryDetail: () => void;
  onPickedUp: () => void;
  onDelivered: () => void;
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

  if (!open || !assignment) return null;

  const kitchenReadyAt =
    detail?.statusHistory.find((entry) => entry.toStatus === "ready")?.createdAt ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close delivery details"
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
              Delivery details
            </p>
            <h2 id={titleId} className="mt-1 truncate font-mono text-xl font-semibold">
              {assignment.orderNumber}
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
          <div className="space-y-6">
            <section>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  deliveryStatusBadgeClass(assignment.status),
                )}
              >
                {deliveryStatusLabel(assignment.status)}
              </span>
              <p className="mt-2 text-sm text-[var(--admin-muted)]">
                Rider: {assignment.riderName ?? "Unassigned"} · Order {assignment.orderStatus}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Customer</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Name</dt>
                  <dd>{assignment.contactName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Phone</dt>
                  <dd>{assignment.contactPhone || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Address</dt>
                  <dd className="text-right">{assignment.deliveryAddress || "—"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Dispatch timestamps</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Kitchen ready</dt>
                  <dd>{kitchenReadyAt ? formatOrderDateTime(kitchenReadyAt) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Dispatch / assign</dt>
                  <dd>{assignment.assignedAt ? formatOrderDateTime(assignment.assignedAt) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Picked up</dt>
                  <dd>{assignment.pickedUpAt ? formatOrderDateTime(assignment.pickedUpAt) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Delivered</dt>
                  <dd>{assignment.deliveredAt ? formatOrderDateTime(assignment.deliveredAt) : "—"}</dd>
                </div>
              </dl>
            </section>

            {detailLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[var(--admin-soft)]" aria-busy="true" />
            ) : null}

            {detailError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                <p>{detailError}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={onRetryDetail}>
                  Retry order detail
                </button>
              </div>
            ) : null}

            {detail ? (
              <>
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
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="text-sm font-semibold">Payment</h3>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--admin-muted)]">Status</dt>
                      <dd className="capitalize">{detail.paymentStatus}</dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{formatPkr(detail.totalAmount)}</dd>
                    </div>
                  </dl>
                </section>
                {detail.notes ? (
                  <section>
                    <h3 className="text-sm font-semibold">Notes</h3>
                    <p className="mt-2 text-sm">{detail.notes}</p>
                  </section>
                ) : null}
              </>
            ) : !detailLoading && !detailError ? (
              <p className="text-sm text-[var(--admin-muted)]">
                Order line enrichment unavailable — showing delivery assignment fields only.
              </p>
            ) : null}

            <DeliveryTimeline
              assignment={assignment}
              orderHistory={detail?.statusHistory}
              kitchenReadyAt={kitchenReadyAt}
            />

            <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
              {canUpdate && assignment.status === "assigned" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onPickedUp}
                  className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Mark picked up
                </button>
              ) : null}
              {canUpdate && assignment.status === "picked-up" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelivered}
                  className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Mark delivered
                </button>
              ) : null}
              <span className="min-h-11 rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-muted)]">
                Mark failed · Foundation
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
