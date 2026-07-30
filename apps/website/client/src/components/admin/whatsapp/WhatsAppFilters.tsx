import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ORDER_SOURCES } from "@/lib/admin-order-format";

export type WhatsAppFilterState = {
  status: string;
  orderType: string;
  search: string;
};

export function WhatsAppFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApplySearch,
  onReset,
}: {
  filters: WhatsAppFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (next: Partial<WhatsAppFilterState>) => void;
  onApplySearch: () => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();

  return (
    <form
      className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="WhatsApp order filters"
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
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Fulfillment type
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by fulfillment type"
          value={filters.orderType}
          onChange={(event) => onChange({ orderType: event.target.value })}
        >
          <option value="">All types</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
          <option value="dine-in">Dine-in</option>
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Search
        <input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          placeholder="Order #, name, phone"
          aria-label="Search WhatsApp orders"
        />
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Channel
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Channel locked to WhatsApp"
          value="whatsapp"
        >
          <option value="whatsapp">WhatsApp (verified source)</option>
          {ORDER_SOURCES.filter((s) => s !== "whatsapp").map((source) => (
            <option key={source} value={source}>
              {source} — not this workspace
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Unread / conversation status
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Conversation status unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
          Planned for Phase 2 — conversation storage required
        </span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Assigned agent
        <select
          disabled
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Agent assignment unavailable"
          value=""
        >
          <option value="">Not available</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Planned for Phase 2</span>
      </label>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
        >
          Apply search
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
