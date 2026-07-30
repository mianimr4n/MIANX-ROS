import { formatPkr } from "@/lib/admin-order-format";
import type { MenuCatalogItemView } from "@/lib/admin-menu";

export function ModifierManager({ product }: { product: MenuCatalogItemView }) {
  const groups = product.modifierGroups ?? [];

  return (
    <section aria-labelledby="modifier-manager-heading">
      <h3 id="modifier-manager-heading" className="text-sm font-semibold">
        Modifiers
      </h3>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--admin-muted)]">No modifier groups on this SKU.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {groups.map((group) => (
            <li key={group.code} className="rounded-xl border border-[var(--admin-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{group.name}</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  Live
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {group.selectionType} · min {group.minSelect}
                {group.maxSelect != null ? ` · max ${group.maxSelect}` : ""}
                {group.isRequired ? " · required" : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {group.options.map((option) => (
                  <li key={option.code} className="flex justify-between gap-3">
                    <span>{option.name}</span>
                    <span className="tabular-nums text-[var(--admin-muted)]">
                      {option.priceDelta !== 0 ? `+${formatPkr(option.priceDelta)}` : "Included"}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        Modifier groups are live from the catalog. Modifier editing and branch overrides remain Coming Soon.
      </p>
    </section>
  );
}
