import { displayPrice } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import type { MenuCatalogItemView } from "@/lib/admin-menu";

const PRICING_ROWS = [
  { label: "Base / display price", key: "base", live: true },
  { label: "Discount rules", key: "discount", live: false },
  { label: "Tax class", key: "tax", live: false },
  { label: "Delivery fee relation", key: "delivery", live: false },
  { label: "Price history", key: "history", live: false },
  { label: "Branch price override", key: "branch", live: false },
] as const;

export function PricingPanel({ product }: { product: MenuCatalogItemView }) {
  const price = displayPrice(product);

  return (
    <section aria-labelledby="pricing-panel-heading">
      <h3 id="pricing-panel-heading" className="text-sm font-semibold">
        Pricing
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {PRICING_ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2"
          >
            <span>{row.label}</span>
            {row.key === "base" ? (
              <span className="tabular-nums font-semibold">{price > 0 ? formatPkr(price) : "—"}</span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Foundation</span>
            )}
          </li>
        ))}
      </ul>
      {product.variants && product.variants.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          Variant prices are live in catalog — see Variants section for size breakdown.
        </p>
      ) : null}
    </section>
  );
}
