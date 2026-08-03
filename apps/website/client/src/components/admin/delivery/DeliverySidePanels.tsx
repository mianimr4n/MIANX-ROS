import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { DeliveryKpiSnapshot } from "@/components/admin/delivery/DeliveryKPIs";
import type { RiderRosterItem } from "@/lib/ops-api";
import type { DeliveryAssignment } from "@/lib/ops-api";

export function DeliveryPerformance({ snapshot }: { snapshot: DeliveryKpiSnapshot | null }) {
  return (
    <section aria-label="Delivery performance" className="mb-6">
      <AdminSectionTitle
        eyebrow="Performance"
        title="Delivery performance"
        description="Supported metrics only — no invented capacity or GPS ETA."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard
          title="Completed"
          value={String(snapshot?.deliveredToday ?? 0)}
          source="LIVE"
          detail="Delivered today in loaded set"
        />
        <AdminKpiCard
          title="Failed"
          value={String(snapshot?.failed ?? 0)}
          source="LIVE"
          detail="Failed status in loaded set"
        />
        <AdminKpiCard
          title="Average time"
          value={snapshot?.avgDeliveryMinutes != null ? `${snapshot.avgDeliveryMinutes}m` : "—"}
          source={snapshot?.avgDeliveryMinutes != null ? "DERIVED" : "UNAVAILABLE"}
          unavailable={snapshot?.avgDeliveryMinutes == null}
          detail="From delivery timestamps"
        />
        <AdminKpiCard
          title="Late"
          value={String(snapshot?.late ?? 0)}
          source="DERIVED"
          detail="Assigned/picked-up only · ≥ 45 min from assign/pickup — provisional excluded"
        />
        <AdminKpiCard
          title="Capacity"
          value="—"
          source="FOUNDATION"
          unavailable
          detail="Rider capacity model not available"
        />
      </div>
    </section>
  );
}

export function DeliveryMapFoundation() {
  return (
    <details
      className="mb-6 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3"
      data-testid="delivery-map-deferred"
    >
      <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]">
        Map &amp; GPS tracking — not available
      </summary>
      <p className="mt-2 text-sm text-[var(--admin-muted)]">
        No live map, fake pins, capacity heatmaps, or traffic-based ETA. Rider location feeds remain deferred.
      </p>
    </details>
  );
}

export function DeliveryRiderPanel({
  riders,
  assignments,
  live,
}: {
  riders: RiderRosterItem[];
  assignments: DeliveryAssignment[];
  live: boolean;
}) {
  const loadByRider = new Map<string, number>();
  for (const row of assignments) {
    if (!row.riderId) continue;
    if (row.status !== "assigned" && row.status !== "picked-up") continue;
    loadByRider.set(row.riderId, (loadByRider.get(row.riderId) ?? 0) + 1);
  }

  return (
    <AdminSurface aria-labelledby="rider-panel-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Rider management"
        description={
          live
            ? "Live roster from /riders/roster (delivery.assign)."
            : "Foundation without roster permission — assignment list only."
        }
      />
      <AdminSurfaceBody>
        <h3 id="rider-panel-heading" className="sr-only">
          Rider management
        </h3>
        {!live ? (
          <p className="text-sm text-[var(--admin-muted)]">
            Rider roster requires `delivery.assign`. Online rider KPI stays Foundation for this session.
          </p>
        ) : riders.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No active riders returned for this branch scope.</p>
        ) : (
          <ul className="space-y-2">
            {riders.map((rider) => (
              <li
                key={rider.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">{rider.fullName}</p>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {rider.vehicleType} · {rider.phone}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold capitalize">{rider.status}</p>
                  <p className="text-[var(--admin-muted)]">
                    {loadByRider.get(rider.id) ?? 0} active · branch {rider.branchId.slice(0, 8)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
