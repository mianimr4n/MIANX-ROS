import { formatPkr } from "@/lib/admin-order-format";
import type { QuoteOrderResponse } from "@/lib/telepizza-types";
import type { PosCartLine } from "@/lib/admin-pos";

export function ReceiptPreview({
  orderNumber,
  lines,
  quote,
  paymentLabel,
  customerName,
}: {
  orderNumber: string | null;
  lines: PosCartLine[];
  quote: QuoteOrderResponse | null;
  paymentLabel: string;
  customerName: string;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Receipt preview"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Receipt preview</h3>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]"
          title="Hardware print integration is Foundation"
        >
          Print · Foundation
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        Order #: {orderNumber ?? "—"} · Customer: {customerName || "—"}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {lines.map((line) => (
          <li key={line.key} className="flex justify-between gap-2">
            <span>
              {line.quantity}× {line.productName}
              {line.variantLabel ? ` (${line.variantLabel})` : ""}
            </span>
            <span className="tabular-nums">{formatPkr((line.unitPrice + (line.modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0)) * line.quantity)}</span>
          </li>
        ))}
      </ul>
      {quote ? (
        <dl className="mt-3 space-y-1 border-t border-[var(--admin-border)] pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.discountAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.taxAmount)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPkr(quote.totals.totalAmount)}</dd>
          </div>
          <div className="flex justify-between text-[var(--admin-muted)]">
            <dt>Payment method</dt>
            <dd>{paymentLabel} (Foundation label)</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
