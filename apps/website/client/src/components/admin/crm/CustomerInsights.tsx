import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { daysSince, type CrmCustomer } from "@/lib/admin-crm";
import { formatPkr } from "@/lib/admin-order-format";

export type CrmInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "foundation";
};

export function buildCrmInsights(customers: CrmCustomer[]): CrmInsightItem[] {
  const items: CrmInsightItem[] = [];
  const frequent = customers.filter((c) => c.orderCount >= 3).length;
  const inactive = customers.filter((c) => daysSince(c.lastOrderAt) > 30).length;
  const highValue = customers.filter((c) => c.lifetimeSpend >= 5000).length;
  const returned = customers.filter((c) => c.orderCount >= 2 && daysSince(c.lastOrderAt) <= 7).length;

  if (frequent >= 2) {
    items.push({
      id: "frequent",
      title: `${frequent} frequent customers in this window.`,
      detail: "Rule-based Summary: 3+ orders in the loaded order set.",
      source: "live",
    });
  }
  if (inactive >= 2) {
    items.push({
      id: "inactive",
      title: `${inactive} inactive customers (no order in 30+ days).`,
      detail: "Derived from lastOrderAt — not a churn model.",
      source: "live",
    });
  }
  if (highValue >= 1) {
    const top = [...customers].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend)[0];
    items.push({
      id: "high-value",
      title: `High-value customer signal: ${top?.displayName ?? "Guest"} (${formatPkr(top?.lifetimeSpend ?? 0)}).`,
      detail: "Rule-based threshold ≥ Rs 5,000 lifetime in loaded window.",
      source: "live",
    });
  }
  if (returned >= 1) {
    items.push({
      id: "returned",
      title: `${returned} customers recently returned.`,
      detail: "Repeat buyers with a last order in the past 7 days.",
      source: "live",
    });
  }

  items.push({
    id: "loyalty-gap",
    title: "Loyalty and marketing scores unavailable.",
    detail: "No admin loyalty or preference APIs — Foundation until CRM ledger ships.",
    source: "foundation",
  });

  if (items.filter((i) => i.source === "live").length === 0) {
    return [
      {
        id: "calm",
        title: "No elevated CRM signals in the current order window.",
        detail: "Mianx.ai surfaces rule-based summaries as repeat and high-value patterns appear.",
        source: "foundation",
      },
      items.find((i) => i.id === "loyalty-gap")!,
    ];
  }

  return items.slice(0, 5);
}

export function CustomerInsights({ items }: { items: CrmInsightItem[] }) {
  return (
    <AdminSurface aria-labelledby="crm-ai-insights-heading">
      <AdminSurfaceHeader
        title="Mianx.ai Customer Insights"
        description="Rule-based Summary only. No prediction models."
      />
      <AdminSurfaceBody>
        <h3 id="crm-ai-insights-heading" className="sr-only">
          Mianx.ai Customer Insights
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
