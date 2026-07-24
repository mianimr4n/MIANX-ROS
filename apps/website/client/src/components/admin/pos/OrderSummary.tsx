import { channelLabel, type PosChannelMode } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import type { QuoteOrderResponse } from "@/lib/telepizza-types";

export function OrderSummary({
  channel,
  branchLabel,
  customerName,
  quote,
  quoting,
  quoteError,
}: {
  channel: PosChannelMode;
  branchLabel: string;
  customerName: string;
  quote: QuoteOrderResponse | null;
  quoting: boolean;
  quoteError: string | null;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Order summary"
    >
      <h3 className="text-base font-semibold">Order summary</h3>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Customer</dt>
          <dd>{customerName || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Order type</dt>
          <dd>{channelLabel(channel)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Branch</dt>
          <dd>{branchLabel}</dd>
        </div>
      </dl>

      {quoting ? <p className="mt-3 text-sm text-[var(--admin-muted)]">Refreshing quote…</p> : null}
      {quoteError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {quoteError}
        </p>
      ) : null}

      {quote ? (
        <dl className="mt-3 space-y-1 border-t border-[var(--admin-border)] pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--admin-muted)]">Subtotal</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--admin-muted)]">Discount</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.discountAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--admin-muted)]">Tax</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.taxAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--admin-muted)]">Delivery fee</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-[var(--admin-border)] pt-2 font-semibold">
            <dt>Grand total</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.totalAmount)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">Add items to request a live server quote.</p>
      )}
    </section>
  );
}
