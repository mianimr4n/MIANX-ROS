import { useEffect, useId, useRef } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

import { CustomerHistory } from "@/components/admin/crm/CustomerHistory";
import { daysSince, type CrmCustomer } from "@/lib/admin-crm";
import { classificationLabel, classifyCustomer } from "@/lib/admin-loyalty";
import { formatOrderDateTime, formatPkr } from "@/lib/admin-order-format";
import type { AdminOrderDetail } from "@/lib/admin-api";

export function LoyaltyCustomerDrawer({
  open,
  customer,
  detail,
  detailLoading,
  detailError,
  branchLabelById,
  onClose,
  onRetryDetail,
  returnFocusRef,
}: {
  open: boolean;
  customer: CrmCustomer | null;
  detail: AdminOrderDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  branchLabelById: Record<string, string>;
  onClose: () => void;
  onRetryDetail: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
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

  useEffect(() => {
    if (open) return;
    returnFocusRef.current?.focus();
  }, [open, returnFocusRef]);

  if (!open || !customer) return null;

  const tags = classifyCustomer(customer);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close loyalty customer profile"
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
              Order-derived customer profile
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
              <h3 className="text-sm font-semibold">Customer summary</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Phone</dt>
                  <dd className="tabular-nums">{customer.phone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Branch</dt>
                  <dd>
                    {customer.primaryBranchId
                      ? branchLabelById[customer.primaryBranchId] ?? customer.primaryBranchId.slice(0, 8)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Orders</dt>
                  <dd>{customer.orderCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Last order</dt>
                  <dd>{formatOrderDateTime(customer.lastOrderAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Lifetime spend</dt>
                  <dd className="tabular-nums font-semibold">{formatPkr(customer.lifetimeSpend)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Average order value</dt>
                  <dd className="tabular-nums">{formatPkr(customer.averageSpend)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="loyalty-account-heading">
              <h3 id="loyalty-account-heading" className="text-sm font-semibold">
                Loyalty account
              </h3>
              <div className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3 text-sm text-[var(--admin-muted)]">
                <p className="font-semibold text-[var(--admin-ink)]">Points ledger unavailable</p>
                <p className="mt-1">
                  A persistent loyalty account and transaction ledger are required before points can be issued or
                  redeemed. Member ID, tier, balance, earned, redeemed, and expiry are not available.
                </p>
              </div>
            </section>

            <section aria-labelledby="loyalty-classification-heading">
              <h3 id="loyalty-classification-heading" className="text-sm font-semibold">
                Rule-based classification
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      tag === "inactive" ? "bg-amber-50 text-amber-950" : "bg-sky-50 text-sky-950"
                    }`}
                  >
                    {classificationLabel(tag)}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--admin-muted)]">
                Derived from order count and spend in the loaded window — not VIP tier assignment.
              </p>
            </section>

            <CustomerHistory orders={customer.orders} branchLabelById={branchLabelById} />

            <section aria-labelledby="reward-history-heading">
              <h3 id="reward-history-heading" className="text-sm font-semibold">
                Reward history
              </h3>
              <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3 text-sm text-[var(--admin-muted)]">
                Unavailable — reward redemption ledger not implemented.
                {detail?.discountAmount && detail.discountAmount > 0 ? (
                  <>
                    {" "}
                    Latest order had a discount of {formatPkr(detail.discountAmount)} (order pricing, not loyalty
                    redemption).
                  </>
                ) : null}
              </p>
              {detailLoading ? (
                <div className="mt-2 h-10 animate-pulse rounded-xl bg-[var(--admin-soft)]" aria-busy="true" />
              ) : null}
              {detailError ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  <p>{detailError}</p>
                  <button type="button" className="mt-1 font-semibold underline" onClick={onRetryDetail}>
                    Retry detail
                  </button>
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap gap-2 border-t border-[var(--admin-border)] pt-4">
              <Link
                href={`/admin/crm?selected=${encodeURIComponent(customer.id)}`}
                className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
              >
                View in CRM
              </Link>
              <Link
                href={`/admin/orders?orderNumber=${encodeURIComponent(customer.lastOrderNumber)}`}
                className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
              >
                View orders
              </Link>
              <Link
                href="/admin/pos"
                className="min-h-11 rounded-xl bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
              >
                Start POS order
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
