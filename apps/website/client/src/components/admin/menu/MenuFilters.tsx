import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type MenuFilterState = {
  categorySlug: string;
  productType: string;
  featuredOnly: boolean;
  hasModifiersOnly: boolean;
  search: string;
};

const PRODUCT_TYPES = [
  { value: "", label: "All types" },
  { value: "pizza", label: "Pizza" },
  { value: "deal", label: "Deal" },
  { value: "side", label: "Side" },
  { value: "drink", label: "Drink" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

export function MenuFilters({
  filters,
  onChange,
  onApplySearch,
  searchDraft,
  onSearchDraftChange,
}: {
  filters: MenuFilterState;
  onChange: (next: Partial<MenuFilterState>) => void;
  onApplySearch: () => void;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
}) {
  return (
    <section aria-label="Menu filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Filters"
        description="Client-side filters on loaded catalog. Branch overrides, visibility, and barcode search are not exposed by the read API."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Category</span>
          <select
            value={filters.categorySlug}
            onChange={(event) => onChange({ categorySlug: event.target.value })}
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Product type</span>
          <select
            value={filters.productType}
            onChange={(event) => onChange({ productType: event.target.value })}
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value || "all"} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]">
          <input type="checkbox" disabled className="rounded" />
          Branch menu · Coming Soon
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]">
          <input type="checkbox" disabled className="rounded" />
          Published / Draft · Unavailable
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.featuredOnly}
            onChange={(event) => onChange({ featuredOnly: event.target.checked })}
            className="rounded"
          />
          Featured only
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.hasModifiersOnly}
            onChange={(event) => onChange({ hasModifiersOnly: event.target.checked })}
            className="rounded"
          />
          Has modifiers
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search (name, slug, description)</span>
          <div className="flex gap-2">
            <input
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onApplySearch();
                }
              }}
              placeholder="Search catalog"
              className="min-h-11 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            />
            <button
              type="button"
              onClick={onApplySearch}
              className="min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}

export function MenuFiltersWithCategories({
  filters,
  onChange,
  onApplySearch,
  searchDraft,
  onSearchDraftChange,
  categoryOptions,
}: {
  filters: MenuFilterState;
  onChange: (next: Partial<MenuFilterState>) => void;
  onApplySearch: () => void;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  categoryOptions: Array<{ slug: string; name: string }>;
}) {
  return (
    <section aria-label="Menu filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Filters"
        description="Client-side filters on loaded catalog. Branch overrides, visibility, and barcode search are not exposed by the read API."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Category</span>
          <select
            value={filters.categorySlug}
            onChange={(event) => onChange({ categorySlug: event.target.value })}
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
            <option value="internal">Internal / Toppings</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Product type</span>
          <select
            value={filters.productType}
            onChange={(event) => onChange({ productType: event.target.value })}
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value || "all"} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]">
          <input type="checkbox" disabled className="rounded" />
          Branch menu · Coming Soon
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]">
          <input type="checkbox" disabled className="rounded" />
          Published / Draft · Unavailable
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.featuredOnly}
            onChange={(event) => onChange({ featuredOnly: event.target.checked })}
            className="rounded"
          />
          Featured only
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.hasModifiersOnly}
            onChange={(event) => onChange({ hasModifiersOnly: event.target.checked })}
            className="rounded"
          />
          Has modifiers
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search (name, slug, description)</span>
          <div className="flex gap-2">
            <input
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onApplySearch();
                }
              }}
              placeholder="Search catalog"
              className="min-h-11 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            />
            <button
              type="button"
              onClick={onApplySearch}
              className="min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}
