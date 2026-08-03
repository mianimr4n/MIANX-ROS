import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { KITCHEN_STATION_CATALOG } from "@/lib/admin-kitchen";

/**
 * Station catalog for Kitchen Completion.
 * Assignment APIs do not exist yet — collapsed so it does not clutter the primary filter bar.
 */
export function KitchenStationsPanel() {
  return (
    <details
      className="mb-6 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3"
      data-testid="kitchen-stations-deferred"
    >
      <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]">
        Kitchen stations — assignment Planned for Phase 2
      </summary>
      <div className="mt-3">
        <AdminSurface aria-labelledby="kitchen-stations-heading">
          <AdminSurfaceHeader
            title="Kitchen stations"
            description="Pizza, Oven, Packing, Drinks, and Desserts — ticket assignment not available yet."
          />
          <AdminSurfaceBody>
            <h2 id="kitchen-stations-heading" className="sr-only">
              Kitchen stations
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {KITCHEN_STATION_CATALOG.map((station) => (
                <li
                  key={station.id}
                  className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3"
                >
                  <p className="font-semibold text-[var(--admin-ink)]">{station.label}</p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Assignment unavailable — Planned for Phase 2
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--admin-muted)]" role="status">
              Tickets are not routed to stations until a verified stations API is available. No fake assignment.
            </p>
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </details>
  );
}
