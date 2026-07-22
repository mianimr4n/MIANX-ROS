import { deliveryStatusLabel } from "@/lib/admin-delivery";
import { formatOrderDateTime, orderStatusLabel } from "@/lib/admin-order-format";
import type { AdminOrderDetail } from "@/lib/admin-api";
import type { DeliveryAssignment } from "@/lib/ops-api";

type TimelineEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string;
};

function buildDeliveryEvents(row: DeliveryAssignment): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: "created", label: "Order created", at: row.createdAt, detail: "Delivery record created" },
  ];
  if (row.assignedAt) {
    events.push({
      id: "assigned",
      label: "Assigned",
      at: row.assignedAt,
      detail: row.riderName ?? undefined,
    });
  }
  if (row.pickedUpAt) {
    events.push({ id: "picked-up", label: "Picked up / out for delivery", at: row.pickedUpAt });
  }
  if (row.deliveredAt) {
    events.push({ id: "delivered", label: "Delivered", at: row.deliveredAt });
  }
  return events;
}

export function DeliveryTimeline({
  assignment,
  orderHistory,
  kitchenReadyAt,
}: {
  assignment: DeliveryAssignment | null;
  orderHistory?: AdminOrderDetail["statusHistory"];
  kitchenReadyAt?: string | null;
}) {
  const deliveryEvents = assignment ? buildDeliveryEvents(assignment) : [];
  const kitchenEvent: TimelineEvent[] = kitchenReadyAt
    ? [{ id: "kitchen-ready", label: "Kitchen ready", at: kitchenReadyAt }]
    : [];
  const orderEvents =
    orderHistory?.map((entry, index) => ({
      id: `order-${entry.createdAt}-${index}`,
      label: entry.fromStatus
        ? `${orderStatusLabel(entry.fromStatus)} → ${orderStatusLabel(entry.toStatus)}`
        : orderStatusLabel(entry.toStatus),
      at: entry.createdAt,
      detail: [entry.actorType, entry.reasonCode].filter(Boolean).join(" · ") || undefined,
    })) ?? [];

  const merged = [...deliveryEvents, ...kitchenEvent, ...orderEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <section aria-labelledby="delivery-timeline-heading">
      <h3 id="delivery-timeline-heading" className="text-base font-semibold">
        Delivery timeline
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        Real delivery timestamps and order history only · newest first
        {assignment ? ` · ${deliveryStatusLabel(assignment.status)}` : ""}
      </p>
      {merged.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">No delivery events recorded.</p>
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
    </section>
  );
}
