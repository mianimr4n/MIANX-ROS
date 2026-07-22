import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function TrendAnalysis() {
  return (
    <AdminSurface aria-labelledby="trend-analysis-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Trend analysis"
        description="Historical time-series requires analytics warehouse — not available in repository."
      />
      <AdminSurfaceBody>
        <h2 id="trend-analysis-heading" className="sr-only">
          Trend analysis
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-8 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Trend analysis foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No multi-day sales, order, or customer trend APIs exist. Frontend will not fabricate line charts or growth
            percentages. Today-only operational charts are available in Sales and Order reports above.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
