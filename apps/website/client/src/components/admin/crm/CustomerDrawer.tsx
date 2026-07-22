import { useEffect, useId, useRef } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

import { CustomerHistory } from "@/components/admin/crm/CustomerHistory";
import {
  CustomerLoyalty,
  CustomerTagsFoundation,
  MarketingPreferences,
} from "@/components/admin/crm/CustomerLoyalty";
import { daysSince, type CrmCustomer } from "@/lib/admin-crm";
import { formatOrderDateTime, formatPkr } from "@/lib/admin-order-format";
import type { AdminOrderDetail } from "@/lib/admin-api";

export function CustomerDrawer({
  open,
  customer,
  detail,
  detailLoading,
  detailError,
  branchLabelById,
  onClose,
  onRetryDetail,
  onCreatePos,
}: {
  open: boolean;
  customer: CrmCustomer | null;
  detail: AdminOrderDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  branchLabelById: Record<string, string>;
  onClose: () => void;
  onRetryDetail: () => void;
  onCreatePos: () => void;
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

  if (!open || !customer) return null;

  const inactive = daysSince(customer.lastOrderAt) > 30;
  const address = detail?.deliveryAddress ?? detail?.delivery?.deliveryAddress ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close customer profile"
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
              Customer profile
            </p>
            <h2 id={titleId} className="mt-1 truncate text-xl font-semibold">
              {customer.displayName}
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
              <h3 className="text-sm font-semibold">Contact</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Phone</dt>
                  <dd className="tabular-nums">{customer.phone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Email</dt>
                  <dd className="text-[var(--admin-muted)]">Foundation</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Customer ID</dt>
                  <dd className="font-mono text-xs">{customer.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">First seen</dt>
                  <dd>{formatOrderDateTime(customer.firstOrderAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Last order</dt>
                  <dd>{formatOrderDateTime(customer.lastOrderAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Lifetime spend</dt>
                  <dd className="tabular-nums font-semibold">{formatPkr(customer.lifetimeSpend)}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Addresses</h3>
              {detailLoading ? (
                <div className="mt-2 h-16 animate-pulse rounded-xl bg-[var(--admin-soft)]" aria-busy="true" />
              ) : address ? (
                <p className="mt-2 rounded-xl bg-[var(--admin-soft)] px-3 py-2 text-sm">{address}</p>
              ) : (
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  No delivery address on the latest order detail. Saved Home/Office addresses · Foundation
                  (admin cannot read `/me/addresses` for other users).
                </p>
              )}
              {detailError ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  <p>{detailError}</p>
                  <button type="button" className="mt-1 font-semibold underline" onClick={onRetryDetail}>
                    Retry detail
                  </button>
                </div>
              ) : null}
            </section>

            <section>
              <h3 className="text-sm font-semibold">Favourite products</h3>
              <p className="mt-2 text-sm text-[var(--admin-muted)]">
                Favourites API is customer-owned (`/me/favorites`) · Foundation for CRM.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="mt-2 text-sm text-[var(--admin-muted)]">
                Staff CRM notes are Foundation — no notes store on order contacts yet.
                {detail?.notes ? (
                  <>
                    {" "}
                    Latest order note: <span className="text-[var(--admin-ink)]">{detail.notes}</span>
                  </>
                ) : null}
              </p>
            </section>

            <CustomerTagsFoundation repeat={customer.orderCount >= 2} inactive={inactive} />
            <CustomerHistory orders={customer.orders} branchLabelById={branchLabelById} />
            <CustomerLoyalty />
            <MarketingPreferences />

            <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
              <Link
                href={`/admin/loyalty?selected=${encodeURIComponent(customer.id)}`}
                className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
              >
                Open loyalty view
              </Link>
              <button
                type="button"
                disabled
                className="min-h-11 cursor-not-allowed rounded-xl border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]"
              >
                Edit · Foundation
              </button>
              <Link
                href={`/admin/orders?orderNumber=${encodeURIComponent(customer.lastOrderNumber)}`}
                className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
              >
                View orders
              </Link>
              <button
                type="button"
                onClick={onCreatePos}
                className="min-h-11 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
              >
                Create POS order
              </button>
              <span className="min-h-11 rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-muted)]">
                Send WhatsApp · Foundation
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
