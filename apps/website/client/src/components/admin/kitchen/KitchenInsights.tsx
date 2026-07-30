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

export function buildKitchenInsights(tickets: KitchenTicket[], nowMs = Date.now()): KitchenInsightItem[] {
  const waiting = tickets.filter((t) => t.status === "queued" || t.status === "accepted").length;
  const preparing = tickets.filter((t) => t.status === "preparing").length;
  const delayed = tickets.filter(
    (t) => elapsedMinutes(ticketTimerStartIso(t), nowMs) >= PREP_TARGET_MINUTES,
  ).length;
  const highPriority = tickets.filter((t) => t.priority > 0).length;
  const items: KitchenInsightItem[] = [];

  if (waiting + preparing >= 6) {
    items.push({
      id: "workload",
      title: "Kitchen workload increasing.",
      detail: `Rule-based summary: ${waiting + preparing} active prep tickets.`,
      source: "live",
    });
  }
  if (waiting >= 4) {
    items.push({
      id: "queue",
      title: "Large queue detected.",
      detail: `${waiting} tickets waiting (queued/accepted).`,
      source: "live",
    });
  }
  if (delayed >= 2) {
    items.push({
      id: "prep-times",
      title: "Preparation times increasing.",
      detail: `${delayed} tickets past the 20-minute display threshold.`,
      source: "live",
    });
  }
  if (highPriority >= 2) {
    items.push({
      id: "urgent",
      title: "Several priority tickets waiting.",
      detail: `${highPriority} active tickets with priority > 0.`,
      source: "live",
    });
  }

  items.push({
    id: "packing-idle",
    title: "Packing station idle status unavailable.",
    detail: "Station telemetry is Foundation — not measured yet.",
    source: "foundation",
  });

  if (items.filter((i) => i.source === "live").length === 0) {
    return [
      {
        id: "calm",
        title: "No elevated kitchen signals in the current ticket window.",
        detail: "Mianx.ai surfaces rule-based summaries when queues grow.",
        source: "foundation",
      },
      items.find((i) => i.id === "packing-idle")!,
    ];
  }

  return items.slice(0, 5);
}

export function KitchenInsights({ items }: { items: KitchenInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="kitchen-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Kitchen Assistant"
        description="Rule-based Summary only. No prediction models."
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
