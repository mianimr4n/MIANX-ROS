import { displayPrice, itemHasModifiers } from "@/lib/admin-pos";
import { formatPkr } from "@/lib/admin-order-format";
import type { MenuProductGroup } from "@/lib/telepizza-types";

export function ProductCard({
  group,
  onAdd,
  onConfigure,
}: {
  group: MenuProductGroup;
  onAdd: () => void;
  onConfigure: () => void;
}) {
  const price = displayPrice(group);
  const outOfStock = group.options.every((sku) => sku.available === false) || group.options.length === 0;
  const hasMods = group.options.some(itemHasModifiers);

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-[0_1px_2px_rgba(31,31,31,0.04)]"
      aria-label={group.name}
    >
      <div className="relative aspect-[4/3] bg-[var(--admin-soft)]">
        {group.image ? (
          <img src={group.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--admin-muted)]">No image</div>
        )}
        {outOfStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Out of stock
          </span>
        ) : null}
        {hasMods && !outOfStock ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-ink)]">
            Modifiers
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold leading-snug text-[var(--admin-ink)]">{group.name}</h3>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">{group.category}</p>
        <p className="mt-2 text-base font-semibold tabular-nums">
          {outOfStock ? "—" : formatPkr(price)}
          {group.options.length > 1 ? (
            <span className="ml-2 text-xs font-normal text-[var(--admin-muted)]">
              {group.options.length} SKUs
            </span>
          ) : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={outOfStock}
            onClick={onAdd}
            className="min-h-11 flex-1 rounded-xl bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Quick add
          </button>
          <button
            type="button"
            disabled={outOfStock}
            onClick={onConfigure}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:opacity-40"
          >
            Options
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  groups,
  loading,
  emptyMessage,
  onQuickAdd,
  onConfigure,
}: {
  groups: MenuProductGroup[];
  loading: boolean;
  emptyMessage: string;
  onQuickAdd: (group: MenuProductGroup) => void;
  onConfigure: (group: MenuProductGroup) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center text-sm text-[var(--admin-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Product grid">
      {groups.map((group) => (
        <ProductCard
          key={group.productGroupSlug}
          group={group}
          onAdd={() => onQuickAdd(group)}
          onConfigure={() => onConfigure(group)}
        />
      ))}
    </div>
  );
}
