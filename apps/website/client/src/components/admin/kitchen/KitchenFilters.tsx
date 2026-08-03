import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { KITCHEN_ACTIVE_STATUSES, KITCHEN_ORDER_TYPES } from "@/lib/admin-kitchen";

export type KitchenFilterState = {
  status: string;
  orderType: string;
  priority: string;
  search: string;
  prepBand: string;
};

export function KitchenFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApplySearch,
  onReset,
}: {
  filters: KitchenFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (next: Partial<KitchenFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Kitchen filters"
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
        Status
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by kitchen status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">Active statuses</option>
          {KITCHEN_ACTIVE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "queued"
                ? "Pending"
                : status === "accepted"
                  ? "Accepted"
                  : status === "preparing"
                    ? "Preparing"
                    : "Ready"}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Order type
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by order type"
          value={filters.orderType}
          onChange={(event) => onChange({ orderType: event.target.value })}
        >
          <option value="">All types</option>
          {KITCHEN_ORDER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
          Live when order enrichment available
        </span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Priority
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(event) => onChange({ priority: event.target.value })}
        >
          <option value="">All priorities</option>
          <option value="normal">Normal (priority = 0)</option>
          <option value="high">High (priority {">"} 0)</option>
          <option value="delayed">Delayed (elapsed ≥ 20m)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Preparation time
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by preparation elapsed band"
          value={filters.prepBand}
          onChange={(event) => onChange({ prepBand: event.target.value })}
        >
          <option value="">Any elapsed</option>
          <option value="green">Within target ({"<"} 15m)</option>
          <option value="yellow">Approaching (15–19m)</option>
          <option value="red">Delayed (≥ 20m)</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Kitchen search
        <input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Sequence # or order id"
          aria-label="Search kitchen tickets"
        />
      </label>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="min-h-12 flex-1 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Apply search
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Reset filters
        </button>
      </div>
    </form>
  );
}
