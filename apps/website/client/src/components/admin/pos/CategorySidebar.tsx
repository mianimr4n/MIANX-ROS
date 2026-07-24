import { POS_SIDEBAR_BUCKETS } from "@/lib/admin-pos";
import { cn } from "@/lib/utils";

export function CategorySidebar({
  selected,
  counts,
  categorySearch,
  onCategorySearch,
  onSelect,
}: {
  selected: string;
  counts: Record<string, number>;
  categorySearch: string;
  onCategorySearch: (value: string) => void;
  onSelect: (bucket: string) => void;
}) {
  const buckets = ["All", ...POS_SIDEBAR_BUCKETS];
  const filtered = buckets.filter((bucket) =>
    categorySearch ? bucket.toLowerCase().includes(categorySearch.toLowerCase()) : true,
  );

  return (
    <aside
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-3"
      aria-label="Menu categories"
    >
      <label className="block text-xs font-medium text-[var(--admin-muted)]">
        Search categories
        <input
          value={categorySearch}
          onChange={(event) => onCategorySearch(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Filter categories"
        />
      </label>
      <nav className="mt-3 space-y-1" aria-label="Category list">
        {filtered.map((bucket) => {
          const active = selected === bucket;
          return (
            <button
              key={bucket}
              type="button"
              onClick={() => onSelect(bucket)}
              className={cn(
                "flex w-full min-h-11 items-center justify-between rounded-xl px-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]",
                active
                  ? "bg-[var(--brand-red)] text-white"
                  : "text-[var(--admin-ink)] hover:bg-[var(--admin-soft)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span>{bucket}</span>
              <span className={cn("tabular-nums text-xs", active ? "text-white/80" : "text-[var(--admin-muted)]")}>
                {counts[bucket] ?? 0}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
