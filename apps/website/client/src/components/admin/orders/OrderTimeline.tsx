import type { AdminOrderDetail } from "@/lib/admin-api";
import { formatOrderDateTime, orderStatusLabel } from "@/lib/admin-order-format";

export function OrderTimeline({
  history,
}: {
  history: AdminOrderDetail["statusHistory"];
}) {
  return (
    <section aria-labelledby="order-timeline-heading">
      <h3 id="order-timeline-heading" className="text-base font-semibold">
        Order timeline
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">Real status events only · newest first</p>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">No status history recorded.</p>
      ) : (
        <ol className="mt-4 space-y-3 border-l border-[var(--admin-border)] pl-4">
          {[...history].reverse().map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="relative text-sm">
              <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]" />
              <p className="font-semibold">
                {entry.fromStatus
                  ? `${orderStatusLabel(entry.fromStatus)} → ${orderStatusLabel(entry.toStatus)}`
                  : orderStatusLabel(entry.toStatus)}
              </p>
              <p className="text-[var(--admin-muted)]">
                {formatOrderDateTime(entry.createdAt)} · {entry.actorType}
                {entry.reasonCode ? ` · ${entry.reasonCode}` : ""}
              </p>
              {entry.note ? <p className="mt-1">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
