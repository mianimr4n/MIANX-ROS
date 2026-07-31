import type { KitchenTicket } from "@/lib/ops-api";
import { KitchenCard, type KitchenCardEnrichment } from "@/components/admin/kitchen/KitchenCard";
import { kitchenTicketStatusLabel } from "@/lib/admin-kitchen";

const COLUMNS: Array<{ status: string; title: string }> = [
  { status: "queued", title: "Pending" },
  { status: "accepted", title: "Accepted" },
  { status: "preparing", title: "Preparing" },
  { status: "ready", title: "Ready" },
];

export function KitchenBoard({
  tickets,
  enrichmentByOrderId,
  loading,
  error,
  nowMs,
  busyTicketId,
  canAct,
  selectedTicketId,
  onRetry,
  onView,
  onTransition,
}: {
  tickets: KitchenTicket[];
  enrichmentByOrderId: Record<string, KitchenCardEnrichment>;
  loading: boolean;
  error: string | null;
  nowMs: number;
  busyTicketId: string | null;
  canAct: boolean;
  selectedTicketId: string | null;
  onRetry: () => void;
  onView: (ticket: KitchenTicket) => void;
  onTransition: (ticket: KitchenTicket, toStatus: string) => void;
}) {
  const byStatus: Record<string, KitchenTicket[]> = {};
  for (const col of COLUMNS) byStatus[col.status] = [];
  for (const ticket of tickets) {
    (byStatus[ticket.status] ??= []).push(ticket);
  }

  return (
    <section aria-label="Kitchen order board" className="mb-6">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading kitchen board">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {!loading && tickets.length === 0 && !error ? (
        <div
          className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center"
          role="status"
        >
          <p className="font-semibold text-[var(--admin-ink)]">No active kitchen tickets.</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            New tickets appear here after an order is confirmed for this branch.
          </p>
        </div>
      ) : null}

      {!loading && tickets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="min-w-0">
              <h3 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                <span>{col.title}</span>
                <span className="tabular-nums">{byStatus[col.status]?.length ?? 0}</span>
              </h3>
              <div className="space-y-3">
                {(byStatus[col.status] ?? []).map((ticket) => (
                  <KitchenCard
                    key={ticket.id}
                    ticket={ticket}
                    enrichment={enrichmentByOrderId[ticket.orderId]}
                    nowMs={nowMs}
                    busy={busyTicketId === ticket.id}
                    canAct={canAct}
                    selected={selectedTicketId === ticket.id}
                    onView={() => onView(ticket)}
                    onTransition={(toStatus) => onTransition(ticket, toStatus)}
                  />
                ))}
                {(byStatus[col.status] ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-6 text-center text-xs text-[var(--admin-muted)]">
                    No {kitchenTicketStatusLabel(col.status).toLowerCase()} tickets
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-[var(--admin-muted)]">
        Lifecycle: Pending → Accepted → Preparing → Ready → Completed. Station lanes Planned for Phase 2.
      </p>
    </section>
  );
}
