import type { AdminOperationsDashboard } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-order-format";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { CustomerReportSnapshot, PaymentMixSnapshot } from "@/lib/admin-reports";
import { ReportBarChart, ReportPieLegend } from "@/components/admin/reports/ReportCharts";
import { sourceChartData, statusChartData } from "@/lib/admin-reports";

export function SalesReport({
  data,
  paymentMix,
}: {
  data: AdminOperationsDashboard | null;
  paymentMix: PaymentMixSnapshot;
}) {
  const sourceData = sourceChartData(data?.sourceBreakdown);

  return (
    <AdminSurface aria-labelledby="sales-report-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Sales reports"
        description="Today's gross sales and channel mix from operations dashboard — not product-category revenue."
      />
      <AdminSurfaceBody>
        <h2 id="sales-report-heading" className="sr-only">
          Sales reports
        </h2>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Gross sales (today)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPkr(data?.kpis.todayGrossSales)}</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
              live
            </span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Average order value</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPkr(data?.kpis.averageOrderValue)}</p>
            <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
              derived
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Product / category sales</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">—</p>
            <span className="mt-2 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
              foundation
            </span>
          </div>
        </div>
        <h3 className="mb-3 text-sm font-semibold">Orders by channel (today)</h3>
        <ReportBarChart data={sourceData} title="Orders by channel" />
        <ReportPieLegend data={sourceData} />
        <h3 className="mb-3 mt-6 text-sm font-semibold">Payment status (recent window)</h3>
        <ReportBarChart
          data={paymentMix.rows.map((r) => ({ label: r.status, value: r.count }))}
          title="Payment status mix"
        />
        <p className="mt-3 text-xs text-[var(--admin-muted)]">{paymentMix.note}</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function OrdersReport({ data }: { data: AdminOperationsDashboard | null }) {
  const statusData = statusChartData(data?.statusCounts);

  return (
    <AdminSurface aria-labelledby="orders-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Order reports" description="Status distribution from live dashboard counts." />
      <AdminSurfaceBody>
        <h2 id="orders-report-heading" className="sr-only">
          Order reports
        </h2>
        <ReportBarChart data={statusData} title="Orders by status" />
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Order status counts</caption>
            <thead className="bg-[var(--admin-soft)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {statusData.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-[var(--admin-muted)]">
                    No status counts in scope.
                  </td>
                </tr>
              ) : (
                statusData.map((row) => (
                  <tr key={row.label} className="border-t border-[var(--admin-border)]">
                    <td className="px-3 py-2 capitalize">{row.label}</td>
                    <td className="px-3 py-2 tabular-nums">{row.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function CustomerReport({ snapshot }: { snapshot: CustomerReportSnapshot }) {
  return (
    <AdminSurface aria-labelledby="customer-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Customer reports" description="Window-limited CRM-derived metrics — not full customer DB." />
      <AdminSurfaceBody>
        <h2 id="customer-report-heading" className="sr-only">
          Customer reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Unique customers</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{snapshot.uniqueCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Repeat customers</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{snapshot.repeatCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Repeat rate</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {snapshot.repeatRatePercent != null ? `${snapshot.repeatRatePercent}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Top channel</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{snapshot.topSource ?? "—"}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">{snapshot.note}</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function KitchenReport({ kitchenWaiting }: { kitchenWaiting: number }) {
  return (
    <AdminSurface aria-labelledby="kitchen-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Kitchen reports" description="Queue depth from dashboard — prep-time analytics pending." />
      <AdminSurfaceBody>
        <h2 id="kitchen-report-heading" className="sr-only">
          Kitchen reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Kitchen queue</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{kitchenWaiting}</p>
            <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
              derived
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Average prep time</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">—</p>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">Kitchen timing report API not in repository.</p>
            <span className="mt-2 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
              foundation
            </span>
          </div>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function DeliveryReport({ activeDeliveries }: { activeDeliveries: number }) {
  return (
    <AdminSurface aria-labelledby="delivery-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Delivery reports" description="Active dispatch count — SLA timing reports pending." />
      <AdminSurfaceBody>
        <h2 id="delivery-report-heading" className="sr-only">
          Delivery reports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Active deliveries</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{activeDeliveries}</p>
            <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
              derived
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Average delivery time</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">—</p>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">Delivery SLA analytics API not in repository.</p>
            <span className="mt-2 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
              foundation
            </span>
          </div>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InventoryReport() {
  return (
    <AdminSurface aria-labelledby="inventory-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Inventory reports" description="Stock valuation and shrinkage require persistent ledger." />
      <AdminSurfaceBody>
        <h2 id="inventory-report-heading" className="sr-only">
          Inventory reports
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Inventory reporting foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No stock ledger — valuation, reorder, and shrinkage reports cannot be generated.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function FinanceReport() {
  return (
    <AdminSurface aria-labelledby="finance-report-heading" className="mb-6">
      <AdminSurfaceHeader title="Finance reports" description="GL and statements required for margin and expense reports." />
      <AdminSurfaceBody>
        <h2 id="finance-report-heading" className="sr-only">
          Finance reports
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Finance reporting foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Finance module is Foundation — P&amp;L, expenses, and margin reports require accounting backend linkage.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
