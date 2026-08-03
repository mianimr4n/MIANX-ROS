import { AdminDataState } from "@/components/admin/AdminDataState";
import { formatOrderTime, formatPkr } from "@/lib/admin-order-format";
import {
  areaFromAddress,
  deliveryStatusBadgeClass,
  deliveryStatusLabel,
} from "@/lib/admin-delivery";
import { canAssignRider, isProvisionalDelivery } from "@/lib/operational-truth";
import type { DeliveryAssignment } from "@/lib/ops-api";
import type { RiderRosterItem } from "@/lib/ops-api";
import { cn } from "@/lib/utils";

export type DispatchEnrichment = {
  totalAmount?: number;
  paymentStatus?: string;
};

export function DispatchQueue({
  rows,
  enrichmentByOrderId,
  loading,
  error,
  riders,
  canAssign,
  selectedRiderByDelivery,
  busyId,
  onSelectRider,
  onAssign,
  onView,
  onRetry,
}: {
  rows: DeliveryAssignment[];
  enrichmentByOrderId: Record<string, DispatchEnrichment>;
  loading: boolean;
  error: string | null;
  riders: RiderRosterItem[];
  canAssign: boolean;
  selectedRiderByDelivery: Record<string, string>;
  busyId: string | null;
  onSelectRider: (deliveryId: string, riderId: string) => void;
  onAssign: (deliveryId: string) => void;
  onView: (row: DeliveryAssignment) => void;
  onRetry: () => void;
}) {
  return (
    <section aria-label="Dispatch queue" className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Dispatch queue</h3>
          <p className="text-sm text-[var(--admin-muted)]">
            Orders ready for rider assignment — excludes unconfirmed provisional rows.
          </p>
        </div>
        <span className="rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs font-semibold tabular-nums">
          {rows.length}
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading dispatch queue">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <AdminDataState
          state="NO_ACTIVITY_YET"
          title="No deliveries waiting"
          description="No deliveries waiting for a rider."
          compact
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]">
          <table className="min-w-[64rem] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">Order #</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Area</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Created</th>
                <th className="px-3 py-3 font-medium">Priority</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Assign rider</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const enrichment = enrichmentByOrderId[row.orderId];
                const assignAllowed =
                  canAssign &&
                  canAssignRider({ deliveryStatus: row.status, orderStatus: row.orderStatus });
                const statusText = isProvisionalDelivery({
                  deliveryStatus: row.status,
                  orderStatus: row.orderStatus,
                })
                  ? "Delivery record created — order awaiting confirmation"
                  : deliveryStatusLabel(row.status);
                return (
                  <tr key={row.id} className="border-b border-[var(--admin-border)]/70 hover:bg-[var(--admin-soft)]/60">
                    <td className="px-3 py-3 font-mono font-semibold">{row.orderNumber}</td>
                    <td className="px-3 py-3">
                      <div>{row.contactName || "—"}</div>
                      <div className="text-xs text-[var(--admin-muted)]">{row.contactPhone}</div>
                    </td>
                    <td className="px-3 py-3">{areaFromAddress(row.deliveryAddress)}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {enrichment?.totalAmount != null ? formatPkr(enrichment.totalAmount) : "—"}
                    </td>
                    <td className="px-3 py-3 text-[var(--admin-muted)]">{formatOrderTime(row.createdAt)}</td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-full border border-dashed border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]"
                        title="Priority is not on delivery assignments"
                      >
                        Foundation
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          deliveryStatusBadgeClass(row.status),
                        )}
                        aria-label={`Status ${statusText}`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {assignAllowed ? (
                        <div className="flex min-w-[12rem] flex-col gap-2">
                          <select
                            className="min-h-10 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-sm"
                            aria-label={`Select rider for ${row.orderNumber}`}
                            value={selectedRiderByDelivery[row.id] ?? ""}
                            disabled={busyId === row.id}
                            onChange={(event) => onSelectRider(row.id, event.target.value)}
                          >
                            <option value="">Select rider</option>
                            {riders.map((rider) => (
                              <option key={rider.id} value={rider.id}>
                                {rider.fullName} ({rider.status})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => onAssign(row.id)}
                            className="min-h-10 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {busyId === row.id ? "Assigning…" : "Assign"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--admin-muted)]">
                          {!canAssign
                            ? "Needs delivery.assign"
                            : "Unavailable until order is ready for dispatch"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                        onClick={() => onView(row)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
