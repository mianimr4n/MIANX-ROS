import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { DELIVERY_ALL_FILTER_STATUSES } from "@/lib/admin-delivery";
import type { RiderRosterItem } from "@/lib/ops-api";

export type DeliveryFilterState = {
  status: string;
  riderId: string;
  search: string;
};

export function DeliveryFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApplySearch,
  onReset,
  riders,
  ridersLive,
}: {
  filters: DeliveryFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (next: Partial<DeliveryFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
  riders: RiderRosterItem[];
  ridersLive: boolean;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Delivery filters"
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
          aria-label="Filter by delivery status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">Open + recent</option>
          {DELIVERY_ALL_FILTER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Rider
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)] disabled:cursor-not-allowed disabled:bg-[var(--admin-soft)]"
          aria-label="Filter by rider"
          value={filters.riderId}
          disabled={!ridersLive}
          onChange={(event) => onChange({ riderId: event.target.value })}
        >
          <option value="">All riders</option>
          <option value="unassigned">Unassigned</option>
          {riders.map((rider) => (
            <option key={rider.id} value={rider.id}>
              {rider.fullName}
            </option>
          ))}
        </select>
        {!ridersLive ? (
          <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
            Foundation without roster access
          </span>
        ) : null}
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Search
        <input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Order # or customer"
          aria-label="Search deliveries"
        />
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Channel
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Channel filter unavailable"
          value=""
        >
          <option value="">Not on delivery assignment</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Planned for Phase 2</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Customer
        <input
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          placeholder="Use search for customer name"
          aria-label="Customer filter unavailable"
        />
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Planned for Phase 2</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Date
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Date filter unavailable"
          value="loaded"
        >
          <option value="loaded">Loaded assignment window</option>
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
