import { formatOrderDateTime, orderStatusLabel } from "@/lib/admin-order-format";
import type { AdminOrderDetail } from "@/lib/admin-api";
import type { KitchenTicket } from "@/lib/ops-api";

type TimelineEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string;
};

function buildTicketEvents(ticket: KitchenTicket): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: "created", label: "Order received", at: ticket.createdAt, detail: "Ticket created" },
  ];
  if (ticket.acceptedAt) {
    events.push({ id: "accepted", label: "Accepted", at: ticket.acceptedAt });
  }
  if (ticket.startedAt) {
    events.push({ id: "preparing", label: "Preparing", at: ticket.startedAt });
  }
  if (ticket.readyAt) {
    events.push({ id: "ready", label: "Ready", at: ticket.readyAt });
  }
  if (ticket.completedAt) {
    events.push({ id: "completed", label: "Completed", at: ticket.completedAt });
  }
  return events;
}

export function KitchenTimeline({
  ticket,
  orderHistory,
}: {
  ticket: KitchenTicket | null;
  orderHistory?: AdminOrderDetail["statusHistory"];
}) {
  const ticketEvents = ticket ? buildTicketEvents(ticket) : [];
  const orderEvents =
    orderHistory?.map((entry, index) => ({
      id: `order-${entry.createdAt}-${index}`,
      label: entry.fromStatus
        ? `${orderStatusLabel(entry.fromStatus)} → ${orderStatusLabel(entry.toStatus)}`
        : orderStatusLabel(entry.toStatus),
      at: entry.createdAt,
      detail: [entry.actorType, entry.reasonCode, entry.note].filter(Boolean).join(" · ") || undefined,
    })) ?? [];

  const merged = [...ticketEvents, ...orderEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <section aria-labelledby="kitchen-timeline-heading">
      <h3 id="kitchen-timeline-heading" className="text-base font-semibold">
        Kitchen timeline
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        Ticket timestamps and order status history only · newest first
      </p>
      {merged.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">No kitchen events recorded.</p>
      ) : (
        <ol className="mt-4 space-y-3 border-l border-[var(--admin-border)] pl-4">
          {merged.map((event) => (
            <li key={event.id} className="relative text-sm">
              <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]" />
              <p className="font-semibold">{event.label}</p>
              <p className="text-[var(--admin-muted)]">
                {formatOrderDateTime(event.at)}
                {event.detail ? ` · ${event.detail}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        Packed / handed to delivery events appear when those timestamps exist on the order or delivery record —
        not invented here.
      </p>
    </section>
  );
}
