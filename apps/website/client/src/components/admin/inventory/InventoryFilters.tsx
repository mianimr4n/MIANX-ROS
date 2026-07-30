import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function InventoryFilters({
  search,
  onSearchChange,
  lowStockOnly,
  onLowStockOnlyChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (value: boolean) => void;
}) {
  return (
    <section aria-label="Inventory filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Filters"
        description="Search and low-stock filter apply to live stock items."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 text-sm">
          <input
            type="checkbox"
            className="rounded"
            checked={lowStockOnly}
            onChange={(e) => onLowStockOnlyChange(e.target.checked)}
          />
          Low stock
        </label>
        <label className="block text-sm md:col-span-2 xl:col-span-3">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search stock items</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or SKU…"
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          />
        </label>
      </div>
    </section>
  );
}
