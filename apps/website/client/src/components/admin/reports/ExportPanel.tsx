import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function ExportPanel() {
  return (
    <AdminSurface aria-labelledby="export-panel-heading" className="mb-6">
      <AdminSurfaceHeader title="Exports" description="CSV, Excel, and PDF exports require server-side report APIs." />
      <AdminSurfaceBody>
        <h2 id="export-panel-heading" className="sr-only">
          Report exports
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {["CSV", "Excel", "PDF"].map((format) => (
            <button
              key={format}
              type="button"
              disabled
              className="min-h-11 cursor-not-allowed rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm font-semibold text-[var(--admin-muted)]"
              aria-label={`Export ${format} — foundation disabled`}
            >
              Export {format} · Foundation
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          No export endpoints in repository. Reports exported during implementation: NO.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
