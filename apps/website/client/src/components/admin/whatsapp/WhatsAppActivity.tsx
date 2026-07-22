import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { WhatsAppActivityEvent } from "@/lib/admin-whatsapp";
import { formatOrderTime } from "@/lib/admin-order-format";

export function WhatsAppActivity({ events, loading }: { events: WhatsAppActivityEvent[]; loading: boolean }) {
  return (
    <AdminSurface aria-labelledby="whatsapp-activity-heading">
      <AdminSurfaceHeader title="Order activity" description="Live order events — not conversation activity." />
      <AdminSurfaceBody>
        <h3 id="whatsapp-activity-heading" className="sr-only">
          Order activity
        </h3>
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Select an order to view status history.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{event.label}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--brand-red)]">{event.orderNumber}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">{formatOrderTime(event.at)}</p>
                    <p className="mt-1 text-xs">{event.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                    Live order event
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-xs text-[var(--admin-muted)]">
          Conversation activity ledger unavailable — provider message received/sent/failed events are not stored.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
