import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type DeliveryKpiSnapshot = {
  waiting: number;
  assigned: number;
  outForDelivery: number;
  deliveredToday: number;
  failed: number;
  late: number;
  onlineRiders: number | null;
  avgDeliveryMinutes: number | null;
};

export function DeliveryKPIs({
  snapshot,
  loading,
  ridersLive,
}: {
  snapshot: DeliveryKpiSnapshot | null;
  loading: boolean;
  ridersLive: boolean;
}) {
  return (
    <section aria-label="Delivery key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Delivery"
        title="Delivery KPIs"
        description="Live counts from delivery assignments in the current branch scope."
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Waiting for rider"
            value={String(snapshot?.waiting ?? 0)}
            source="LIVE"
            detail="Delivery status = pending"
          />
          <AdminKpiCard
            title="Assigned"
            value={String(snapshot?.assigned ?? 0)}
            source="LIVE"
            detail="Delivery status = assigned"
          />
          <AdminKpiCard
            title="Out for delivery"
            value={String(snapshot?.outForDelivery ?? 0)}
            source="LIVE"
            detail="Delivery status = picked-up"
          />
          <AdminKpiCard
            title="Delivered"
            value={String(snapshot?.deliveredToday ?? 0)}
            source="LIVE"
            detail="Delivered today (Karachi, loaded set)"
          />
          <AdminKpiCard
            title="Failed delivery"
            value={String(snapshot?.failed ?? 0)}
            source="LIVE"
            detail="Status = failed in loaded set"
          />
          <AdminKpiCard
            title="Average delivery time"
            value={snapshot?.avgDeliveryMinutes != null ? `${snapshot.avgDeliveryMinutes}m` : "—"}
            source={snapshot?.avgDeliveryMinutes != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.avgDeliveryMinutes == null}
            detail={
              snapshot?.avgDeliveryMinutes != null
                ? "deliveredAt − pickedUpAt/assignedAt"
                : "Needs delivered samples with timestamps"
            }
          />
          <AdminKpiCard
            title="Late deliveries"
            value={String(snapshot?.late ?? 0)}
            source="DERIVED"
            detail="Active elapsed ≥ 45 min (display threshold)"
          />
          <AdminKpiCard
            title="Online riders"
            value={ridersLive ? String(snapshot?.onlineRiders ?? 0) : "—"}
            source={ridersLive ? "LIVE" : "FOUNDATION"}
            unavailable={!ridersLive}
            detail={
              ridersLive
                ? "Roster status available/online/active"
                : "Requires delivery.assign to load roster"
            }
          />
        </div>
      )}
    </section>
  );
}
