export function ReportsStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Owner BI workspace is ready</p>
      <p className="mt-1 text-emerald-900/90">
        Module KPIs come from GET /admin/analytics/workspace. Excel and PDF packs are LIVE via analytics export.
        Scheduled report execution remains DEFERRED until a worker is deployed.
      </p>
    </div>
  );
}
