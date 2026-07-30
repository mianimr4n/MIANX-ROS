import type { KitchenTicket } from "@/lib/ops-api";
import {
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
  /** Customer private notes must not be passed; prep-only fields are not on list enrichment. */
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
            {enrichment?.contactName ? enrichment.contactName : "Customer · not on ticket"}
            {enrichment?.orderType ? ` · ${enrichment.orderType}` : ""}
            {enrichment?.orderSource
              ? ` · ${enrichment.orderSource}`
              : enrichment
                ? " · Unknown Source"
                : ""}
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
