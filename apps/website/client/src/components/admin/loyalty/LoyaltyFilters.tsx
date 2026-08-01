import { useAdminBranch } from "@/contexts/AdminBranchContext";

export type LoyaltyFilterState = {
  status: string;
  repeatOnly: boolean;
  highValueOnly: boolean;
  search: string;
};

export function LoyaltyFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApplySearch,
  onReset,
}: {
  filters: LoyaltyFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (next: Partial<LoyaltyFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Loyalty filters"
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
        Loyalty status
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by loyalty status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">All in window</option>
          <option value="active">Recently active (≤30 days)</option>
          <option value="inactive">Inactive (&gt;30 days)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Repeat / high-value
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by repeat or high value"
          value={filters.highValueOnly ? "high" : filters.repeatOnly ? "repeat" : ""}
          onChange={(event) => {
            const value = event.target.value;
            onChange({
              repeatOnly: value === "repeat",
              highValueOnly: value === "high",
            });
          }}
        >
          <option value="">Any</option>
          <option value="repeat">Repeat (2+ orders)</option>
          <option value="high">High-value (≥ Rs 5,000)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Search
        <input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Name, phone, order #"
          aria-label="Search loyalty customers"
        />
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Membership tier
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Membership tier unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Filter Planned</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Points balance band
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Points balance filter unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Filter Planned</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Reward eligibility
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Reward eligibility unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Filter Planned</span>
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
