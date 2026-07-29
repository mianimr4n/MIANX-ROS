import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type DeliveryKpiSnapshot = {
  waiting: number;
  provisional: number;
  assigned: number;
  outForDelivery: number;
  deliveredToday: number;
  failed: number;
  late: number;
  onlineRiders: number | null;
  avgDeliveryMinutes: number | null;
};

function UnavailableDeliveryKpis({ ridersLive }: { ridersLive: boolean }) {
  const cards = [
    "Waiting for rider",
    "Awaiting confirmation",
    "Assigned",
    "Out for delivery",
    "Delivered",
    "Failed delivery",
    "Average delivery time",
    "Late deliveries",
    "Online riders",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((title) => (
        <AdminKpiCard
          key={title}
          title={title}
          value="—"
          source={title === "Online riders" && !ridersLive ? "FOUNDATION" : "UNAVAILABLE"}
          unavailable
          detail={
            title === "Online riders" && !ridersLive
              ? "Requires delivery.assign to load roster"
              : "Delivery assignment payload unavailable — not shown as zero"
          }
        />
      ))}
    </div>
  );
}

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
        description="Dispatch counts exclude provisional rows for unconfirmed orders. Late uses assigned/picked-up clocks only."
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableDeliveryKpis ridersLive={ridersLive} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Waiting for rider"
            value={String(snapshot.waiting)}
            source="LIVE"
            detail="Confirmed/ready orders with delivery status pending"
          />
          <AdminKpiCard
            title="Awaiting confirmation"
            value={String(snapshot.provisional)}
            source="DERIVED"
            detail="Provisional delivery rows — order still pending"
          />
          <AdminKpiCard
            title="Assigned"
            value={String(snapshot.assigned)}
            source="LIVE"
            detail="Delivery status = assigned"
          />
          <AdminKpiCard
            title="Out for delivery"
            value={String(snapshot.outForDelivery)}
            source="LIVE"
            detail="Delivery status = picked-up"
          />
          <AdminKpiCard
            title="Delivered"
            value={String(snapshot.deliveredToday)}
            source="LIVE"
            detail="Delivered today (Karachi, loaded set)"
          />
          <AdminKpiCard
            title="Failed delivery"
            value={String(snapshot.failed)}
            source="LIVE"
            detail="Status = failed in loaded set"
          />
          <AdminKpiCard
            title="Average delivery time"
            value={snapshot.avgDeliveryMinutes != null ? `${snapshot.avgDeliveryMinutes}m` : "—"}
            source={snapshot.avgDeliveryMinutes != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot.avgDeliveryMinutes == null}
            detail={
              snapshot.avgDeliveryMinutes != null
                ? "deliveredAt − pickedUpAt/assignedAt"
                : "Needs delivered samples with timestamps"
            }
          />
          <AdminKpiCard
            title="Late deliveries"
            value={String(snapshot.late)}
            source="DERIVED"
            detail="Assigned/picked-up only · elapsed ≥ 45 min from assign/pickup"
          />
          <AdminKpiCard
            title="Online riders"
            value={ridersLive ? String(snapshot.onlineRiders ?? 0) : "—"}
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
