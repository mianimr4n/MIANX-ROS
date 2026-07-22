import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export function PurchasingFilters() {
  return (
    <section aria-label="Purchasing filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Search and filters"
        description="Foundation — supplier master and purchase-order APIs required before filters apply to real data."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {["Supplier", "PO status", "Approval status", "Receiving status", "Invoice status", "Overdue", "Buyer"].map(
          (label) => (
            <label
              key={label}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]"
            >
              <input type="checkbox" disabled className="rounded" />
              {label} · Foundation
            </label>
          ),
        )}
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search</span>
          <input
            disabled
            placeholder="Foundation — supplier / PO / invoice search unavailable"
            className="min-h-11 w-full cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 text-sm text-[var(--admin-muted)]"
          />
        </label>
      </div>
    </section>
  );
}
