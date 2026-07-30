import { currentShiftLabel } from "@/lib/admin-crm";

export function CRMHeader({
  branchLabel,
  roleLabel,
  searchDraft,
  onSearchDraftChange,
  onSearch,
  onRefresh,
  live,
}: {
  branchLabel: string;
  roleLabel: string;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  live: boolean;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
          Customers
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Customer Relationship Management</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · {branchLabel} · {currentShiftLabel()}
          <span className="ml-2 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Derived from orders
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            live ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
          }`}
          aria-live="polite"
        >
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-600" : "bg-red-600"}`} aria-hidden />
          {live ? "Live orders feed" : "Offline"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled
          className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]"
          title="Export arrives with Reports"
        >
          Export · Planned for Phase 2
        </button>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <label className="sr-only" htmlFor="crm-search">
            Search customers
          </label>
          <input
            id="crm-search"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Name, phone, order #"
            className="min-h-11 min-w-[14rem] rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
