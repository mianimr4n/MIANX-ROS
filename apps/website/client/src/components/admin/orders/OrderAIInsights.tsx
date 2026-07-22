import type { AdminOrderListItem } from "@/lib/admin-api";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export type OrderInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "foundation";
};

export function buildOrderInsights(orders: AdminOrderListItem[], statusCounts: Record<string, number>): OrderInsightItem[] {
  const pending = statusCounts.pending ?? orders.filter((o) => o.status === "pending").length;
  const preparing = statusCounts.preparing ?? orders.filter((o) => o.status === "preparing").length;
  const cancelled = statusCounts.cancelled ?? orders.filter((o) => o.status === "cancelled").length;
  const ready = statusCounts.ready ?? orders.filter((o) => o.status === "ready").length;

  const items: OrderInsightItem[] = [];

  if (pending >= 3) {
    items.push({
      id: "pending-high",
      title: `High number of pending orders (${pending}).`,
      detail: "Rule-based summary from current status counts.",
      source: "live",
    });
  }
  if (preparing >= 3) {
    items.push({
      id: "kitchen-queue",
      title: `Kitchen queue is elevated (${preparing} preparing).`,
      detail: "Derived from preparing status — not a KDS load model.",
      source: "live",
    });
  }
  if (ready >= 2) {
    items.push({
      id: "ready-wait",
      title: `${ready} ready order${ready === 1 ? "" : "s"} waiting for dispatch.`,
      detail: "Rule-based summary from ready status counts.",
      source: "live",
    });
  }
  if (cancelled >= 2) {
    items.push({
      id: "cancelled",
      title: `Several cancelled orders in scope (${cancelled}).`,
      detail: "Review cancel reasons in order timelines.",
      source: "live",
    });
  }

  const karachiHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "hour")?.value ?? "-1",
  );
  if (karachiHour === 18 || karachiHour === 19) {
    items.push({
      id: "peak-hour",
      title: "Peak hour window (Karachi evening) is active.",
      detail: "Rule-based clock check — not a demand forecast model.",
      source: "live",
    });
  }

  if (items.length === 0) {
    return [
      {
        id: "foundation-calm",
        title: "No elevated order signals in the current KPI window.",
        detail: "Mianx.ai will surface rule-based summaries when queues increase.",
        source: "foundation",
      },
    ];
  }

  return items.slice(0, 4);
}

export function OrderAIInsights({ items }: { items: OrderInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="order-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Order Insights"
        description="Rule-based Summary only. No prediction models."
      />
      <AdminSurfaceBody>
        <h3 id="order-ai-insights-heading" className="sr-only">
          Mianx.ai Order Insights
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.source === "live" ? "Rule-based Summary" : "Foundation"}
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
