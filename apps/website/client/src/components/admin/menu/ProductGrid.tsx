import { displayPrice } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import { isLikelyOutOfStock, itemSku, modifierGroupCount, variantCount, type MenuCatalogItemView } from "@/lib/admin-menu";

export function MenuProductCard({
  product,
  onOpen,
}: {
  product: MenuCatalogItemView;
  onOpen: () => void;
}) {
  const price = displayPrice(product);
  const outOfStock = isLikelyOutOfStock(product);
  const mods = modifierGroupCount(product);
  const variants = variantCount(product);

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-[0_1px_2px_rgba(31,31,31,0.04)]"
      aria-label={product.name}
    >
      <div className="relative aspect-[4/3] bg-[var(--admin-soft)]">
        {product.image ? (
          <img src={product.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--admin-muted)]">No image</div>
        )}
        {product.catalogScope === "internal" ? (
          <span className="absolute left-2 top-2 rounded-full bg-sky-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Internal
          </span>
        ) : null}
        {outOfStock ? (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            No price
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          {product.category} · SKU {itemSku(product)}
        </p>
        <p className="mt-2 text-base font-semibold tabular-nums">{outOfStock ? "—" : formatPkr(price)}</p>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[var(--admin-muted)]">
          <div>
            <dt className="inline">Availability: </dt>
            <dd className="inline font-medium text-emerald-800">In catalog</dd>
          </div>
          <div>
            <dt className="inline">Visibility: </dt>
            <dd className="inline font-medium text-[var(--admin-muted)]">Read API only</dd>
          </div>
          <div>
            <dt className="inline">Modifiers: </dt>
            <dd className="inline tabular-nums">{mods}</dd>
          </div>
          <div>
            <dt className="inline">Variants: </dt>
            <dd className="inline tabular-nums">{variants}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 min-h-11 rounded-xl border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          View details
        </button>
      </div>
    </article>
  );
}

export function MenuProductGrid({
  products,
  loading,
  error,
  onRetry,
  onOpen,
}: {
  products: MenuCatalogItemView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (product: MenuCatalogItemView) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="text-sm font-semibold text-red-900">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--admin-border)] p-8 text-center">
        <p className="text-sm font-semibold">No products match these filters</p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">Adjust category, type, or search terms.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Product grid">
      {products.map((product) => (
        <MenuProductCard key={`${product.catalogScope}-${product.id}`} product={product} onOpen={() => onOpen(product)} />
      ))}
    </div>
  );
}
