import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type OrderKpiSnapshot = {
  todayOrders: number;
  pending: number;
  preparing: number;
  ready: number;
  dispatched: number;
  completed: number;
  cancelled: number;
};

function UnavailableOrderKpis() {
  const cards = [
    "Today’s orders",
    "Pending",
    "Preparing",
    "Ready",
    "Out for delivery",
    "Completed",
    "Cancelled",
    "Avg preparation time",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((title) => (
        <AdminKpiCard
          key={title}
          title={title}
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Order KPI payload unavailable — not shown as zero"
        />
      ))}
    </div>
  );
}

export function OrderKPIs({
  snapshot,
  loading,
}: {
  snapshot: OrderKpiSnapshot | null;
  loading: boolean;
}) {
  return (
    <section aria-label="Order key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Operations"
        title="Order KPIs"
        description="Live counts from the operations dashboard API for the selected branch scope."
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableOrderKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Today’s orders"
            value={String(snapshot.todayOrders)}
            source="LIVE"
            detail="Asia/Karachi business day"
          />
          <AdminKpiCard
            title="Pending"
            value={String(snapshot.pending)}
            source="LIVE"
            detail="Status = pending (Received)"
          />
          <AdminKpiCard
            title="Preparing"
            value={String(snapshot.preparing)}
            source="LIVE"
            detail="Status = preparing"
          />
          <AdminKpiCard
            title="Ready"
            value={String(snapshot.ready)}
            source="LIVE"
            detail="Status = ready"
          />
          <AdminKpiCard
            title="Out for delivery"
            value={String(snapshot.dispatched)}
            source="LIVE"
            detail="Status = dispatched"
          />
          <AdminKpiCard
            title="Completed"
            value={String(snapshot.completed)}
            source="LIVE"
            detail="Status = completed"
          />
          <AdminKpiCard
            title="Cancelled"
            value={String(snapshot.cancelled)}
            source="LIVE"
            detail="Status = cancelled"
          />
          <AdminKpiCard
            title="Avg preparation time"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Prep-time analytics not available yet"
          />
        </div>
      )}
    </section>
  );
}
