import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type KitchenKpiSnapshot = {
  waiting: number;
  preparing: number;
  ready: number;
  delayed: number;
  completedToday: number;
  priorityOrders: number;
  avgPrepMinutes: number | null;
};

export function KitchenKPIs({
  snapshot,
  loading,
}: {
  snapshot: KitchenKpiSnapshot | null;
  loading: boolean;
}) {
  return (
    <section aria-label="Kitchen key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Kitchen"
        title="Kitchen KPIs"
        description="Live counts from kitchen tickets in the current branch scope."
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
            title="Orders waiting"
            value={String(snapshot?.waiting ?? 0)}
            source="LIVE"
            detail="Queued + accepted tickets"
          />
          <AdminKpiCard
            title="Preparing"
            value={String(snapshot?.preparing ?? 0)}
            source="LIVE"
            detail="Status = preparing"
          />
          <AdminKpiCard
            title="Ready"
            value={String(snapshot?.ready ?? 0)}
            source="LIVE"
            detail="Status = ready"
          />
          <AdminKpiCard
            title="Delayed"
            value={String(snapshot?.delayed ?? 0)}
            source="DERIVED"
            detail="Elapsed ≥ 20 min (display threshold)"
          />
          <AdminKpiCard
            title="Average prep time"
            value={snapshot?.avgPrepMinutes != null ? `${snapshot.avgPrepMinutes}m` : "—"}
            source={snapshot?.avgPrepMinutes != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.avgPrepMinutes == null}
            detail={
              snapshot?.avgPrepMinutes != null
                ? "readyAt − startedAt on finished tickets"
                : "Needs startedAt + readyAt samples"
            }
          />
          <AdminKpiCard
            title="Completed today"
            value={String(snapshot?.completedToday ?? 0)}
            source="LIVE"
            detail="Completed tickets with Karachi completedAt today (loaded set)"
          />
          <AdminKpiCard
            title="Kitchen capacity"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="Station capacity model not available"
          />
          <AdminKpiCard
            title="Priority orders"
            value={String(snapshot?.priorityOrders ?? 0)}
            source="LIVE"
            detail="Active tickets with priority > 0"
          />
        </div>
      )}
    </section>
  );
}
