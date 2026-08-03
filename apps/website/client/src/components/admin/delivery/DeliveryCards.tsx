import { AdminDataState } from "@/components/admin/AdminDataState";
import {
  deliveryStatusBadgeClass,
  deliveryStatusLabel,
  deliveryTimerStartIso,
  elapsedMinutes,
  timerTone,
  timerToneClass,
} from "@/lib/admin-delivery";
import { formatPkr } from "@/lib/admin-order-format";
import type { DeliveryAssignment } from "@/lib/ops-api";
import { cn } from "@/lib/utils";
import type { DispatchEnrichment } from "@/components/admin/delivery/DispatchQueue";

export function DeliveryCards({
  rows,
  enrichmentByOrderId,
  branchLabelById,
  nowMs,
  busyId,
  canUpdate,
  canAssign,
  onView,
  onPickedUp,
  onDelivered,
}: {
  rows: DeliveryAssignment[];
  enrichmentByOrderId: Record<string, DispatchEnrichment>;
  branchLabelById: Record<string, string>;
  nowMs: number;
  busyId: string | null;
  canUpdate: boolean;
  canAssign: boolean;
  onView: (row: DeliveryAssignment) => void;
  onPickedUp: (deliveryId: string) => void;
  onDelivered: (deliveryId: string) => void;
}) {
  return (
    <section aria-label="Active deliveries" className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Active deliveries</h3>
          <p className="text-sm text-[var(--admin-muted)]">Assigned and out-for-delivery tickets.</p>
        </div>
        <span className="rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs font-semibold tabular-nums">
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <AdminDataState
          state="NO_ACTIVITY_YET"
          title="No active deliveries"
          description="No active in-flight deliveries."
          compact
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const startIso = deliveryTimerStartIso(row);
            const minutes = startIso ? elapsedMinutes(startIso, nowMs) : null;
            const tone = minutes == null ? "green" : timerTone(minutes);
            const enrichment = enrichmentByOrderId[row.orderId];
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 shadow-[0_1px_2px_rgba(31,31,31,0.04)]"
                aria-label={`Delivery ${row.orderNumber}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xl font-semibold">{row.orderNumber}</p>
                    <p className="mt-1 text-sm text-[var(--admin-muted)]">
                      {row.contactName || "—"}
                      {enrichment?.paymentStatus ? ` · ${enrichment.paymentStatus}` : ""}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-base font-semibold tabular-nums",
                      timerToneClass(tone),
                    )}
                    aria-label={
                      minutes == null
                        ? "Elapsed time not applicable until rider assignment"
                        : `Elapsed ${minutes} minutes`
                    }
                  >
                    {minutes == null ? "—" : `${minutes}m`}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      deliveryStatusBadgeClass(row.status),
                    )}
                  >
                    {deliveryStatusLabel(row.status)}
                  </span>
                  <span className="rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs">
                    {row.riderName ?? "Unassigned"}
                  </span>
                  <span className="rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs">
                    {branchLabelById[row.branchId] ?? row.branchId.slice(0, 8)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-[var(--admin-muted)]">{row.deliveryAddress}</p>
                {enrichment?.totalAmount != null ? (
                  <p className="mt-2 text-sm font-semibold tabular-nums">{formatPkr(enrichment.totalAmount)}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onView(row)}
                    className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                  >
                    View
                  </button>
                  {canUpdate && row.status === "assigned" ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onPickedUp(row.id)}
                      className="min-h-11 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {busyId === row.id ? "Updating…" : "Mark picked up"}
                    </button>
                  ) : null}
                  {canUpdate && row.status === "picked-up" ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onDelivered(row.id)}
                      className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === row.id ? "Updating…" : "Mark delivered"}
                    </button>
                  ) : null}
                  {!canAssign && !canUpdate ? (
                    <span className="text-xs text-[var(--admin-muted)]">Read-only for this principal</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
