export function ReportsStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Partial BI — today&apos;s operational scope</p>
      <p className="mt-1 text-sky-900/90">
        Live KPIs and charts come from GET /admin/dashboard/operations (Asia/Karachi business day). Date ranges beyond
        today, historical trends, product-level sales, inventory valuation, finance statements, and CSV/Excel/PDF exports
        are Foundation until analytics backends ship. No fabricated charts or growth percentages.
      </p>
    </div>
  );
}
