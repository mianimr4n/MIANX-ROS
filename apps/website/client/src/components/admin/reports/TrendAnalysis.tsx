import { formatPkr } from "@/lib/admin-order-format";
import type { SalesReport } from "@/lib/admin-api";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { ReportBarChart } from "@/components/admin/reports/ReportCharts";

export function TrendAnalysis({
  report,
  loading,
  error,
}: {
  report: SalesReport | null;
  loading: boolean;
  error: string | null;
}) {
  const chartData =
    report?.days.map((day) => ({
      label: day.date.slice(5),
      value: Math.round(day.grossSales),
    })) ?? [];
  const hasSales = (report?.totals.totalOrders ?? 0) > 0;

  return (
    <AdminSurface aria-labelledby="trend-analysis-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Sales analytics"
        description="Daily gross sales from live orders (Asia/Karachi) — cancelled orders excluded."
      />
      <AdminSurfaceBody>
        <h2 id="trend-analysis-heading" className="sr-only">
          Sales analytics
        </h2>

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading sales analytics…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !report || !hasSales ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-8 text-center">
            <p className="font-semibold text-[var(--admin-ink)]">No sales data for selected period</p>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              Adjust the date range or branch filter. Empty days are expected when no non-cancelled orders exist.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Orders in range</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{report.totals.totalOrders}</p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Gross sales</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatPkr(report.totals.grossSales)}</p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Average order value</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatPkr(report.totals.averageOrderValue)}
                </p>
              </div>
            </div>
            <ReportBarChart data={chartData} title="Daily gross sales" valueLabel="PKR" />
            <p className="mt-3 text-xs text-[var(--admin-muted)]">
              {report.startDate} → {report.endDate} · {report.timezone}
              {report.branchId ? " · branch scoped" : " · all accessible branches"}
            </p>
          </>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
