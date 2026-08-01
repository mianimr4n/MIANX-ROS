import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function ExportPanel({
  canExport,
  busy,
  error,
  onExportSales,
  onExportOrders,
  onExportAnalyticsCsv,
  onExportAnalyticsExcel,
  onExportAnalyticsPdf,
}: {
  canExport: boolean;
  busy: boolean;
  error: string | null;
  onExportSales: () => void;
  onExportOrders: () => void;
  onExportAnalyticsCsv: () => void;
  onExportAnalyticsExcel: () => void;
  onExportAnalyticsPdf: () => void;
}) {
  return (
    <AdminSurface aria-labelledby="export-panel-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Exports"
        description="Analytics CSV / Excel / PDF from GET /admin/analytics/export — plus legacy sales and orders CSV."
      />
      <AdminSurfaceBody>
        <h2 id="export-panel-heading" className="sr-only">
          Report exports
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            disabled={!canExport || busy}
            onClick={onExportAnalyticsCsv}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-6 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Export analytics CSV"}
          </button>
          <button
            type="button"
            disabled={!canExport || busy}
            onClick={onExportAnalyticsExcel}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-6 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Export Excel"}
          </button>
          <button
            type="button"
            disabled={!canExport || busy}
            onClick={onExportAnalyticsPdf}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-6 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Export PDF"}
          </button>
          <button
            type="button"
            disabled={!canExport || busy}
            onClick={onExportSales}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-6 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Export sales CSV"}
          </button>
          <button
            type="button"
            disabled={!canExport || busy}
            onClick={onExportOrders}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-6 text-sm font-semibold hover:bg-[var(--admin-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Export orders CSV"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {!canExport ? (
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Sign in with reports.read, order.manage, or admin.access to export.
          </p>
        ) : (
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Exports use the same date range and branch filter as the Owner BI workspace.
          </p>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
