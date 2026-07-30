import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { FinanceInsightItem } from "@/lib/admin-finance";

const SOURCE_CLASS: Record<FinanceInsightItem["source"], string> = {
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  live: "bg-emerald-50 text-emerald-900",
};

export function FinanceInsights({ items }: { items: FinanceInsightItem[] }) {
  return (
    <section aria-labelledby="finance-insights-heading" className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5">
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Finance Insights"
        description="Rule-based Summary only — live GL signals and honest Planned for Phase 2 gaps."
      />
      <h2 id="finance-insights-heading" className="sr-only">
        Finance insights
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
        Live GL · Planned for Phase 2: AP auto-post, AR aging, cash flow, VAT/GST returns — no prediction models from this
        workspace.
      </p>
    </section>
  );
}
