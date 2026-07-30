import {
  DEFAULT_EXECUTIVE_FILTERS,
  ExecutiveFilterBar,
  type ExecutiveDashboardFilters,
} from "@/components/admin/dashboard/ExecutiveFilterBar";

export { DEFAULT_EXECUTIVE_FILTERS, type ExecutiveDashboardFilters };

export type ReportsDateRange = {
  startDate: string;
  endDate: string;
};

export function ReportsFilters({
  filters,
  onChange,
  onReset,
  dateRange,
  onDateRangeChange,
}: {
  filters: ExecutiveDashboardFilters;
  onChange: (next: ExecutiveDashboardFilters) => void;
  onReset: () => void;
  dateRange: ReportsDateRange;
  onDateRangeChange: (next: ReportsDateRange) => void;
}) {
  return (
    <div className="mb-6">
      <ExecutiveFilterBar filters={filters} onChange={onChange} onReset={onReset} />
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Branch scope comes from the admin branch switcher. Date range drives Sales analytics and CSV exports
        (Asia/Karachi). Status / channel / order type still refine the today dashboard window only.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Start date
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
            className="mt-1.5 block min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          End date
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
            className="mt-1.5 block min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
