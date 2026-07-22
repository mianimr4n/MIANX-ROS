import type { AdminOperationsDashboard } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-order-format";
import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { CustomerReportSnapshot } from "@/lib/admin-reports";

export function ExecutiveKPIs({
  data,
  customerSnapshot,
  loading,
}: {
  data: AdminOperationsDashboard | null;
  customerSnapshot: CustomerReportSnapshot;
  loading: boolean;
}) {
  if (loading && !data) {
    return (
      <section aria-label="Executive key performance indicators" className="mb-6">
        <AdminSectionTitle eyebrow="Executive" title="KPIs" description="Loading live operational metrics…" />
        <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
          Loading…
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Executive key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Executive"
        title="KPIs"
        description="Classified live, derived, foundation, or unavailable — today scope from operations dashboard."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="Gross sales (today)"
          value={formatPkr(data?.kpis.todayGrossSales)}
          source="LIVE"
          detail="Non-cancelled order totals — not accounting revenue"
        />
        <AdminKpiCard
          title="Orders (today)"
          value={String(data?.kpis.todayOrders ?? 0)}
          source="LIVE"
          detail="Asia/Karachi business day count"
        />
        <AdminKpiCard
          title="Average order value"
          value={formatPkr(data?.kpis.averageOrderValue)}
          source={data?.kpis.averageOrderValue == null ? "UNAVAILABLE" : "DERIVED"}
          unavailable={data?.kpis.averageOrderValue == null}
          detail={
            data?.kpis.averageOrderValue == null ? "Needs non-cancelled orders today" : "Sales ÷ orders today"
          }
        />
        <AdminKpiCard
          title="Unique customers"
          value={String(customerSnapshot.uniqueCustomers)}
          source="DERIVED"
          detail="Distinct contacts in recent-orders window"
        />
        <AdminKpiCard
          title="Repeat rate"
          value={customerSnapshot.repeatRatePercent != null ? `${customerSnapshot.repeatRatePercent}%` : "—"}
          source={customerSnapshot.repeatRatePercent == null ? "UNAVAILABLE" : "DERIVED"}
          unavailable={customerSnapshot.repeatRatePercent == null}
          detail="Window-limited — not loyalty ledger"
        />
        <AdminKpiCard title="Refunds" value="—" source="FOUNDATION" unavailable detail="No refund analytics API" />
        <AdminKpiCard
          title="Kitchen queue"
          value={String(data?.kpis.kitchenWaiting ?? 0)}
          source="DERIVED"
          detail="Confirmed + preparing — not prep-time SLA"
        />
        <AdminKpiCard
          title="Active deliveries"
          value={String(data?.kpis.activeDeliveries ?? 0)}
          source="DERIVED"
          detail="Dispatched orders — not delivery-time average"
        />
        <AdminKpiCard title="Sales growth" value="—" source="FOUNDATION" unavailable detail="No historical comparison API" />
        <AdminKpiCard title="Expenses" value="—" source="FOUNDATION" unavailable detail="Finance module Foundation" />
        <AdminKpiCard title="Profit" value="—" source="UNAVAILABLE" unavailable detail="Requires GL and COGS" />
        <AdminKpiCard title="Inventory value" value="—" source="FOUNDATION" unavailable detail="No stock ledger" />
      </div>
    </section>
  );
}
