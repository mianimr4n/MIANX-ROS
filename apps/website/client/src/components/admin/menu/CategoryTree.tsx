import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function CategoryTree({
  entries,
  activeSlug,
  onSelect,
  loading,
}: {
  entries: Array<{ slug: string; name: string; count: number; internal?: boolean }>;
  activeSlug: string;
  onSelect: (slug: string) => void;
  loading: boolean;
}) {
  return (
    <section
      aria-label="Category tree"
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
    >
      <AdminSectionTitle
        eyebrow="Structure"
        title="Category tree"
        description="Flat category list from catalog — nested hierarchy Coming Soon until parent/child relations exist in API."
      />
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1" role="tree">
          <li role="none">
            <button
              type="button"
              role="treeitem"
              aria-selected={!activeSlug}
              onClick={() => onSelect("")}
              className={`flex w-full min-h-11 items-center justify-between rounded-lg px-3 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${
                !activeSlug ? "bg-[var(--brand-red)]/10 text-[var(--brand-red-dark)]" : "hover:bg-[var(--admin-soft)]"
              }`}
            >
              <span>All products</span>
              <span className="tabular-nums text-xs text-[var(--admin-muted)]">
                {entries.reduce((sum, entry) => sum + entry.count, 0)}
              </span>
            </button>
          </li>
          {entries.map((entry) => (
            <li key={entry.slug} role="none">
              <button
                type="button"
                role="treeitem"
                aria-selected={activeSlug === entry.slug}
                onClick={() => onSelect(entry.slug)}
                className={`flex w-full min-h-11 items-center justify-between rounded-lg px-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${
                  activeSlug === entry.slug
                    ? "bg-[var(--brand-red)]/10 font-semibold text-[var(--brand-red-dark)]"
                    : "hover:bg-[var(--admin-soft)]"
                }`}
              >
                <span>
                  {entry.name}
                  {entry.internal ? (
                    <span className="ml-2 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      Internal
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums text-xs text-[var(--admin-muted)]">{entry.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-xs text-[var(--admin-muted)]">
        Multi-level trees (Pizza → Classic → Premium) require category parent relations — Coming Soon.
      </p>
    </section>
  );
}
