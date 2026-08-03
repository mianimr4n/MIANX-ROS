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
    <header
      className="mb-4 flex flex-wrap items-start justify-between gap-4"
      data-testid="operations-workspace-header"
      data-ops-maturity="FOUNDATION"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
          Commerce
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-ink)]">Point of Sale</p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Quote and place orders for the active branch. Hardware register, draft carts, and receipt
          printers are not integrated.
        </p>
        <p className="mt-2 text-sm text-[var(--admin-ink)]">
          <span className="font-medium">Active branch:</span> {branchLabel}
          <span className="mx-1 text-[var(--admin-muted)]">·</span>
          {primaryRoleLabel(roles, isSuperAdmin)}
          <span className="mx-1 text-[var(--admin-muted)]">·</span>
          <span className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-soft)] px-2 py-0.5 text-xs font-semibold">
            Foundation
          </span>
          <span className="mx-1 text-[var(--admin-muted)]">·</span>
          {currentShiftLabel()}
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--admin-ink)]" data-testid="operations-primary-task">
          Primary task: build cart and place an order
        </p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Cashier: <span className="font-semibold text-[var(--admin-ink)]">{cashierName}</span>
          <span className="ml-2 text-xs">Register hardware · not connected</span>
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
