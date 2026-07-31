import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { KitchenKpiSnapshot } from "@/components/admin/kitchen/KitchenKPIs";

export function KitchenPerformance({
  snapshot,
  available,
}: {
  snapshot: KitchenKpiSnapshot | null;
  /** False when ticket payload failed — never invent zeros. */
  available: boolean;
}) {
  const currentQueue =
    snapshot == null
      ? null
      : snapshot.waiting + snapshot.preparing + snapshot.ready;

  return (
    <section aria-label="Kitchen performance" className="mb-6">
      <AdminSectionTitle
        eyebrow="Performance"
        title="Kitchen performance"
        description="Verified ticket metrics only — station utilization stays Planned for Phase 2."
      />
      {!available ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(
            [
              "Completed orders",
              "Average prep time",
              "Delayed orders",
              "Current queue",
              "Station utilization",
            ] as const
          ).map((title) => (
            <AdminKpiCard
              key={title}
              title={title}
              value="—"
              source="UNAVAILABLE"
              unavailable
              detail="Kitchen ticket payload unavailable — not shown as zero"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminKpiCard
            title="Completed orders"
            value={String(snapshot?.completedToday ?? 0)}
            source="LIVE"
            detail="Completed today in loaded tickets (Asia/Karachi)"
            showResolvedZero
          />
          <AdminKpiCard
            title="Average prep time"
            value={snapshot?.avgPrepMinutes != null ? `${snapshot.avgPrepMinutes}m` : "—"}
            source={snapshot?.avgPrepMinutes != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.avgPrepMinutes == null}
            detail="From ticket startedAt → readyAt"
          />
          <AdminKpiCard
            title="Delayed orders"
            value={String(snapshot?.delayed ?? 0)}
            source="DERIVED"
            detail="Active tickets past 20-minute display threshold"
            showResolvedZero
          />
          <AdminKpiCard
            title="Current queue"
            value={currentQueue == null ? "—" : String(currentQueue)}
            source="LIVE"
            detail="Pending + accepted + preparing + ready"
            showResolvedZero
          />
          <AdminKpiCard
            title="Station utilization"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="Planned for Phase 2 — no station assignment API"
          />
        </div>
      )}
    </section>
  );
}
