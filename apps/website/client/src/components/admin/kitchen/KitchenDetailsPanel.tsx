import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { KitchenTimeline } from "@/components/admin/kitchen/KitchenTimeline";
import type { AdminOrderDetail } from "@/lib/admin-api";
import {
  formatModifierLines,
  kitchenTicketStatusLabel,
  nextKitchenActions,
} from "@/lib/admin-kitchen";
import type { KitchenTicket } from "@/lib/ops-api";
import { cn } from "@/lib/utils";

export function KitchenDetailsPanel({
  open,
  ticket,
  detail,
  detailLoading,
  detailError,
  busy,
  canAct,
  onClose,
  onRetryDetail,
  onTransition,
}: {
  open: boolean;
  ticket: KitchenTicket | null;
  detail: AdminOrderDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  busy: boolean;
  canAct: boolean;
  onClose: () => void;
  onRetryDetail: () => void;
  onTransition: (toStatus: string) => void;
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

  if (!open || !ticket) return null;

  const actions = canAct ? nextKitchenActions(ticket.status) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close kitchen details"
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
              Kitchen ticket
            </p>
            <h2 id={titleId} className="mt-1 truncate font-mono text-xl font-semibold">
              {detail?.orderNumber ??
                (ticket.sequenceNumber != null ? `#${ticket.sequenceNumber}` : ticket.id.slice(0, 8))}
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
              <p className="text-sm capitalize text-[var(--admin-muted)]">
                {kitchenTicketStatusLabel(ticket.status)}
                {detail?.orderType ? ` · ${detail.orderType}` : ""}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Items</h3>
              <ul className="mt-2 space-y-2">
                {ticket.items.map((item) => {
                  const modifiers = formatModifierLines(item.modifiersSnapshot);
                  return (
                    <li key={item.id} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2 text-sm">
                      <p className="font-semibold">
                        {item.quantity}× {item.itemNameSnapshot}
                      </p>
                      {modifiers.length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--admin-muted)]">{modifiers.join(" · ")}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
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
              <section>
                <h3 className="text-sm font-semibold">Order type & payment</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Method</dt>
                    <dd className="capitalize">{detail.orderType}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Payment</dt>
                    <dd className="capitalize">{detail.paymentStatus}</dd>
                  </div>
                </dl>
              </section>
            ) : !detailLoading && !detailError ? (
              <p className="text-sm text-[var(--admin-muted)]">
                Order enrichment unavailable for this principal — showing ticket data only.
              </p>
            ) : null}

            <KitchenTimeline ticket={ticket} orderHistory={detail?.statusHistory} />

            {actions.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold">Kitchen actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.toStatus}
                      type="button"
                      disabled={busy}
                      className={cn(
                        "min-h-12 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-50",
                      )}
                      onClick={() => onTransition(action.toStatus)}
                    >
                      {busy ? "Updating…" : action.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
