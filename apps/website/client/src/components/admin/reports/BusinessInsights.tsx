import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { ReportsInsightItem } from "@/lib/admin-reports";

const SOURCE_CLASS: Record<ReportsInsightItem["source"], string> = {
  live: "bg-emerald-50 text-emerald-800",
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

export function BusinessInsights({ items }: { items: ReportsInsightItem[] }) {
  return (
    <section
      aria-labelledby="business-insights-heading"
      className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5"
    >
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Business Insights"
        description="Rule-based Summary only — server module status and reason strings from the Owner BI workspace."
      />
      <h2 id="business-insights-heading" className="sr-only">
        Business insights
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CLASS[item.source]}`}
              >
                {item.source}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        Missing finance linkage · Inventory reporting unavailable · No prediction models from this workspace.
        Insights reflect server module reasons only — no client KPI formulas from orders.
      </p>
    </section>
  );
}
