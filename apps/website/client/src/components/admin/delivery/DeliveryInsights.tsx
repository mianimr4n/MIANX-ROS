import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { DeliveryAssignment } from "@/lib/ops-api";

export type DeliveryInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "foundation";
};

export function buildDeliveryInsights(
  assignments: DeliveryAssignment[],
  deliveredToday: number,
): DeliveryInsightItem[] {
  const waiting = assignments.filter((a) => a.status === "pending").length;
  const active = assignments.filter((a) => a.status === "assigned" || a.status === "picked-up").length;
  const items: DeliveryInsightItem[] = [];

  if (waiting >= 3) {
    items.push({
      id: "waiting",
      title: "Several waiting assignments.",
      detail: `Rule-based summary: ${waiting} deliveries pending rider assign.`,
      source: "live",
    });
  }
  if (waiting + active >= 6) {
    items.push({
      id: "queue",
      title: "High delivery queue.",
      detail: `${waiting + active} open deliveries in the loaded window.`,
      source: "live",
    });
  }
  if (deliveredToday >= 5) {
    items.push({
      id: "completed",
      title: "Many completed deliveries today.",
      detail: `${deliveredToday} delivered with Karachi completedAt today.`,
      source: "live",
    });
  }
  if (active >= 4) {
    items.push({
      id: "workload",
      title: "Branch workload increasing.",
      detail: `${active} in-flight deliveries (assigned / picked-up).`,
      source: "live",
    });
  }

  items.push({
    id: "traffic",
    title: "Live traffic and ETA unavailable.",
    detail: "No GPS or traffic model — Foundation until rider location exists.",
    source: "foundation",
  });

  if (items.filter((i) => i.source === "live").length === 0) {
    return [
      {
        id: "calm",
        title: "No elevated delivery signals in the current window.",
        detail: "Mianx.ai surfaces rule-based summaries when queues grow.",
        source: "foundation",
      },
      items.find((i) => i.id === "traffic")!,
    ];
  }

  return items.slice(0, 5);
}

export function DeliveryInsights({ items }: { items: DeliveryInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="delivery-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Delivery Assistant"
        description="Rule-based Summary only. No prediction or live traffic claims."
      />
      <AdminSurfaceBody>
        <h3 id="delivery-ai-insights-heading" className="sr-only">
          Mianx.ai Delivery Assistant
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
