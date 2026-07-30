export function ReportsStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Business reports are ready</p>
      <p className="mt-1 text-sky-900/90">
        Daily sales and CSV exports use live order data. Product-level sales, inventory valuation statements, and
        Excel/PDF packs are Planned for Phase 2.
      </p>
    </div>
  );
}
