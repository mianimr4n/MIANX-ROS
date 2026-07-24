import { formatPkr } from "@/lib/admin-order-format";
import type { MenuCatalogItemView } from "@/lib/admin-menu";

export function VariantManager({ product }: { product: MenuCatalogItemView }) {
  const variants = product.variants ?? [];

  return (
    <section aria-labelledby="variant-manager-heading">
      <h3 id="variant-manager-heading" className="text-sm font-semibold">
        Variants
      </h3>
      {variants.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--admin-muted)]">Single-price SKU — no size variants in catalog.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {variants.map((variant) => (
            <li
              key={variant.id ?? variant.label}
              className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{variant.label}</p>
                {variant.sizeCode ? (
                  <p className="text-xs text-[var(--admin-muted)]">Size code: {variant.sizeCode}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="tabular-nums font-semibold">{formatPkr(variant.price)}</p>
                {variant.isDefault ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Default</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
