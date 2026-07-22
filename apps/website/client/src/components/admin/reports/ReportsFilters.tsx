import {
  DEFAULT_EXECUTIVE_FILTERS,
  ExecutiveFilterBar,
  type ExecutiveDashboardFilters,
} from "@/components/admin/dashboard/ExecutiveFilterBar";

export { DEFAULT_EXECUTIVE_FILTERS, type ExecutiveDashboardFilters };

export function ReportsFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: ExecutiveDashboardFilters;
  onChange: (next: ExecutiveDashboardFilters) => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-6">
      <ExecutiveFilterBar filters={filters} onChange={onChange} onReset={onReset} />
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Branch reloads dashboard data from the API. Status, channel, and order type refine the recent-orders window only.
        Date range, customer, category, and payment-method filters are Foundation-disabled until reporting APIs exist.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Date range
          <select
            disabled
            className="mt-1.5 block min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
            aria-label="Date range filter — foundation disabled"
          >
            <option>Today only (live)</option>
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Category
          <select
            disabled
            className="mt-1.5 block min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
            aria-label="Category filter — foundation disabled"
          >
            <option>Foundation</option>
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Payment method
          <select
            disabled
            className="mt-1.5 block min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
            aria-label="Payment method filter — foundation disabled"
          >
            <option>Foundation</option>
          </select>
        </label>
      </div>
    </div>
  );
}
