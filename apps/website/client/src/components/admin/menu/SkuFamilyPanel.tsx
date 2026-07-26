import { formatPkr } from "@/lib/admin-order-format";
import type { MenuCatalogItemView } from "@/lib/admin-menu";

/**
 * Sibling SKUs in the same product family. Each row is its own sellable item with its own
 * price — this panel navigates between them, it never edits a price matrix.
 */
export function SkuFamilyPanel({
  product,
  family,
  onOpen,
}: {
  product: MenuCatalogItemView;
  family: MenuCatalogItemView[];
  onOpen: (sibling: MenuCatalogItemView) => void;
}) {
  return (
    <section aria-labelledby="sku-family-heading">
      <h3 id="sku-family-heading" className="text-sm font-semibold">
        Product family SKUs
      </h3>
      {family.length <= 1 ? (
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Single-SKU product — this item is the whole family.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {family.map((sibling) => {
            const current = sibling.id === product.id;
            return (
              <li key={sibling.id}>
                <button
                  type="button"
                  aria-current={current}
                  onClick={() => onOpen(sibling)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
                    current
                      ? "border-[var(--brand-red)] bg-[var(--admin-soft)]"
                      : "border-[var(--admin-border)] hover:bg-[var(--admin-soft)]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{sibling.sizeLabel ?? sibling.name}</p>
                    <p className="truncate text-xs text-[var(--admin-muted)]">
                      {sibling.slug ?? sibling.id}
                      {sibling.sizeCode ? ` · ${sibling.sizeCode}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-semibold">{formatPkr(sibling.price)}</p>
                    {sibling.available === false ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                        Unavailable
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Family key: <code>{product.productGroupSlug ?? product.slug ?? product.id}</code>
      </p>
    </section>
  );
}
