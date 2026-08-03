import { currentShiftLabel } from "@/lib/admin-crm";

export function WhatsAppHeader({
  branchLabel,
  roleLabel,
  searchDraft,
  onSearchDraftChange,
  onSearch,
  onRefresh,
  live,
  providerLabel,
}: {
  branchLabel: string;
  roleLabel: string;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  live: boolean;
  providerLabel: string;
}) {
  return (
    <header
      className="mb-5 flex flex-wrap items-start justify-between gap-4"
      data-testid="whatsapp-order-attribution-header"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
          Order channel attribution
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">WhatsApp-attributed orders</p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · Active branch: {branchLabel} · {currentShiftLabel()}
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--admin-ink)]">
          Primary task: review WhatsApp-sourced orders — not a conversation inbox
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Provider: <span className="font-semibold text-[var(--admin-ink)]">{providerLabel}</span>
          <span className="mx-1">·</span>
          No message store, unread counts, or agent assignment in this workspace
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            live ? "bg-sky-50 text-sky-900" : "bg-red-50 text-red-900"
          }`}
          aria-live="polite"
        >
          <span className={`h-2 w-2 rounded-full ${live ? "bg-sky-600" : "bg-red-600"}`} aria-hidden />
          {live ? "Order-derived feed" : "Offline"}
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
          <label className="sr-only" htmlFor="whatsapp-search">
            Search WhatsApp-attributed orders
          </label>
          <input
            id="whatsapp-search"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Order #, name, phone"
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
