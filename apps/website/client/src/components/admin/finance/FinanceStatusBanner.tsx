export function FinanceStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Finance general ledger is LIVE</p>
      <p className="mt-1 text-emerald-900/90">
        Chart of accounts, balanced journal entries, trial balance, and profit &amp; loss are available. Order totals remain
        operational sales — not automatic accounting revenue. Cash flow, balance sheet, AR/AP modules, and VAT/GST returns
        are Coming Soon.
      </p>
    </div>
  );
}
