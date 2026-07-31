import type { KitchenTicket } from "@/lib/ops-api";
import {
  formatKitchenClock,
  formatModifierLines,
  kitchenTicketStatusLabel,
  nextKitchenActions,
  priorityBadgeClass,
  priorityBadgeLabel,
  priorityBadges,
  ticketTimerStartIso,
  timerTone,
  timerToneClass,
  elapsedMinutes,
} from "@/lib/admin-kitchen";
import { cn } from "@/lib/utils";

export type KitchenCardEnrichment = {
  orderNumber?: string;
  contactName?: string | null;
  orderType?: string | null;
  orderSource?: string | null;
  branchLabel?: string | null;
  /** Order-level notes / special instructions when enrichment includes them. */
  specialInstructions?: string | null;
  paymentStatus?: string | null;
};

export function KitchenCard({
  ticket,
  enrichment,
  nowMs,
  busy,
  canAct,
  selected,
  onView,
  onTransition,
}: {
  ticket: KitchenTicket;
  enrichment?: KitchenCardEnrichment;
  nowMs: number;
  busy: boolean;
  canAct: boolean;
  selected: boolean;
  onView: () => void;
  onTransition: (toStatus: string) => void;
}) {
  const startIso = ticketTimerStartIso(ticket);
  const minutes = elapsedMinutes(startIso, nowMs);
  const tone = timerTone(minutes);
  const badges = priorityBadges(ticket.priority, minutes);
  const actions = canAct ? nextKitchenActions(ticket.status) : [];
  const orderLabel =
    enrichment?.orderNumber ??
    (ticket.sequenceNumber != null ? `#${ticket.sequenceNumber}` : ticket.orderId.slice(0, 8));
  const createdClock = formatKitchenClock(ticket.createdAt);
  const acceptedClock = formatKitchenClock(ticket.acceptedAt);
  const startedClock = formatKitchenClock(ticket.startedAt);
  const readyClock = formatKitchenClock(ticket.readyAt);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-[var(--admin-panel)] p-4 shadow-[0_1px_2px_rgba(31,31,31,0.04)]",
        selected ? "border-[var(--brand-red)] ring-2 ring-[var(--brand-red)]/20" : "border-[var(--admin-border)]",
      )}
      aria-label={`Kitchen ticket ${orderLabel}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xl font-semibold tracking-tight">{orderLabel}</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {enrichment?.contactName ? enrichment.contactName : "Customer unavailable"}
            {enrichment?.orderType ? ` · ${enrichment.orderType}` : ""}
            {enrichment?.branchLabel ? ` · ${enrichment.branchLabel}` : ""}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-3 py-1.5 text-base font-semibold tabular-nums",
            timerToneClass(tone),
          )}
          aria-label={`Elapsed ${minutes} minutes, ${tone === "red" ? "delayed" : tone === "yellow" ? "approaching target" : "within target"}`}
        >
          {minutes}m
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityBadgeClass(badge))}
            aria-label={`Priority ${priorityBadgeLabel(badge)}`}
          >
            {priorityBadgeLabel(badge)}
          </span>
        ))}
        <span className="rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs font-semibold capitalize">
          {kitchenTicketStatusLabel(ticket.status)}
        </span>
        <span
          className="rounded-full border border-dashed border-[var(--admin-border)] px-2.5 py-1 text-xs text-[var(--admin-muted)]"
          title="Kitchen stations are not assigned on tickets yet"
        >
          Station · Planned for Phase 2
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--admin-muted)]">
        <div>
          <dt className="inline">Created </dt>
          <dd className="inline tabular-nums text-[var(--admin-ink)]">{createdClock ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline">Accepted </dt>
          <dd className="inline tabular-nums text-[var(--admin-ink)]">{acceptedClock ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline">Started </dt>
          <dd className="inline tabular-nums text-[var(--admin-ink)]">{startedClock ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline">Ready </dt>
          <dd className="inline tabular-nums text-[var(--admin-ink)]">{readyClock ?? "—"}</dd>
        </div>
      </dl>

      {ticket.acceptedByUserId ? (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Assigned staff: accepted by kitchen user
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">Assigned staff: not accepted yet</p>
      )}

      <ul className="mt-4 space-y-2">
        {ticket.items.map((item) => {
          const modifiers = formatModifierLines(item.modifiersSnapshot);
          return (
            <li key={item.id} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2 text-sm">
              <p className="font-semibold">
                {item.quantity}× {item.itemNameSnapshot}
              </p>
              {modifiers.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--admin-muted)]">{modifiers.join(" · ")}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {enrichment?.specialInstructions ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">Special instructions: </span>
          {enrichment.specialInstructions}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onView}
          className="min-h-12 rounded-xl border border-[var(--admin-border)] px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          View details
        </button>
        {actions.map((action) => (
          <button
            key={action.toStatus}
            type="button"
            disabled={busy}
            onClick={() => onTransition(action.toStatus)}
            className="min-h-12 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] disabled:opacity-50"
          >
            {busy ? "Updating…" : action.label}
          </button>
        ))}
      </div>
    </article>
  );
}
