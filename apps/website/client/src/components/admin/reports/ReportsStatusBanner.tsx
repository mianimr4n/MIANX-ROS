export function ReportsStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Partial BI — live sales analytics + today ops</p>
      <p className="mt-1 text-sky-900/90">
        Daily sales (GET /admin/reports/sales) and CSV exports are LIVE from orders. Today KPIs still come from GET
        /admin/dashboard/operations. Product-level sales, inventory valuation, finance statements, and Excel/PDF exports
        remain Coming Soon. No fabricated charts or growth percentages.
      </p>
    </div>
  );
}
