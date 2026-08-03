export function ReportsStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
      aria-live="polite"
      data-testid="reports-status-banner"
    >
      <p className="font-semibold">Owner BI workspace — fixed reports &amp; exports</p>
      <p className="mt-1 text-sky-900/90">
        Module KPIs come from GET /admin/analytics/workspace. Excel and PDF packs are LIVE via analytics export when
        authorized. Custom report builders and scheduled report execution remain DEFERRED — not available from this
        page.
      </p>
    </div>
  );
}
