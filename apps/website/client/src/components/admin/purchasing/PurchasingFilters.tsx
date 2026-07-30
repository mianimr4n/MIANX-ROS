import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function PurchasingFilters({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section aria-label="Purchasing filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Search and filters"
        description="Search applies to live suppliers and purchase orders. Advanced approval filters Coming Soon."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {["Approval status", "Receiving status", "Invoice status", "Overdue", "Buyer"].map((label) => (
          <label
            key={label}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]"
          >
            <input type="checkbox" disabled className="rounded" />
            {label} · Coming Soon
          </label>
        ))}
        <label className="block text-sm md:col-span-2 xl:col-span-4">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search suppliers or PO numbers…"
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          />
        </label>
      </div>
    </section>
  );
}
