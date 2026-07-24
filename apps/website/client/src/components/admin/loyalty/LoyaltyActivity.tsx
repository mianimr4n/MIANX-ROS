import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { LoyaltyActivityEvent } from "@/lib/admin-loyalty";
import { formatOrderTime } from "@/lib/admin-order-format";

export function LoyaltyActivity({
  events,
  branchLabelById,
  loading,
}: {
  events: LoyaltyActivityEvent[];
  branchLabelById: Record<string, string>;
  loading: boolean;
}) {
  return (
    <AdminSurface aria-labelledby="loyalty-activity-heading">
      <AdminSurfaceHeader
        title="Program activity"
        description="Order-derived events only — not a loyalty transaction ledger."
      />
      <AdminSurfaceBody>
        <h3 id="loyalty-activity-heading" className="sr-only">
          Program activity
        </h3>
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No order-derived activity in the loaded window.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{event.label}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {event.customerName} ·{" "}
                      <Link href={`/admin/orders/${event.orderId}`} className="font-mono text-[var(--brand-red)]">
                        {event.orderNumber}
                      </Link>{" "}
                      · {formatOrderTime(event.at)} · {branchLabelById[event.branchId] ?? "—"}
                    </p>
                    <p className="mt-1 text-xs">{event.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
                    Derived
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-xs text-[var(--admin-muted)]">
          Loyalty activity ledger unavailable — points issued, rewards redeemed, tier upgrades, and birthday rewards are
          not represented until dedicated loyalty events exist.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
