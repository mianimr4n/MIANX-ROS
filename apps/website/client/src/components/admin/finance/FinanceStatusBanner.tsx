export function FinanceStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Finance foundation workspace</p>
      <p className="mt-1 text-amber-900/90">
        No general ledger, chart of accounts, accounts payable, accounts receivable, or financial statements exist in the
        committed repository. Order totals are operational sales — not accounting revenue. Customer payment records are not
        supplier payables. Inventory valuation and COGS require a stock ledger. Tax lines on orders are not a configured tax
        engine.
      </p>
    </div>
  );
}
