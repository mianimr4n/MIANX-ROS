import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { KitchenKpiSnapshot } from "@/components/admin/kitchen/KitchenKPIs";

export function KitchenPerformance({ snapshot }: { snapshot: KitchenKpiSnapshot | null }) {
  return (
    <section aria-label="Kitchen performance" className="mb-6">
      <AdminSectionTitle
        eyebrow="Performance"
        title="Kitchen performance"
        description="Supported metrics only — no invented capacity or station load."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard
          title="Average preparation time"
          value={snapshot?.avgPrepMinutes != null ? `${snapshot.avgPrepMinutes}m` : "—"}
          source={snapshot?.avgPrepMinutes != null ? "DERIVED" : "UNAVAILABLE"}
          unavailable={snapshot?.avgPrepMinutes == null}
          detail="From ticket startedAt → readyAt"
        />
        <AdminKpiCard
          title="Completed orders"
          value={String(snapshot?.completedToday ?? 0)}
          source="LIVE"
          detail="Completed today in loaded tickets"
        />
        <AdminKpiCard
          title="Delayed orders"
          value={String(snapshot?.delayed ?? 0)}
          source="DERIVED"
          detail="Active tickets past 20-minute display threshold"
        />
        <AdminKpiCard
          title="Current capacity"
          value="—"
          source="FOUNDATION"
          unavailable
          detail="Capacity model not available"
        />
        <AdminKpiCard
          title="Busy stations"
          value="—"
          source="FOUNDATION"
          unavailable
          detail="Station assignment not on tickets"
        />
      </div>
    </section>
  );
}
