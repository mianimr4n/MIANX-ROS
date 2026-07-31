export function FinanceStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Finance tools are ready</p>
      <p className="mt-1 text-emerald-900/90">
        Chart of accounts, journal entries, trial balance, profit &amp; loss, and supplier payables are available.
        Cash flow and balance sheet reports are LIVE (derived from posted journals). Receivables and tax configuration
        foundations are LIVE; jurisdiction filing remains DEFERRED.
      </p>
    </div>
  );
}
