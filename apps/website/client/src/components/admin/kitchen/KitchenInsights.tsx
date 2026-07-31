import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { KitchenTicket } from "@/lib/ops-api";
import {
  PREP_TARGET_MINUTES,
  elapsedMinutes,
  ticketTimerStartIso,
} from "@/lib/admin-kitchen";

export type KitchenInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "foundation";
};

/** Deterministic Mianx.ai Kitchen Assistant — verified ticket counts only. */
export function buildKitchenInsights(tickets: KitchenTicket[], nowMs = Date.now()): KitchenInsightItem[] {
  const waiting = tickets.filter((t) => t.status === "queued" || t.status === "accepted").length;
  const preparing = tickets.filter((t) => t.status === "preparing").length;
  const ready = tickets.filter((t) => t.status === "ready").length;
  const delayed = tickets.filter(
    (t) =>
      ["queued", "accepted", "preparing", "ready"].includes(t.status) &&
      elapsedMinutes(ticketTimerStartIso(t), nowMs) >= PREP_TARGET_MINUTES,
  ).length;
  const highPriority = tickets.filter(
    (t) => ["queued", "accepted", "preparing", "ready"].includes(t.status) && t.priority > 0,
  ).length;
  const items: KitchenInsightItem[] = [];

  if (waiting === 0 && preparing === 0 && ready === 0) {
    items.push({
      id: "clear",
      title: "No elevated kitchen signals.",
      detail: "No active tickets in the current branch scope.",
      source: "live",
    });
  } else {
    items.push({
      id: "waiting",
      title: `${waiting} order${waiting === 1 ? "" : "s"} waiting.`,
      detail: "Pending and accepted tickets waiting to start prep.",
      source: "live",
    });
    items.push({
      id: "preparing",
      title:
        preparing === 0
          ? "No tickets currently preparing."
          : `${preparing} ticket${preparing === 1 ? "" : "s"} preparing.`,
      detail: "Status = preparing.",
      source: "live",
    });
    if (delayed > 0) {
      items.push({
        id: "delayed",
        title: `${delayed} delayed ticket${delayed === 1 ? "" : "s"}.`,
        detail: `Elapsed ≥ ${PREP_TARGET_MINUTES} minutes on active tickets.`,
        source: "live",
      });
    } else {
      items.push({
        id: "on-time",
        title: "No delayed tickets.",
        detail: `All active tickets are under the ${PREP_TARGET_MINUTES}-minute display threshold.`,
        source: "live",
      });
    }
    if (highPriority > 0) {
      items.push({
        id: "priority",
        title: `${highPriority} priority ticket${highPriority === 1 ? "" : "s"} in queue.`,
        detail: "Active tickets with priority > 0.",
        source: "live",
      });
    }
  }

  items.push({
    id: "stations",
    title: "Station utilization is Planned for Phase 2.",
    detail: "Ticket-to-station assignment is not available from a verified API yet.",
    source: "foundation",
  });

  return items.slice(0, 5);
}

export function KitchenInsights({ items }: { items: KitchenInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="kitchen-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Kitchen Assistant"
        description="Deterministic business language from live ticket counts — no AI prediction. No prediction models."
      />
      <AdminSurfaceBody>
        <h3 id="kitchen-ai-insights-heading" className="sr-only">
          Mianx.ai Kitchen Assistant
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.source === "live" ? "Rule-based Summary" : "Planned for Phase 2"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
