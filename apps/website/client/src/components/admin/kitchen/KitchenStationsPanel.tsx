import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { KITCHEN_STATION_CATALOG } from "@/lib/admin-kitchen";

/**
 * Station catalog for Kitchen Completion.
 * Assignment APIs do not exist yet — cards stay Planned for Phase 2 (never fabricated).
 */
export function KitchenStationsPanel() {
  return (
    <section aria-labelledby="kitchen-stations-heading" className="mb-6">
      <AdminSurface aria-labelledby="kitchen-stations-heading">
        <AdminSurfaceHeader
          title="Kitchen stations"
          description="Pizza, Oven, Packing, Drinks, and Desserts — ticket assignment Planned for Phase 2."
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
    </section>
  );
}
