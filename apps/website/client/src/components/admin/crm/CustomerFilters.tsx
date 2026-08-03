import { useAdminBranch } from "@/contexts/AdminBranchContext";

export type CustomerFilterState = {
  status: string;
  repeatOnly: boolean;
  search: string;
};

export function CustomerFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApplySearch,
  onReset,
}: {
  filters: CustomerFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (next: Partial<CustomerFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Customer filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApplySearch();
      }}
    >
      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Branch
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by branch"
          value={selection.mode === "all" ? "all" : selection.branchId}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "all") setSelection({ mode: "all" });
            else setSelection({ mode: "branch", branchId: value });
          }}
        >
          {canSelectAll ? <option value="all">All Branches</option> : null}
          {allowedBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName || branch.name}
            </option>
          ))}
          {!canSelectAll && allowedBranches.length === 0 ? <option value="">{label}</option> : null}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Activity
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by activity"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">All in window</option>
          <option value="active">Active (≤30 days)</option>
          <option value="inactive">Inactive (&gt;30 days)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Order count
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by order count"
          value={filters.repeatOnly ? "repeat" : ""}
          onChange={(event) => onChange({ repeatOnly: event.target.value === "repeat" })}
        >
          <option value="">Any</option>
          <option value="repeat">Repeat (2+)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Search
        <input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Name, phone, order #"
          aria-label="Search customers"
        />
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Customer type
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Customer type unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Planned for Phase 2</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        VIP / blocked filters (unavailable)
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="VIP and blocked filters unavailable"
          value=""
        >
          <option value="">Not available — no customer-master VIP/blocklist</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Unavailable</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Registration / last order date
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Date filter unavailable"
          value="window"
        >
          <option value="window">Loaded order window only</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Planned for Phase 2</span>
      </label>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Apply search
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
