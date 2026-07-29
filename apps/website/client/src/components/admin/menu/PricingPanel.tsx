import { useEffect, useState } from "react";

import { formatPkr } from "@/lib/admin-order-format";
import type { MenuCatalogItemView } from "@/lib/admin-menu";

/**
 * One SKU, one price. There is no variant price matrix here by design — a size is a separate
 * sellable SKU with its own row in this workspace.
 */
export function PricingPanel({
  product,
  canWrite,
  saving,
  error,
  onSave,
}: {
  product: MenuCatalogItemView;
  canWrite: boolean;
  saving: boolean;
  error: string | null;
  onSave: (next: { price: number; isAvailable: boolean }) => void;
}) {
  const [priceDraft, setPriceDraft] = useState(String(product.price));
  const [available, setAvailable] = useState(product.available !== false);

  useEffect(() => {
    setPriceDraft(String(product.price));
    setAvailable(product.available !== false);
  }, [product.id, product.price, product.available]);

  const parsed = Number(priceDraft);
  const priceValid = Number.isFinite(parsed) && parsed >= 0;
  const dirty = priceValid && (parsed !== product.price || available !== (product.available !== false));

  return (
    <section aria-labelledby="pricing-panel-heading">
      <h3 id="pricing-panel-heading" className="text-sm font-semibold">
        Pricing
      </h3>

      <div className="mt-3 space-y-3 rounded-xl border border-[var(--admin-border)] p-3">
        <label className="block text-sm font-medium">
          Price (PKR)
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={priceDraft}
            disabled={!canWrite || saving}
            onChange={(event) => setPriceDraft(event.target.value)}
            aria-invalid={!priceValid}
            className="mt-1.5 w-40 rounded-lg border border-[var(--admin-border)] px-3 py-2 tabular-nums disabled:bg-[var(--admin-soft)]"
          />
        </label>
        {!priceValid ? (
          <p className="text-xs text-red-700" role="alert">
            Enter a non-negative price.
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={available}
            disabled={!canWrite || saving}
            onChange={(event) => setAvailable(event.target.checked)}
          />
          Available to order
        </label>

        {canWrite ? (
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => onSave({ price: parsed, isAvailable: available })}
            className="min-h-11 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save price & availability"}
          </button>
        ) : (
          <p className="text-xs text-[var(--admin-muted)]">
            Your role cannot change prices — `menu.write` is required.
          </p>
        )}

        {error ? (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-[var(--admin-muted)]">
          Current stored price: <span className="tabular-nums">{formatPkr(product.price)}</span>. Price
          changes are recorded in the menu audit trail.
        </p>
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {[
          { label: "Discount rules", key: "discount" },
          { label: "Tax class", key: "tax" },
          { label: "Delivery fee relation", key: "delivery" },
          { label: "Branch price override", key: "branch" },
        ].map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2"
          >
            <span>{row.label}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Unavailable
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Pricing is global: every branch sells this SKU at this price.
      </p>
    </section>
  );
}
