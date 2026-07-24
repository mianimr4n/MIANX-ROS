import { primaryRoleLabel } from "@/lib/admin-access";
import { currentShiftLabel } from "@/lib/admin-pos";

export function POSHeader({
  branchLabel,
  cashierName,
  roles,
  isSuperAdmin,
  searchDraft,
  onSearchDraftChange,
  onSearch,
  onRefresh,
  live,
}: {
  branchLabel: string;
  cashierName: string;
  roles: string[];
  isSuperAdmin: boolean;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  live: boolean;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
          Commerce
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Point of Sale</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {primaryRoleLabel(roles, isSuperAdmin)} · {branchLabel} · {currentShiftLabel()}
          <span className="ml-2 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Foundation shift label
          </span>
        </p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Cashier: <span className="font-semibold text-[var(--admin-ink)]">{cashierName}</span>
          <span
            className="ml-2 rounded-full border border-dashed border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]"
            title="Hardware register status is not integrated"
          >
            Register · Foundation
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            live ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
          }`}
          aria-live="polite"
        >
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-600" : "bg-amber-500"}`} aria-hidden />
          {live ? "Menu live" : "Menu fallback"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Refresh
        </button>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <label className="sr-only" htmlFor="pos-menu-search">
            Search menu
          </label>
          <input
            id="pos-menu-search"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Search name / SKU / category"
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
