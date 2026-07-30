import type { AdminOperationsDashboard } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-order-format";
import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { CustomerReportSnapshot } from "@/lib/admin-reports";

function UnavailableExecutiveKpis() {
  const cards = [
    "Gross sales (today)",
    "Orders (today)",
    "Average order value",
    "Unique customers",
    "Repeat rate",
    "Refunds",
    "Kitchen queue",
    "Active deliveries",
    "Sales growth",
    "Expenses",
    "Profit",
    "Inventory value",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((title) => (
        <AdminKpiCard
          key={title}
          title={title}
          value="—"
          source={
            title === "Refunds" ||
            title === "Sales growth" ||
            title === "Expenses" ||
            title === "Inventory value"
              ? "FOUNDATION"
              : title === "Profit"
                ? "UNAVAILABLE"
                : "UNAVAILABLE"
          }
          unavailable
          detail={
            title === "Refunds"
              ? "No refund analytics API"
              : title === "Sales growth"
                ? "No historical comparison API"
                : title === "Expenses"
                  ? "Finance module Foundation"
                  : title === "Profit"
                    ? "Requires GL and COGS"
                    : title === "Inventory value"
                      ? "No stock ledger"
                      : "Operations dashboard payload unavailable — not shown as zero"
          }
        />
      ))}
    </div>
  );
}

export function ExecutiveKPIs({
  data,
  customerSnapshot,
  loading,
}: {
  data: AdminOperationsDashboard | null;
  customerSnapshot: CustomerReportSnapshot | null;
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
      {!data || !customerSnapshot ? (
        <UnavailableExecutiveKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Gross sales (today)"
            value={formatPkr(data.kpis.todayGrossSales)}
            source="LIVE"
            detail="Non-cancelled order totals — not accounting revenue"
          />
          <AdminKpiCard
            title="Orders (today)"
            value={String(data.kpis.todayOrders)}
            source="LIVE"
            detail="Asia/Karachi business day count"
          />
          <AdminKpiCard
            title="Average order value"
            value={formatPkr(data.kpis.averageOrderValue)}
            source={data.kpis.averageOrderValue == null ? "UNAVAILABLE" : "DERIVED"}
            unavailable={data.kpis.averageOrderValue == null}
            detail={
              data.kpis.averageOrderValue == null ? "Needs non-cancelled orders today" : "Sales ÷ orders today"
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
          <AdminKpiCard title="Refunds" value="—" source="FOUNDATION" unavailable detail="Planned for Phase 2 — no refund analytics API" />
          <AdminKpiCard
            title="Kitchen queue"
            value={String(data.kpis.kitchenWaiting)}
            source="DERIVED"
            detail="Confirmed + preparing — not prep-time SLA"
          />
          <AdminKpiCard
            title="Active deliveries"
            value={String(data.kpis.activeDeliveries)}
            source="DERIVED"
            detail="Dispatched orders — not delivery-time average"
          />
          <AdminKpiCard title="Sales growth" value="—" source="FOUNDATION" unavailable detail="Planned for Phase 2 — no historical comparison API" />
          <AdminKpiCard title="Expenses" value="—" source="FOUNDATION" unavailable detail="See Finance P&L for posted expenses" />
          <AdminKpiCard title="Profit" value="—" source="UNAVAILABLE" unavailable detail="See Finance P&L — COGS auto-post Planned for Phase 2" />
          <AdminKpiCard title="Inventory value" value="—" source="FOUNDATION" unavailable detail="See Inventory for derived cost×qty valuation" />
        </div>
      )}
    </section>
  );
}
