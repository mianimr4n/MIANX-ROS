import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ORDER_SOURCES, ORDER_STATUSES, ORDER_TYPES } from "@/lib/admin-order-format";

export type OrderFilterState = {
  status: string;
  orderType: string;
  orderSource: string;
  orderNumber: string;
};

export function OrderFilters({
  filters,
  orderNumberDraft,
  onOrderNumberDraftChange,
  onChange,
  onApplySearch,
  onReset,
}: {
  filters: OrderFilterState;
  orderNumberDraft: string;
  onOrderNumberDraftChange: (value: string) => void;
  onChange: (next: Partial<OrderFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Order filters"
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
        Order status
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by order status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
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
          {ORDER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Channel
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by channel"
          value={filters.orderSource}
          onChange={(event) => onChange({ orderSource: event.target.value })}
        >
          <option value="">All channels</option>
          {ORDER_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Order number
        <input
          value={orderNumberDraft}
          onChange={(event) => onOrderNumberDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Search order #"
          aria-label="Search by order number"
        />
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Delivery type
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Delivery type filter unavailable"
          value=""
        >
          <option value="">Same as order type</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Foundation</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Payment method
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Payment method filter unavailable"
          value=""
        >
          <option value="">Not available yet</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Foundation</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Date range
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Date range filter unavailable"
          value="today"
        >
          <option value="today">Today (list API default)</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Foundation</span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Customer
        <input
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          placeholder="Customer search later"
          aria-label="Customer filter unavailable"
        />
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Foundation</span>
      </label>

      <div className="flex items-end gap-2 xl:col-span-2">
        <button
          type="submit"
          className="min-h-10 flex-1 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Apply search
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Reset filters
        </button>
      </div>
    </form>
  );
}
